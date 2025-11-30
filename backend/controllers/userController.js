const { pool } = require('../config/database');

// Get all users (Admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      users,
      total: users.length
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID (Admin only)
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query(
      'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's item count
    const [itemCount] = await pool.query(
      'SELECT COUNT(*) as count FROM items WHERE user_id = ?',
      [id]
    );

    res.json({
      user: users[0],
      stats: {
        totalItems: itemCount[0].count
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user role (Admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be admin or user'
      });
    }

    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from changing their own role
    if (id == req.user.id) {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }

    await pool.query('UPDATE users SET role = ? WHERE user_id = ?', [role, id]);

    res.json({
      message: 'User role updated successfully',
      userId: id,
      newRole: role
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id == req.user.id) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user's price comparisons and predictions
    await pool.query('DELETE FROM price_comparisons WHERE item_id IN (SELECT item_id FROM items WHERE user_id = ?)', [id]);
    await pool.query('DELETE FROM predictions WHERE item_id IN (SELECT item_id FROM items WHERE user_id = ?)', [id]);

    // Delete user's items
    await pool.query('DELETE FROM items WHERE user_id = ?', [id]);

    // Delete user
    await pool.query('DELETE FROM users WHERE user_id = ?', [id]);

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get user statistics
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.role === 'admin' && req.params.userId
      ? req.params.userId
      : req.user.id;

    // Get user information
    const [users] = await pool.query(
      'SELECT user_id, name FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get total items count
    const [itemCount] = await pool.query(
      'SELECT COUNT(*) as count FROM items WHERE user_id = ?',
      [userId]
    );

    // Get total predictions count
    const [predictionCount] = await pool.query(
      'SELECT COUNT(*) as count FROM predictions WHERE item_id IN (SELECT item_id FROM items WHERE user_id = ?)',
      [userId]
    );

    // Get average predicted price
    const [avgPrice] = await pool.query(
      'SELECT AVG(predicted_price) as average FROM predictions WHERE item_id IN (SELECT item_id FROM items WHERE user_id = ?)',
      [userId]
    );

    // Get most recent item
    const [recentItems] = await pool.query(
      'SELECT item_id, item_name, upload_date FROM items WHERE user_id = ? ORDER BY upload_date DESC LIMIT 1',
      [userId]
    );

    const response = {
      userId: user.user_id,
      userName: user.name,
      totalItems: itemCount[0].count,
      totalPredictions: predictionCount[0].count,
      averagePredictedPrice: avgPrice[0].average ? parseFloat(avgPrice[0].average).toFixed(2) : 0
    };

    // Add mostRecentItem only if it exists
    if (recentItems.length > 0) {
      response.mostRecentItem = {
        item_id: recentItems[0].item_id,
        item_name: recentItems[0].item_name,
        upload_date: recentItems[0].upload_date
      };
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};
