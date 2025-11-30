const { pool } = require('../config/database');
const { cloudinary } = require('../config/cloudinary');
const imageRecognitionService = require('../services/imageRecognitionService');

// Create new item analysis
exports.createItem = async (req, res, next) => {
  try {
    const { item_name, description, category } = req.body;
    const userId = req.user.id;
    // Cloudinary stores the URL in req.file.path
    const imageUrl = req.file ? req.file.path : null;

    if (!item_name || !imageUrl) {
      return res.status(400).json({ error: 'Item name and image are required' });
    }

    // Insert item into database
    const [result] = await pool.query(
      'INSERT INTO items (user_id, item_name, description, category, image_url) VALUES (?, ?, ?, ?, ?)',
      [userId, item_name, description || null, category || 'Unknown', imageUrl]
    );

    const itemId = result.insertId;

    // Analyze image with Google Vision to extract keywords and estimate price (async - don't wait)
    analyzeImageAndEstimatePrice(itemId, imageUrl, item_name, category).catch(err => {
      console.error('Background image analysis error:', err);
    });

    const [item] = await pool.query(
      'SELECT * FROM items WHERE item_id = ?',
      [itemId]
    );

    res.status(201).json({
      message: 'Item created successfully. Analyzing image and estimating price...',
      item: item[0]
    });
  } catch (error) {
    next(error);
  }
};

// Background function to analyze image with Google Vision and estimate price
async function analyzeImageAndEstimatePrice(itemId, imagePath, itemName, category) {
  try {
    console.log(`🔍 Starting image analysis with Google Vision for item ${itemId}...`);

    // Step 1: Analyze image with Google Vision
    const visionResults = await imageRecognitionService.analyzeImageWithGoogleLens(
      imagePath,
      itemName,
      category
    );

    console.log(`✅ Image analyzed: ${visionResults.title} (source: ${visionResults.source})`);

    // Step 2: Fetch marketplace prices using keywords from image analysis
    const keywords = visionResults.keywords || itemName;
    const marketplaces = await fetchMarketplacePrices(keywords);

    // Step 3: Extract prices from marketplace results
    const pricesWithDetails = [];
    marketplaces.forEach(marketplace => {
      marketplace.listings.forEach(listing => {
        if (listing.price && listing.price > 0) {
          pricesWithDetails.push({
            price: listing.price,
            title: listing.title,
            source: marketplace.name,
            link: listing.url
          });
        }
      });
    });

    if (pricesWithDetails.length === 0) {
      console.log(`⚠️  No prices found for item ${itemId}`);
      return;
    }

    // Step 4: Calculate price statistics
    const prices = pricesWithDetails.map(p => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    console.log(`💰 Price analysis: Min=$${minPrice.toFixed(2)}, Avg=$${avgPrice.toFixed(2)}, Max=$${maxPrice.toFixed(2)}`);

    // Step 5: Save prediction to database
    await pool.query(
      'INSERT INTO predictions (item_id, predicted_price, currency, api_used) VALUES (?, ?, ?, ?)',
      [itemId, avgPrice, 'USD', 'google_vision_' + visionResults.source]
    );

    // Update item with estimated price
    await pool.query(
      'UPDATE items SET estimated_price = ? WHERE item_id = ?',
      [avgPrice, itemId]
    );

    // Step 6: Save marketplace price comparisons
    for (const item of pricesWithDetails.slice(0, 20)) {
      await pool.query(
        'INSERT INTO price_comparisons (item_id, platform_name, platform_price, platform_url, listing_title) VALUES (?, ?, ?, ?, ?)',
        [itemId, item.source, item.price, item.link, item.title]
      );
    }

    console.log(`✅ Completed price analysis for item ${itemId}: $${avgPrice.toFixed(2)} (${pricesWithDetails.length} listings)`);

  } catch (error) {
    console.error(`❌ Error analyzing item ${itemId}:`, error);
  }
}

// Helper function to fetch prices from marketplaces
async function fetchMarketplacePrices(keywords) {
  const marketplaces = [];

  try {
    const ebayData = await fetchEbayPrices(keywords);
    if (ebayData.length > 0) {
      marketplaces.push({
        name: 'eBay',
        listings: ebayData
      });
    }
  } catch (error) {
    console.error('eBay API error:', error.message);
  }

  try {
    const etsyData = await fetchEtsyPrices(keywords);
    if (etsyData.length > 0) {
      marketplaces.push({
        name: 'Etsy',
        listings: etsyData
      });
    }
  } catch (error) {
    console.error('Etsy API error:', error.message);
  }

  try {
    const amazonData = await fetchAmazonPrices(keywords);
    if (amazonData.length > 0) {
      marketplaces.push({
        name: 'Amazon',
        listings: amazonData
      });
    }
  } catch (error) {
    console.error('Amazon API error:', error.message);
  }

  return marketplaces;
}

// Simulate eBay API call (replace with actual eBay Finding API)
async function fetchEbayPrices(keywords) {
  return [
    {
      title: `Vintage ${keywords} - Collectible`,
      price: Math.random() * 500 + 100,
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keywords)}`
    },
    {
      title: `Rare ${keywords} Antique`,
      price: Math.random() * 600 + 150,
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keywords)}`
    },
    {
      title: `${keywords} Collection Item`,
      price: Math.random() * 400 + 80,
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keywords)}`
    }
  ];
}

// Simulate Etsy API call
async function fetchEtsyPrices(keywords) {
  return [
    {
      title: `Handcrafted ${keywords}`,
      price: Math.random() * 350 + 75,
      url: `https://www.etsy.com/search?q=${encodeURIComponent(keywords)}`
    },
    {
      title: `Vintage ${keywords} Art`,
      price: Math.random() * 450 + 120,
      url: `https://www.etsy.com/search?q=${encodeURIComponent(keywords)}`
    }
  ];
}

