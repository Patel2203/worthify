const { pool } = require('../config/database');

// Create a report
const createReport = async (req, res) => {
  try {
    const {
      appraisal_item_id,
      appraisal_id,
      report_type,
      reason
    } = req.body;

    const reporter_id = req.user.id || req.user.userId;

    // Validation
    if (!reason || !report_type) {
      return res.status(400).json({
        error: 'Report type and reason are required'
      });
    }

    if (!appraisal_item_id && !appraisal_id) {
      return res.status(400).json({
        error: 'Either appraisal_item_id or appraisal_id is required'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO appraisal_reports
       (reporter_id, appraisal_item_id, appraisal_id, report_type, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [reporter_id, appraisal_item_id || null, appraisal_id || null, report_type, reason]
    );

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// Get all reports (Admin only)
const getReports = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    let query = `
      SELECT
        r.*,
        u1.name as reporter_name,
        u1.email as reporter_email,
        u2.name as reviewed_by_name,
        ai.title as item_title,
        a.estimated_price as appraisal_price
      FROM appraisal_reports r
      LEFT JOIN users u1 ON r.reporter_id = u1.user_id
      LEFT JOIN users u2 ON r.reviewed_by = u2.user_id
      LEFT JOIN appraisal_items ai ON r.appraisal_item_id = ai.appraisal_item_id
      LEFT JOIN appraisals a ON r.appraisal_id = a.appraisal_id
    `;

    const params = [];

    if (status) {
      query += ' WHERE r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';

    const [reports] = await pool.query(query, params);

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Review a report (Admin only)
const reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, action } = req.body;
    const admin_id = req.user.id || req.user.userId;

    // Validation
    if (!status || !['reviewed', 'action_taken', 'dismissed'].includes(status)) {
      return res.status(400).json({
        error: 'Valid status is required (reviewed, action_taken, dismissed)'
      });
    }

    // Get report details
    const [reports] = await pool.query(
      'SELECT * FROM appraisal_reports WHERE report_id = ?',
      [id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reports[0];

    // Update report status
    await pool.query(
      `UPDATE appraisal_reports
       SET status = ?, reviewed_by = ?, admin_notes = ?, reviewed_at = NOW()
       WHERE report_id = ?`,
      [status, admin_id, admin_notes, id]
    );

    // Take action if needed
    if (action === 'remove_item' && report.appraisal_item_id) {
      await pool.query(
        'UPDATE appraisal_items SET status = ? WHERE appraisal_item_id = ?',
        ['removed', report.appraisal_item_id]
      );

      // Notify item owner
      const [items] = await pool.query(
        'SELECT user_id, title FROM appraisal_items WHERE appraisal_item_id = ?',
        [report.appraisal_item_id]
      );

      if (items.length > 0) {
        await pool.query(
          `INSERT INTO appraisal_notifications
           (user_id, appraisal_item_id, notification_type, message)
           VALUES (?, ?, 'item_removed', ?)`,
          [
            items[0].user_id,
            report.appraisal_item_id,
            `Your item "${items[0].title}" has been removed due to a violation. Reason: ${admin_notes || report.report_type}`
          ]
        );
      }
    } else if (action === 'remove_appraisal' && report.appraisal_id) {
      await pool.query(
        'DELETE FROM appraisals WHERE appraisal_id = ?',
        [report.appraisal_id]
      );
    }

    res.json({
      success: true,
      message: 'Report reviewed successfully'
    });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ error: 'Failed to review report' });
  }
};

// Get all items (Admin only - for moderation)
const getAllItems = async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        ai.*,
        u.name as owner_name,
        u.email as owner_email,
        COUNT(DISTINCT a.appraisal_id) as appraisal_count
      FROM appraisal_items ai
      LEFT JOIN users u ON ai.user_id = u.user_id
      LEFT JOIN appraisals a ON ai.appraisal_item_id = a.appraisal_item_id
    `;

    const params = [];

    if (status) {
      query += ' WHERE ai.status = ?';
      params.push(status);
    }

    query += ' GROUP BY ai.appraisal_item_id ORDER BY ai.created_at DESC';

    const [items] = await pool.query(query, params);

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Error fetching all items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

// Update item status (Admin only)
const updateItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Validation
    if (!status || !['active', 'closed', 'reported', 'removed'].includes(status)) {
      return res.status(400).json({
        error: 'Valid status is required (active, closed, reported, removed)'
      });
    }

    await pool.query(
      'UPDATE appraisal_items SET status = ? WHERE appraisal_item_id = ?',
      [status, id]
    );

    // Notify owner if removed
    if (status === 'removed') {
      const [items] = await pool.query(
        'SELECT user_id, title FROM appraisal_items WHERE appraisal_item_id = ?',
        [id]
      );

      if (items.length > 0) {
        await pool.query(
          `INSERT INTO appraisal_notifications
           (user_id, appraisal_item_id, notification_type, message)
           VALUES (?, ?, 'item_removed', ?)`,
          [
            items[0].user_id,
            id,
            `Your item "${items[0].title}" has been removed by admin. Reason: ${reason || 'Policy violation'}`
          ]
        );
      }
    }

    res.json({
      success: true,
      message: 'Item status updated successfully'
    });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ error: 'Failed to update item status' });
  }
};

// Get moderation statistics (Admin only)
const getModerationStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM appraisal_reports WHERE status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM appraisal_items WHERE status = 'reported') as reported_items,
        (SELECT COUNT(*) FROM appraisal_items WHERE status = 'active') as active_items,
        (SELECT COUNT(*) FROM appraisal_items WHERE status = 'removed') as removed_items,
        (SELECT COUNT(*) FROM appraisals) as total_appraisals
    `);

    res.json({
      success: true,
      statistics: stats[0]
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({ error: 'Failed to fetch moderation statistics' });
  }
};

module.exports = {
  createReport,
  getReports,
  reviewReport,
  getAllItems,
  updateItemStatus,
  getModerationStats
};
