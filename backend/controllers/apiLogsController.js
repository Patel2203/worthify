const { getApiLogs, getApiStats, cleanupOldLogs } = require('../utils/apiLogger');

/**
 * Get API logs with optional filters
 * GET /api/api-logs
 * Query params: apiName, limit, startDate, endDate
 */
exports.getLogs = async (req, res, next) => {
  try {
    const { apiName, limit, startDate, endDate } = req.query;

    const logs = await getApiLogs({
      apiName,
      limit: limit || 100,
      startDate,
      endDate
    });

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get API usage statistics
 * GET /api/api-logs/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    const stats = await getApiStats();

    // Group by API name for summary
    const summary = stats.reduce((acc, stat) => {
      if (!acc[stat.api_name]) {
        acc[stat.api_name] = {
          api_name: stat.api_name,
          total_calls: 0,
          successful_calls: 0,
          failed_calls: 0
        };
      }

      acc[stat.api_name].total_calls += stat.total_calls;
      acc[stat.api_name].successful_calls += stat.successful_calls;
      acc[stat.api_name].failed_calls += stat.failed_calls;

      return acc;
    }, {});

    res.json({
      success: true,
      summary: Object.values(summary),
      dailyStats: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cleanup old logs (Admin only)
 * DELETE /api/api-logs/cleanup
 * Query param: days (default: 30)
 */
exports.cleanup = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const deletedCount = await cleanupOldLogs(days);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old API logs`,
      deletedCount
    });
  } catch (error) {
    next(error);
  }
};
