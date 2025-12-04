const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const { logApiCall } = require('../utils/apiLogger');

/**
 * Image Recognition Service using Google Cloud Vision API
 * Analyzes uploaded images to identify items and generate search keywords
 */

/**
 * Analyze image using Google Cloud Vision API and generate search keywords
 * @param {string} imagePath - Path to the uploaded image file
 * @param {string} itemName - User-provided item name (fallback)
 * @param {string} category - Item category (fallback)
 * @returns {Promise<object>} - Object containing keywords, title, and visual matches
 */
exports.analyzeImageWithGoogleLens = async (imagePath, itemName, category) => {
  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    // If no API key, use fallback method
    if (!apiKey) {
      console.log('Google Vision API key not found, using fallback keyword generation');
      return {
        keywords: generateFallbackKeywords(itemName, category),
        title: itemName,
        source: 'fallback',
        labels: [],
        webDetection: null
      };
    }

    // Read image and convert to base64
    let imageBuffer;

    // Check if imagePath is a URL (Cloudinary) or local file
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // Download image from Cloudinary
      console.log(`📥 Downloading image from Cloudinary: ${imagePath}`);
      const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(response.data);
    } else {
      // Read local file
      imageBuffer = await fs.readFile(imagePath);
    }

    const base64Image = imageBuffer.toString('base64');

    // Call Google Cloud Vision API
    const visionResponse = await analyzeWithGoogleVision(base64Image, apiKey);

    // Extract labels and web detection
    const labels = visionResponse.labelAnnotations || [];
    const webDetection = visionResponse.webDetection || null;
    const textDetection = visionResponse.textAnnotations || [];

    // Generate keywords from Vision API results
    const keywords = extractKeywordsFromVisionResults(
      labels,
      webDetection,
      textDetection,
      itemName,
      category
    );

    // Get best guess title
    const recognizedTitle = webDetection?.bestGuessLabels?.[0]?.label ||
                           webDetection?.webEntities?.[0]?.description ||
                           itemName;

    // Extract visual matches from web detection
    const visualMatches = [];
    if (webDetection?.visuallySimilarImages) {
      visualMatches.push(...webDetection.visuallySimilarImages.map(img => ({
        url: img.url,
        score: img.score || 1.0
      })));
    }
    if (webDetection?.pagesWithMatchingImages) {
      webDetection.pagesWithMatchingImages.slice(0, 10).forEach(page => {
        if (page.url && page.pageTitle) {
          visualMatches.push({
            url: page.url,
            title: page.pageTitle,
            score: page.score || 0.8
          });
        }
      });
    }

    return {
      keywords,
      title: recognizedTitle,
      source: 'google_vision',
      labels: labels.slice(0, 5).map(l => ({ description: l.description, score: l.score })),
      webDetection: webDetection?.webEntities?.slice(0, 5),
      visualMatches: visualMatches.slice(0, 15),
      confidence: calculateConfidence(labels, webDetection)
    };

  } catch (error) {
    console.error('Google Vision API error:', error.message);
    // Fallback to metadata-based keywords
    return {
      keywords: generateFallbackKeywords(itemName, category),
      title: itemName,
      source: 'fallback',
      labels: [],
      webDetection: null,
      error: error.message
    };
  }
};

/**
 * Call Google Cloud Vision API using REST API
 * @param {string} base64Image - Base64 encoded image
 * @param {string} apiKey - Google Cloud API key
 * @returns {Promise<object>} - Vision API response
 */
