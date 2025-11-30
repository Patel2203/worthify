const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  submitFeedback,
  getAllFeedback,
  getFeedbackStats,
  getMyFeedback,
  deleteFeedback,
  getPublicFeedback
} = require('../controllers/feedbackController');

// Public routes (no authentication)
router.get('/public', getPublicFeedback);

// User routes (authenticated)
router.post('/', authenticate, submitFeedback);
router.get('/my', authenticate, getMyFeedback);

// Admin routes
router.get('/', authenticate, authorize('admin'), getAllFeedback);
router.get('/stats', authenticate, authorize('admin'), getFeedbackStats);
router.delete('/:id', authenticate, authorize('admin'), deleteFeedback);

module.exports = router;
