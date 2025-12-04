const express = require('express');
const router = express.Router();
const apiLogsController = require('../controllers/apiLogsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get API logs (Admin only)
router.get('/', authorize('admin'), apiLogsController.getLogs);

// Get API statistics (Admin only)
router.get('/stats', authorize('admin'), apiLogsController.getStats);

// Cleanup old logs (Admin only)
router.delete('/cleanup', authorize('admin'), apiLogsController.cleanup);

module.exports = router;
