const { pool } = require('../config/database');

/**
 * Log API calls to the api_logs table
 * @param {string} apiName - Name of the API (e.g., 'Google Vision', 'eBay', 'Etsy')
 * @param {string} requestUrl - The URL that was called
 * @param {string} responseStatus - HTTP status code or 'success'/'error'
 */
async function logApiCall(apiName, requestUrl, responseStatus) {
  try {
    await pool.query(
      'INSERT INTO api_logs (api_name, request_url, response_status) VALUES (?, ?, ?)',
      [apiName, requestUrl, responseStatus]
    );
  } catch (error) {
    // Don't throw error - logging should not break the app
    console.error('Failed to log API call:', error.message);
  }
}

/**
 * Get API logs with optional filters
 * @param {object} filters - { apiName, limit, startDate, endDate }
 */
async function getApiLogs(filters = {}) {
  try {
    let query = 'SELECT * FROM api_logs WHERE 1=1';
    const params = [];

    if (filters.apiName) {
      query += ' AND api_name = ?';
      params.push(filters.apiName);
    }

    if (filters.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [logs] = await pool.query(query, params);
    return logs;
  } catch (error) {
    console.error('Failed to get API logs:', error.message);
    return [];
  }
}

/**
 * Get API usage statistics
 */
async function getApiStats() {
  try {
    const [stats] = await pool.query(`
      SELECT
        api_name,
        COUNT(*) as total_calls,
        SUM(CASE WHEN response_status LIKE '2%' OR response_status = 'success' THEN 1 ELSE 0 END) as successful_calls,
        SUM(CASE WHEN response_status NOT LIKE '2%' AND response_status != 'success' THEN 1 ELSE 0 END) as failed_calls,
        DATE(created_at) as date
      FROM api_logs
      GROUP BY api_name, DATE(created_at)
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return stats;
  } catch (error) {
    console.error('Failed to get API stats:', error.message);
    return [];
  }
}

/**
 * Delete old API logs (cleanup)
 * @param {number} daysToKeep - Number of days to keep logs
 */
async function cleanupOldLogs(daysToKeep = 30) {
  try {
    const [result] = await pool.query(
      'DELETE FROM api_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysToKeep]
    );

    console.log(`Cleaned up ${result.affectedRows} old API logs`);
    return result.affectedRows;
  } catch (error) {
    console.error('Failed to cleanup logs:', error.message);
    return 0;
  }
}

module.exports = {
  logApiCall,
  getApiLogs,
  getApiStats,
  cleanupOldLogs
};
