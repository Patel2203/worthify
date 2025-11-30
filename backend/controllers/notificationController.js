const { pool } = require('../config/database');

// Get user's notifications
const getNotifications = async (req, res) => {
  try {
    const user_id = req.user.id || req.user.userId;
    const { unread_only } = req.query;

    let query = `
      SELECT
        n.*,
        ai.title as item_title,
        ai.image_url as item_image
      FROM appraisal_notifications n
      LEFT JOIN appraisal_items ai ON n.appraisal_item_id = ai.appraisal_item_id
      WHERE n.user_id = ?
    `;

    if (unread_only === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT 50';

    const [notifications] = await pool.query(query, [user_id]);

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const user_id = req.user.id || req.user.userId;

    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM appraisal_notifications WHERE user_id = ? AND is_read = FALSE',
      [user_id]
    );

    res.json({
      success: true,
      unread_count: result[0].count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id || req.user.userId;

    // Verify ownership
    const [notifications] = await pool.query(
      'SELECT * FROM appraisal_notifications WHERE notification_id = ?',
      [id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notifications[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query(
      'UPDATE appraisal_notifications SET is_read = TRUE WHERE notification_id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const user_id = req.user.id || req.user.userId;

    await pool.query(
      'UPDATE appraisal_notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [user_id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id || req.user.userId;

    // Verify ownership
    const [notifications] = await pool.query(
      'SELECT * FROM appraisal_notifications WHERE notification_id = ?',
      [id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notifications[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM appraisal_notifications WHERE notification_id = ?', [id]);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
