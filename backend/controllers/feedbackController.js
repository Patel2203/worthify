const { pool } = require('../config/database');

// Get recent public feedback (no authentication required)
exports.getPublicFeedback = async (req, res, next) => {
  try {
    const { limit = 6 } = req.query;

    // Get recent high-rated feedback
    const [feedback] = await pool.query(
      `SELECT
        f.feedback_id,
        f.message,
        f.rating,
        f.submitted_at,
        u.name as user_name
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.user_id
      WHERE f.rating >= 4
      ORDER BY f.submitted_at DESC
      LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      feedback
    });
  } catch (error) {
    console.error('Error fetching public feedback:', error);
    next(error);
  }
};

// Submit feedback
exports.submitFeedback = async (req, res, next) => {
  try {
    const { message, rating } = req.body;
    const userId = req.user.id || req.user.userId;

    // Validation
    if (!message || !rating) {
      return res.status(400).json({
        error: 'Message and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    // Insert feedback
    const [result] = await pool.query(
      'INSERT INTO feedback (user_id, message, rating) VALUES (?, ?, ?)',
      [userId, message, rating]
    );

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      feedback_id: result.insertId
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    next(error);
  }
};

// Get all feedback (Admin only)
exports.getAllFeedback = async (req, res, next) => {
  try {
    const { rating, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        f.feedback_id,
        f.message,
        f.rating,
        f.submitted_at,
        u.name as user_name,
        u.email as user_email
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.user_id
    `;

    const params = [];

    if (rating) {
      query += ' WHERE f.rating = ?';
      params.push(rating);
    }

    query += ' ORDER BY f.submitted_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [feedback] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM feedback';
    if (rating) {
      countQuery += ' WHERE rating = ?';
    }
    const [countResult] = await pool.query(
      countQuery,
      rating ? [rating] : []
    );

    res.json({
      success: true,
      feedback,
      total: countResult[0].total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(countResult[0].total / limit)
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    next(error);
  }
};

// Get feedback statistics (Admin only)
exports.getFeedbackStats = async (req, res, next) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_feedback,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM feedback
    `);

    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    next(error);
  }
};

// Get user's own feedback
exports.getMyFeedback = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;

    const [feedback] = await pool.query(
      `SELECT
        feedback_id,
        message,
        rating,
        submitted_at
      FROM feedback
      WHERE user_id = ?
      ORDER BY submitted_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      feedback
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    next(error);
  }
};

// Delete feedback (Admin only)
exports.deleteFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM feedback WHERE feedback_id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    next(error);
  }
};