// Simulate Amazon API call
async function fetchAmazonPrices(keywords) {
  return [
    {
      title: `${keywords} - Collectible Edition`,
      price: Math.random() * 300 + 50,
      url: `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}`
    },
    {
      title: `Vintage ${keywords}`,
      price: Math.random() * 250 + 60,
      url: `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}`
    }
  ];
}

// Simulate Ruby Lane API call (Antique marketplace)
async function fetchRubyLanePrices(keywords) {
  return [
    {
      title: `Antique ${keywords}`,
      price: Math.random() * 800 + 150,
      url: `https://www.rubylane.com/search?q=${encodeURIComponent(keywords)}`
    },
    {
      title: `Estate ${keywords} - Vintage`,
      price: Math.random() * 650 + 200,
      url: `https://www.rubylane.com/search?q=${encodeURIComponent(keywords)}`
    }
  ];
}

// Simulate Chairish API call (Vintage furniture and decor)
async function fetchChairishPrices(keywords) {
  return [
    {
      title: `Vintage ${keywords}`,
      price: Math.random() * 600 + 100,
      url: `https://www.chairish.com/search?query=${encodeURIComponent(keywords)}`
    },
    {
      title: `Mid-Century ${keywords}`,
      price: Math.random() * 550 + 120,
      url: `https://www.chairish.com/search?query=${encodeURIComponent(keywords)}`
    }
  ];
}

// Simulate Bonanza API call (Online marketplace)
async function fetchBonanzaPrices(keywords) {
  return [
    {
      title: `Collectible ${keywords}`,
      price: Math.random() * 350 + 50,
      url: `https://www.bonanza.com/listings/${encodeURIComponent(keywords)}`
    },
    {
      title: `Vintage ${keywords} Collection`,
      price: Math.random() * 300 + 45,
      url: `https://www.bonanza.com/listings/${encodeURIComponent(keywords)}`
    }
  ];
}

