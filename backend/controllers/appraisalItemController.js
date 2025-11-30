const { pool } = require('../config/database');
const { cloudinary, upload } = require('../config/cloudinary');

// Create a new appraisal item
const createAppraisalItem = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      item_condition,
      estimated_price,
      is_public
    } = req.body;

    const user_id = req.user.id || req.user.userId; // Support both id and userId
    const image_url = req.file ? req.file.path : null; // Cloudinary URL

    // Validation
    if (!title || !description || !category) {
      return res.status(400).json({
        error: 'Title, description, and category are required'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO appraisal_items
       (user_id, title, description, category, item_condition, estimated_price, image_url, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, category, item_condition, estimated_price, image_url, is_public === 'true' || is_public === true]
    );

    res.status(201).json({
      message: 'Appraisal item created successfully',
      appraisal_item_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating appraisal item:', error);
    console.error('Error message:', error.message);
    console.error('Request body:', req.body);
    console.error('Request file:', req.file);
    console.error('Request user:', req.user);
    res.status(500).json({
      error: 'Failed to create appraisal item',
      details: error.message
    });
  }
};

// Get all public appraisal items
const getPublicAppraisalItems = async (req, res) => {
  try {
    const { category, sort = 'recent' } = req.query;

    let query = `
      SELECT
        ai.*,
        u.name as owner_name,
        COUNT(DISTINCT a.appraisal_id) as appraisal_count,
        AVG(a.estimated_price) as avg_appraisal_price
      FROM appraisal_items ai
      LEFT JOIN users u ON ai.user_id = u.user_id
      LEFT JOIN appraisals a ON ai.appraisal_item_id = a.appraisal_item_id
      WHERE ai.is_public = TRUE AND ai.status = 'active'
    `;

    const params = [];

    if (category) {
      query += ' AND ai.category = ?';
      params.push(category);
    }

    query += ' GROUP BY ai.appraisal_item_id';

    // Sorting
    if (sort === 'recent') {
      query += ' ORDER BY ai.created_at DESC';
    } else if (sort === 'popular') {
      query += ' ORDER BY ai.view_count DESC';
    } else if (sort === 'most_appraised') {
      query += ' ORDER BY appraisal_count DESC';
    }

    const [items] = await pool.query(query, params);

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Error fetching public appraisal items:', error);
    res.status(500).json({ error: 'Failed to fetch appraisal items' });
  }
};

// Get user's own appraisal items
const getMyAppraisalItems = async (req, res) => {
  try {
    const user_id = req.user.id || req.user.userId;

    const [items] = await pool.query(
      `SELECT
        ai.*,
        COUNT(DISTINCT a.appraisal_id) as appraisal_count,
        AVG(a.estimated_price) as avg_appraisal_price
      FROM appraisal_items ai
      LEFT JOIN appraisals a ON ai.appraisal_item_id = a.appraisal_item_id
      WHERE ai.user_id = ?
      GROUP BY ai.appraisal_item_id
      ORDER BY ai.created_at DESC`,
      [user_id]
    );

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Error fetching user appraisal items:', error);
    res.status(500).json({ error: 'Failed to fetch your appraisal items' });
  }
};

// Get single appraisal item with details
const getAppraisalItemById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get item details
    const [items] = await pool.query(
      `SELECT
        ai.*,
        u.name as owner_name,
        u.email as owner_email
      FROM appraisal_items ai
      LEFT JOIN users u ON ai.user_id = u.user_id
      WHERE ai.appraisal_item_id = ?`,
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Appraisal item not found' });
    }

    const item = items[0];

    // Check if user has permission to view
    const userId = req.user ? (req.user.id || req.user.userId) : null;
    if (!item.is_public && req.user && item.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Increment view count
    await pool.query(
      'UPDATE appraisal_items SET view_count = view_count + 1 WHERE appraisal_item_id = ?',
      [id]
    );

    // Get appraisals for this item
    const [appraisals] = await pool.query(
      `SELECT
        a.*,
        u.name as appraiser_name
      FROM appraisals a
      LEFT JOIN users u ON a.appraiser_id = u.user_id
      WHERE a.appraisal_item_id = ?
      ORDER BY a.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      item: {
        ...item,
        appraisals
      }
    });
  } catch (error) {
    console.error('Error fetching appraisal item:', error);
    res.status(500).json({ error: 'Failed to fetch appraisal item' });
  }
};

// Update appraisal item
const updateAppraisalItem = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id || req.user.userId;
    const {
      title,
      description,
      category,
      item_condition,
      estimated_price,
      is_public,
      status
    } = req.body;

    // Check ownership
    const [items] = await pool.query(
      'SELECT * FROM appraisal_items WHERE appraisal_item_id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Appraisal item not found' });
    }

    if (items[0].user_id !== user_id) {
      return res.status(403).json({ error: 'You can only update your own items' });
    }

    const image_url = req.file ? req.file.path : items[0].image_url; // Cloudinary URL

    await pool.query(
      `UPDATE appraisal_items
       SET title = ?, description = ?, category = ?, item_condition = ?,
           estimated_price = ?, image_url = ?, is_public = ?, status = ?
       WHERE appraisal_item_id = ?`,
      [title, description, category, item_condition, estimated_price, image_url, is_public, status || items[0].status, id]
    );

    res.json({
      success: true,
      message: 'Appraisal item updated successfully'
    });
  } catch (error) {
    console.error('Error updating appraisal item:', error);
    res.status(500).json({ error: 'Failed to update appraisal item' });
  }
};

// Delete appraisal item
const deleteAppraisalItem = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id || req.user.userId;

    // Check ownership
    const [items] = await pool.query(
      'SELECT * FROM appraisal_items WHERE appraisal_item_id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Appraisal item not found' });
    }

    if (items[0].user_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own items' });
    }

    await pool.query('DELETE FROM appraisal_items WHERE appraisal_item_id = ?', [id]);

    res.json({
      success: true,
      message: 'Appraisal item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appraisal item:', error);
    res.status(500).json({ error: 'Failed to delete appraisal item' });
  }
};

module.exports = {
  createAppraisalItem,
  getPublicAppraisalItems,
  getMyAppraisalItems,
  getAppraisalItemById,
  updateAppraisalItem,
  deleteAppraisalItem
};