async function analyzeWithGoogleVision(base64Image, apiKey) {
  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requestBody = {
    requests: [
      {
        image: {
          content: base64Image
        },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'WEB_DETECTION', maxResults: 10 },
          { type: 'TEXT_DETECTION', maxResults: 5 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(visionApiUrl, requestBody);

    // Log successful API call
    await logApiCall('Google Vision API', visionApiUrl, response.status.toString());

    if (response.data.responses && response.data.responses[0]) {
      return response.data.responses[0];
    }

    throw new Error('Invalid response from Google Vision API');
  } catch (error) {
    // Log failed API call
    await logApiCall('Google Vision API', visionApiUrl, error.response?.status?.toString() || 'error');
    throw error;
  }
}

/**
 * Extract search keywords from Google Vision API results
 * @param {Array} labels - Label annotations from Vision API
 * @param {object} webDetection - Web detection results
 * @param {Array} textDetection - Text detection results
 * @param {string} itemName - User-provided item name
 * @param {string} category - Item category
 * @returns {string} - Search keywords for marketplace search
 */
function extractKeywordsFromVisionResults(labels, webDetection, textDetection, itemName, category) {
  const keywords = [];

  console.log('🔍 EXTRACTING KEYWORDS FROM IMAGE CONTENT (ignoring item name/category):');

  // PRIORITY 1: Extract from web detection (what Google thinks the image IS)
  if (webDetection) {
    if (webDetection.bestGuessLabels) {
      webDetection.bestGuessLabels.forEach(label => {
        console.log(`  ✅ Best guess: ${label.label}`);
        keywords.push(label.label);
      });
    }
    if (webDetection.webEntities) {
      webDetection.webEntities.slice(0, 5).forEach(entity => {
        if (entity.description && entity.score > 0.4) {
          console.log(`  ✅ Web entity: ${entity.description} (score: ${entity.score.toFixed(2)})`);
          keywords.push(entity.description);
        }
      });
    }
  }

  // PRIORITY 2: Extract high-confidence labels from image
  if (labels && labels.length > 0) {
    labels
      .filter(label => label.score > 0.6) // Lower threshold to get more image-based keywords
      .slice(0, 8) // Get more labels
      .forEach(label => {
        console.log(`  ✅ Image label: ${label.description} (${(label.score * 100).toFixed(0)}% confidence)`);
        keywords.push(label.description);
      });
  }

  // PRIORITY 3: Only add "antique" or "vintage" if detected in image
  const hasAntiqueLabels = labels?.some(l =>
    l.description.toLowerCase().includes('antique') ||
    l.description.toLowerCase().includes('vintage') ||
    l.description.toLowerCase().includes('old')
  );

  if (hasAntiqueLabels) {
    keywords.push('antique', 'vintage');
    console.log(`  ✅ Added antique/vintage keywords (detected in image)`);
  }

  // DO NOT add item name or category - use ONLY what's in the image
  console.log(`  ❌ IGNORING item name: "${itemName}"`);
  console.log(`  ❌ IGNORING category: "${category}"`);

  // Remove duplicates, filter, and clean
  const uniqueKeywords = [...new Set(keywords)]
    .filter(k => k && k.length > 2)
    .map(k => k.toLowerCase())
    .slice(0, 10); // Allow more keywords from image

  const finalKeywords = uniqueKeywords.join(' ');
  console.log(`  📝 FINAL KEYWORDS (from image only): "${finalKeywords}"`);

  return finalKeywords;
}

/**
 * Calculate confidence score from Google Vision results
 * @param {Array} labels - Label annotations
 * @param {object} webDetection - Web detection results
 * @returns {string} - Confidence level (high, medium, low)
 */
function calculateConfidence(labels, webDetection) {
  if (webDetection?.bestGuessLabels?.length > 0) return 'high';
  if (labels && labels.length > 5 && labels[0].score > 0.8) return 'high';
  if (labels && labels.length > 3) return 'medium';
  return 'low';
}

/**
 * Generate fallback keywords from item metadata
 * @param {string} itemName - Item name
 * @param {string} category - Item category
 * @returns {string} - Search keywords
 */
function generateFallbackKeywords(itemName, category) {
  console.log('⚠️  FALLBACK MODE: Google Vision API not available or failed');
  console.log('⚠️  Using item name and category as fallback (not ideal)');

  const keywords = [];

  // Category-specific keywords (only used as fallback)
  const categoryKeywords = {
    'Furniture': ['antique furniture', 'vintage'],
    'Watches': ['vintage watch', 'antique timepiece'],
    'Jewelry': ['antique jewelry', 'vintage'],
    'Art': ['antique art', 'vintage painting'],
    'Ceramics': ['antique ceramic', 'vintage pottery'],
    'Textiles': ['vintage textile', 'antique fabric'],
    'Books': ['antique book', 'rare book'],
    'Other': ['antique', 'vintage collectible']
  };

  if (category && categoryKeywords[category]) {
    keywords.push(...categoryKeywords[category]);
  }

  if (itemName) {
    keywords.push(itemName);
  }

  const fallbackKeywords = [...new Set(keywords)].join(' ');
  console.log(`  📝 FALLBACK KEYWORDS: "${fallbackKeywords}"`);
  console.log(`  ⚠️  These are NOT based on image content - they use item name/category`);

  return fallbackKeywords;
}

/**
 * Convert local file path to accessible URL (for production)
 * In development, you may need to serve the file via HTTP
 * @param {string} imagePath - Local file path
 * @returns {string} - Accessible URL or base64 data
 */
function convertToAccessibleUrl(imagePath) {
  // In production, upload to cloud storage and return public URL
  // For now, return the local path (works if server is publicly accessible)
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5002';
  const relativePath = imagePath.replace(/^uploads\//, '');
  return `${serverUrl}/uploads/${relativePath}`;
}

/**
 * Alternative: Analyze image locally without API (basic)
 * This is a simple fallback that uses filename and metadata
 */
exports.analyzeImageLocally = async (imagePath, itemName, category) => {
  try {
    const filename = path.basename(imagePath, path.extname(imagePath));
    const cleanName = filename
      .replace(/^\d+[-_]/, '')
      .replace(/[-_]/g, ' ')
      .toLowerCase();

    return {
      keywords: generateFallbackKeywords(itemName || cleanName, category),
      title: itemName || cleanName,
      source: 'local',
      visualMatches: []
    };
  } catch (error) {
    console.error('Local image analysis error:', error);
    return {
      keywords: generateFallbackKeywords(itemName, category),
      title: itemName,
      source: 'error',
      visualMatches: []
    };
  }
};

module.exports = exports;