// Get all items (with pagination)
exports.getAllItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    let query = `
      SELECT items.*,
             users.name as user_name,
             (SELECT COUNT(*) FROM price_comparisons WHERE price_comparisons.item_id = items.item_id) as marketplace_count
      FROM items
      JOIN users ON items.user_id = users.user_id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM items';
    const params = [];

    // Filter by user (non-admin users only see their own items)
    if (req.user.role !== 'admin') {
      query += ' WHERE items.user_id = ?';
      countQuery += ' WHERE user_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY items.upload_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [items] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      items,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single item by ID
exports.getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [items] = await pool.query(
      'SELECT items.*, users.name as user_name FROM items JOIN users ON items.user_id = users.user_id WHERE items.item_id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    // Check if user has access (admin or owner)
    if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get marketplace price comparisons
    const [marketplacePrices] = await pool.query(
      `SELECT platform_name, platform_price, platform_url, listing_title, last_checked
       FROM price_comparisons
       WHERE item_id = ?
       ORDER BY last_checked DESC`,
      [id]
    );

    // Group by marketplace
    const groupedPrices = marketplacePrices.reduce((acc, price) => {
      if (!acc[price.platform_name]) {
        acc[price.platform_name] = [];
      }
      acc[price.platform_name].push({
        title: price.listing_title,
        price: parseFloat(price.platform_price),
        url: price.platform_url,
        lastChecked: price.last_checked
      });
      return acc;
    }, {});

    res.json({
      item,
      marketplacePrices: groupedPrices,
      totalListings: marketplacePrices.length
    });
  } catch (error) {
    next(error);
  }
};

// Update item
exports.updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { item_name, description, category } = req.body;

    // Check if item exists and user has access
    const [items] = await pool.query('SELECT * FROM items WHERE item_id = ?', [id]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];

    if (item_name) {
      updates.push('item_name = ?');
      values.push(item_name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (category) {
      updates.push('category = ?');
      values.push(category);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    await pool.query(
      `UPDATE items SET ${updates.join(', ')} WHERE item_id = ?`,
      values
    );

    const [updatedItem] = await pool.query('SELECT * FROM items WHERE item_id = ?', [id]);

    res.json({
      message: 'Item updated successfully',
      item: updatedItem[0]
    });
  } catch (error) {
    next(error);
  }
};

// Delete item
exports.deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if item exists
    const [items] = await pool.query('SELECT * FROM items WHERE item_id = ?', [id]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    // Check if user has access (admin or owner)
    if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete associated predictions and comparisons
    await pool.query('DELETE FROM price_comparisons WHERE item_id = ?', [id]);
    await pool.query('DELETE FROM predictions WHERE item_id = ?', [id]);

    // Delete image from Cloudinary
    if (item.image_url) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = item.image_url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = 'worthify/' + filename.split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    // Delete item
    await pool.query('DELETE FROM items WHERE item_id = ?', [id]);

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get user's items
exports.getUserItems = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;

    // Only admin can view other users' items
    if (userId != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [items] = await pool.query(
      'SELECT item_id, item_name, description, category, image_url, upload_date FROM items WHERE user_id = ? ORDER BY upload_date DESC',
      [userId]
    );

    if (items.length === 0) {
      return res.status(404).json({
        error: 'No items found for this user',
        message: 'This user has not uploaded any items yet'
      });
    }

    res.json({
      items,
      total: items.length
    });
  } catch (error) {
    next(error);
  }
};

// Search for similar items using Google Vision (image analysis)
exports.searchSimilarItems = async (req, res, next) => {
  try {
    const imageUrl = req.file ? req.file.path : null;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Image is required',
        message: 'Please upload an image to search for similar items'
      });
    }

    console.log(`🔍 Searching for similar items using Google Vision: ${imageUrl}`);

    // Analyze image with Google Vision
    const visionResults = await imageRecognitionService.analyzeImageWithGoogleLens(
      imageUrl,
      '',
      ''
    );

    if (!visionResults || visionResults.source === 'error') {
      return res.status(500).json({
        error: 'Image analysis failed',
        message: visionResults.error || 'Unable to process image',
        hint: 'Make sure GOOGLE_VISION_API_KEY is set in your .env file'
      });
    }

    // Fetch marketplace listings using keywords from image analysis
    const keywords = visionResults.keywords || visionResults.title;
    const marketplaces = await fetchMarketplacePrices(keywords);

    // Combine visual matches with marketplace listings
    const results = [];

    // Add visual matches if available
    if (visionResults.visualMatches && visionResults.visualMatches.length > 0) {
      results.push(...visionResults.visualMatches.map(match => ({
        title: match.title || 'Similar Item',
        url: match.url,
        source: 'Visual Match',
        matchType: 'visual_match',
        similarity: Math.round((match.score || 0.8) * 100)
      })));
    }

    // Add marketplace listings
    marketplaces.forEach(marketplace => {
      marketplace.listings.forEach(listing => {
        results.push({
          title: listing.title,
          url: listing.url,
          price: listing.price,
          source: marketplace.name,
          matchType: 'marketplace_search'
        });
      });
    });

    // Note: No need to delete temporary file - Cloudinary handles storage

    res.json({
      success: true,
      message: 'Similar items found using Google Vision',
      totalResults: results.length,
      imageAnalysis: {
        title: visionResults.title,
        keywords: visionResults.keywords,
        source: visionResults.source,
        confidence: visionResults.confidence,
        labels: visionResults.labels
      },
      results: results
    });

  } catch (error) {
    console.error('Search similar items error:', error);
    next(error);
  }
};
