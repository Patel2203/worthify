const { pool } = require('../config/database');

// Create a new appraisal
const createAppraisal = async (req, res) => {
  try {
    const {
      appraisal_item_id,
      estimated_price,
      comments,
      authenticity_rating,
      confidence_level
    } = req.body;

    const appraiser_id = req.user.id || req.user.userId;

    // Validation
    if (!appraisal_item_id || !estimated_price) {
      return res.status(400).json({
        error: 'Appraisal item ID and estimated price are required'
      });
    }

    // Check if item exists and is public
    const [items] = await pool.query(
      'SELECT * FROM appraisal_items WHERE appraisal_item_id = ?',
      [appraisal_item_id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Appraisal item not found' });
    }

    if (!items[0].is_public) {
      return res.status(403).json({ error: 'Cannot appraise a private item' });
    }

    // Cannot appraise own item
    if (items[0].user_id === appraiser_id) {
      return res.status(403).json({ error: 'You cannot appraise your own item' });
    }

    // Check if user already appraised this item
    const [existing] = await pool.query(
      'SELECT * FROM appraisals WHERE appraisal_item_id = ? AND appraiser_id = ?',
      [appraisal_item_id, appraiser_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'You have already appraised this item. Use update instead.'
      });
    }

    // Create appraisal
    const [result] = await pool.query(
      `INSERT INTO appraisals
       (appraisal_item_id, appraiser_id, estimated_price, comments, authenticity_rating, confidence_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [appraisal_item_id, appraiser_id, estimated_price, comments, authenticity_rating, confidence_level]
    );

    // Create notification for item owner
    const [appraiserInfo] = await pool.query(
      'SELECT name FROM users WHERE user_id = ?',
      [appraiser_id]
    );

    await pool.query(
      `INSERT INTO appraisal_notifications
       (user_id, appraisal_item_id, appraisal_id, notification_type, message)
       VALUES (?, ?, ?, 'new_appraisal', ?)`,
      [
        items[0].user_id,
        appraisal_item_id,
        result.insertId,
        `${appraiserInfo[0].name} appraised your item "${items[0].title}" at $${estimated_price}`
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Appraisal created successfully',
      appraisal_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating appraisal:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'You have already appraised this item' });
    }
    res.status(500).json({ error: 'Failed to create appraisal' });
  }
};

// Get all appraisals for a specific item
const getAppraisalsByItem = async (req, res) => {
  try {
    const { appraisal_item_id } = req.params;

    const [appraisals] = await pool.query(
      `SELECT
        a.*,
        u.name as appraiser_name
      FROM appraisals a
      LEFT JOIN users u ON a.appraiser_id = u.user_id
      WHERE a.appraisal_item_id = ?
      ORDER BY a.created_at DESC`,
      [appraisal_item_id]
    );

    // Calculate statistics
    const stats = {
      total_appraisals: appraisals.length,
      avg_price: 0,
      min_price: 0,
      max_price: 0,
      avg_authenticity: 0
    };

    if (appraisals.length > 0) {
      stats.avg_price = (appraisals.reduce((sum, a) => sum + parseFloat(a.estimated_price), 0) / appraisals.length).toFixed(2);
      stats.min_price = Math.min(...appraisals.map(a => parseFloat(a.estimated_price)));
      stats.max_price = Math.max(...appraisals.map(a => parseFloat(a.estimated_price)));

      const ratingsWithValue = appraisals.filter(a => a.authenticity_rating);
      if (ratingsWithValue.length > 0) {
        stats.avg_authenticity = (ratingsWithValue.reduce((sum, a) => sum + a.authenticity_rating, 0) / ratingsWithValue.length).toFixed(1);
      }
    }

    res.json({
      success: true,
      appraisals,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching appraisals:', error);
    res.status(500).json({ error: 'Failed to fetch appraisals' });
  }
};

// Update an appraisal
const updateAppraisal = async (req, res) => {
  try {
    const { id } = req.params;
    const appraiser_id = req.user.id || req.user.userId;
    const {
      estimated_price,
      comments,
      authenticity_rating,
      confidence_level
    } = req.body;

    // Check ownership
    const [appraisals] = await pool.query(
      'SELECT * FROM appraisals WHERE appraisal_id = ?',
      [id]
    );

    if (appraisals.length === 0) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }

    if (appraisals[0].appraiser_id !== appraiser_id) {
      return res.status(403).json({ error: 'You can only update your own appraisals' });
    }

    await pool.query(
      `UPDATE appraisals
       SET estimated_price = ?, comments = ?, authenticity_rating = ?, confidence_level = ?
       WHERE appraisal_id = ?`,
      [estimated_price, comments, authenticity_rating, confidence_level, id]
    );

    res.json({
      success: true,
      message: 'Appraisal updated successfully'
    });
  } catch (error) {
    console.error('Error updating appraisal:', error);
    res.status(500).json({ error: 'Failed to update appraisal' });
  }
};

// Delete an appraisal
const deleteAppraisal = async (req, res) => {
  try {
    const { id } = req.params;
    const appraiser_id = req.user.id || req.user.userId;

    // Check ownership
    const [appraisals] = await pool.query(
      'SELECT * FROM appraisals WHERE appraisal_id = ?',
      [id]
    );

    if (appraisals.length === 0) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }

    if (appraisals[0].appraiser_id !== appraiser_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own appraisals' });
    }

    await pool.query('DELETE FROM appraisals WHERE appraisal_id = ?', [id]);

    res.json({
      success: true,
      message: 'Appraisal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appraisal:', error);
    res.status(500).json({ error: 'Failed to delete appraisal' });
  }
};

// Get user's appraisals (appraisals they've given)
const getMyAppraisals = async (req, res) => {
  try {
    const appraiser_id = req.user.id || req.user.userId;

    const [appraisals] = await pool.query(
      `SELECT
        a.*,
        ai.title as item_title,
        ai.image_url as item_image,
        ai.category as item_category,
        u.name as item_owner_name
      FROM appraisals a
      LEFT JOIN appraisal_items ai ON a.appraisal_item_id = ai.appraisal_item_id
      LEFT JOIN users u ON ai.user_id = u.user_id
      WHERE a.appraiser_id = ?
      ORDER BY a.created_at DESC`,
      [appraiser_id]
    );

    res.json({
      success: true,
      count: appraisals.length,
      appraisals
    });
  } catch (error) {
    console.error('Error fetching user appraisals:', error);
    res.status(500).json({ error: 'Failed to fetch your appraisals' });
  }
};

module.exports = {
  createAppraisal,
  getAppraisalsByItem,
  updateAppraisal,
  deleteAppraisal,
  getMyAppraisals
};
