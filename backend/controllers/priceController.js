const { pool } = require('../config/database');
const axios = require('axios');
const imageRecognitionService = require('../services/imageRecognitionService');
const { logApiCall } = require('../utils/apiLogger');

// Analyze image and get price predictions (Third-party API integration)
exports.analyzePrices = async (req, res, next) => {
  try {
    const { itemId, keywords } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Verify item exists and user has access
    const [items] = await pool.query('SELECT * FROM items WHERE item_id = ?', [itemId]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let searchKeywords = keywords;
    let googleLensResults = null;
    let useImageFirst = true;

    // PRIORITY 1: Always try Google Lens if image exists
    if (item.image_url) {
      console.log(`🔍 PRIORITY 1: Analyzing image with Google Lens for item ${itemId}...`);
      try {
        const recognition = await imageRecognitionService.analyzeImageWithGoogleLens(
          item.image_url,
          item.item_name,
          item.category
        );

        // Use image-based keywords (from Google Lens) as PRIMARY
        searchKeywords = recognition.keywords;
        googleLensResults = {
          title: recognition.title,
          source: recognition.source,
          labels: recognition.labels,
          confidence: recognition.confidence,
          visualMatches: recognition.visualMatches || []
        };

        console.log(`✅ Google Lens identified: ${recognition.title}`);
        console.log(`📝 Generated keywords from IMAGE: ${searchKeywords}`);
        console.log(`🎯 Visual matches found: ${recognition.visualMatches?.length || 0}`);

        // If user provided custom keywords, note them but prioritize image
        if (keywords && keywords.trim() !== '') {
          console.log(`ℹ️  User keywords ignored in favor of image analysis: ${keywords}`);
        }
      } catch (err) {
        console.error('❌ Google Lens analysis error:', err.message);
        // Fallback to user keywords or item name
        searchKeywords = keywords || item.item_name;
        useImageFirst = false;
      }
    } else {
      // No image available - use keywords or item name
      console.log(`⚠️  No image available, using keywords/item name`);
      searchKeywords = keywords || item.item_name;
      useImageFirst = false;
    }

    if (!searchKeywords) {
      return res.status(400).json({ error: 'Keywords or item name is required for price analysis' });
    }

    const priceData = [];

    // PRIORITY 1: Add visual matches FIRST if available
    if (googleLensResults && googleLensResults.visualMatches && googleLensResults.visualMatches.length > 0) {
      console.log(`🎯 PRIORITY 1: Adding ${googleLensResults.visualMatches.length} visual matches...`);

      const visualMatchListings = googleLensResults.visualMatches
        .filter(match => match.url && match.title)
        .slice(0, 15) // Show more visual matches
        .map(match => ({
          title: match.title || 'Similar Item Found',
          price: 0, // Will be estimated based on other listings
          url: match.url,
          isVisualMatch: true,
          matchScore: match.score
        }));

      if (visualMatchListings.length > 0) {
        // Add visual matches FIRST (highest priority)
        priceData.push({
          name: '🎯 Visual Matches from Image Analysis',
          listings: visualMatchListings,
          isVisualMatch: true,
          priority: 1
        });
        console.log(`✅ Added ${visualMatchListings.length} visual matches as PRIORITY results`);
      }
    }

    // PRIORITY 2: Fetch keyword-based marketplace listings SECOND
    console.log(`📦 PRIORITY 2: Fetching keyword-based marketplace listings...`);
    const keywordBasedListings = await fetchMarketplacePrices(searchKeywords);

    // Mark keyword listings as lower priority
    keywordBasedListings.forEach(marketplace => {
      marketplace.priority = 2;
    });

    priceData.push(...keywordBasedListings);

    // Calculate average price (exclude visual matches with price 0)
    const prices = priceData
      .filter(marketplace => !marketplace.isVisualMatch)
      .flatMap(marketplace => marketplace.listings.map(listing => listing.price));

    const avgPrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0;

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Save prediction
    const [prediction] = await pool.query(
      'INSERT INTO predictions (item_id, predicted_price, currency, api_used) VALUES (?, ?, ?, ?)',
      [itemId, avgPrice, 'USD', 'Multiple APIs']
    );

    // Save price comparisons for each marketplace (skip visual matches for now in DB)
    for (const marketplace of priceData) {
      if (marketplace.isVisualMatch) continue; // Skip saving visual matches to database

      for (const listing of marketplace.listings) {
        try {
          // Try with listing_title column first
          await pool.query(
            'INSERT INTO price_comparisons (item_id, platform_name, platform_price, platform_url, listing_title) VALUES (?, ?, ?, ?, ?)',
            [itemId, marketplace.name, listing.price, listing.url, listing.title]
          );
        } catch (err) {
          // Fallback: insert without listing_title if column doesn't exist
          if (err.code === 'ER_BAD_FIELD_ERROR') {
            await pool.query(
              'INSERT INTO price_comparisons (item_id, platform_name, platform_price, platform_url) VALUES (?, ?, ?, ?)',
              [itemId, marketplace.name, listing.price, listing.url]
            );
          } else {
            throw err;
          }
        }
      }
    }

    res.json({
      message: 'Price analysis completed',
      predictionId: prediction.insertId,
      analysis: {
        averagePrice: avgPrice.toFixed(2),
        minPrice: minPrice.toFixed(2),
        maxPrice: maxPrice.toFixed(2),
        priceRange: `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`,
        totalListings: prices.length,
        marketplaces: priceData, // Visual matches will be first in array
        searchKeywords: searchKeywords,
        googleLensResults: googleLensResults,
        imageAnalysisUsed: useImageFirst,
        visualMatchesCount: googleLensResults?.visualMatches?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get price history for an item
exports.getPriceHistory = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // Verify item exists and user has access
    const [items] = await pool.query('SELECT * FROM items WHERE item_id = ?', [itemId]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get predictions and price comparisons
    const [predictions] = await pool.query(
      'SELECT * FROM predictions WHERE item_id = ? ORDER BY prediction_date DESC',
      [itemId]
    );

    const [comparisons] = await pool.query(
      'SELECT * FROM price_comparisons WHERE item_id = ? ORDER BY last_checked DESC',
      [itemId]
    );

    // Group comparisons by platform
    const groupedByPlatform = comparisons.reduce((acc, comp) => {
      if (!acc[comp.platform_name]) {
        acc[comp.platform_name] = [];
      }
      acc[comp.platform_name].push(comp);
      return acc;
    }, {});

    res.json({
      itemId,
      itemName: item.item_name,
      predictions,
      priceHistory: comparisons.map(comp => ({
        id: comp.comparison_id,
        marketplace: comp.platform_name,
        listing_title: comp.listing_title || comp.platform_name + ' Listing',
        price: comp.platform_price,
        listing_url: comp.platform_url,
        created_at: comp.last_checked
      })),
      totalListings: comparisons.length,
      byPlatform: groupedByPlatform
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to fetch prices from marketplaces
async function fetchMarketplacePrices(keywords) {
  const marketplaces = [];

  try {
    // eBay API simulation (replace with actual API calls)
    const ebayData = await fetchEbayPrices(keywords);
    marketplaces.push({
      name: 'eBay',
      listings: ebayData
    });
  } catch (error) {
    console.error('eBay API error:', error.message);
  }

  try {
    // Etsy API simulation
    const etsyData = await fetchEtsyPrices(keywords);
    marketplaces.push({
      name: 'Etsy',
      listings: etsyData
    });
  } catch (error) {
    console.error('Etsy API error:', error.message);
  }

  try {
    // Amazon
    const amazonData = await fetchAmazonPrices(keywords);
    marketplaces.push({
      name: 'Amazon',
      listings: amazonData
    });
  } catch (error) {
    console.error('Amazon API error:', error.message);
  }

  return marketplaces;
}

// eBay API call using actual credentials
async function fetchEbayPrices(keywords) {
  const ebaySearchUrl = 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search';

  try {
    // First, get OAuth token
    const authResponse = await axios.post(
      'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
      'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64')}`
        }
      }
    );

    const accessToken = authResponse.data.access_token;

    // Search for items using Browse API
    const searchResponse = await axios.get(ebaySearchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      },
      params: {
        q: keywords,
        limit: 10
      }
    });

    // Log successful API call
    await logApiCall('eBay API', `${ebaySearchUrl}?q=${keywords}`, searchResponse.status.toString());

    // Parse and return results
    if (searchResponse.data.itemSummaries && searchResponse.data.itemSummaries.length > 0) {
      return searchResponse.data.itemSummaries.slice(0, 10).map(item => ({
        title: item.title,
        price: parseFloat(item.price?.value || 0),
        url: item.itemWebUrl || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keywords)}`
      }));
    }
  } catch (error) {
    // Log failed API call
    await logApiCall('eBay API', `${ebaySearchUrl}?q=${keywords}`, error.response?.status?.toString() || 'error');
    console.error('eBay API Error:', error.response?.data || error.message);
  }

  // Fallback to mock data if API fails
  return [
    {
      title: `Vintage ${keywords} - Antique Collectible`,
      price: Math.random() * 500 + 50,
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keywords)}`
    },
    {
      title: `Rare ${keywords} Collection`,
      price: Math.random() * 500 + 50,
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keywords)}`
    }
  ];
}

// Simulate Etsy API call (replace with actual Etsy API)
async function fetchEtsyPrices(keywords) {
  // In production, use actual Etsy API
  // Example: https://www.etsy.com/developers/documentation

  // For now, return mock data
  return [
    {
      title: `Handcrafted ${keywords}`,
      price: Math.random() * 400 + 40,
      url: `https://www.etsy.com/search?q=${encodeURIComponent(keywords)}`
    },
    {
      title: `Vintage ${keywords} Art`,
      price: Math.random() * 400 + 40,
      url: `https://www.etsy.com/search?q=${encodeURIComponent(keywords)}`
    }
  ];
}

// Simulate Amazon API call
async function fetchAmazonPrices(keywords) {
  // In production, use actual Amazon Product Advertising API
  // Example: https://webservices.amazon.com/paapi5/documentation/

  return [
    {
      title: `${keywords} - New`,
      price: Math.random() * 300 + 30,
      url: `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}`
    },
    {
      title: `${keywords} - Bestseller`,
      price: Math.random() * 300 + 30,
      url: `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}`
    }
  ];
}

// Delete prediction (Admin only)
exports.deletePriceLog = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Delete prediction and associated comparisons
    await pool.query('DELETE FROM price_comparisons WHERE item_id IN (SELECT item_id FROM predictions WHERE prediction_id = ?)', [id]);
    await pool.query('DELETE FROM predictions WHERE prediction_id = ?', [id]);

    res.json({ message: 'Prediction deleted successfully' });
  } catch (error) {
    next(error);
  }
};
