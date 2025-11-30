const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const {
  createAppraisalItem,
  getPublicAppraisalItems,
  getMyAppraisalItems,
  getAppraisalItemById,
  updateAppraisalItem,
  deleteAppraisalItem
} = require('../controllers/appraisalItemController');

const {
  createAppraisal,
  getAppraisalsByItem,
  updateAppraisal,
  deleteAppraisal,
  getMyAppraisals
} = require('../controllers/appraisalController');

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

const {
  createReport,
  getReports,
  reviewReport,
  getAllItems,
  updateItemStatus,
  getModerationStats
} = require('../controllers/moderationController');

// ========== Appraisal Items Routes ==========

// Public routes (no authentication required)
router.get('/items/public', getPublicAppraisalItems);
router.get('/items/:id', getAppraisalItemById);

// Protected routes (authentication required)
router.post('/items', authenticate, upload.single('image'), createAppraisalItem);
router.get('/items/my/all', authenticate, getMyAppraisalItems);
router.put('/items/:id', authenticate, upload.single('image'), updateAppraisalItem);
router.delete('/items/:id', authenticate, deleteAppraisalItem);

// ========== Appraisals Routes ==========

// Get appraisals for an item
router.get('/items/:appraisal_item_id/appraisals', getAppraisalsByItem);

// Protected appraisal routes
router.post('/appraisals', authenticate, createAppraisal);
router.get('/appraisals/my/all', authenticate, getMyAppraisals);
router.put('/appraisals/:id', authenticate, updateAppraisal);
router.delete('/appraisals/:id', authenticate, deleteAppraisal);

// ========== Notifications Routes ==========

router.get('/notifications', authenticate, getNotifications);
router.get('/notifications/unread/count', authenticate, getUnreadCount);
router.put('/notifications/:id/read', authenticate, markAsRead);
router.put('/notifications/read-all', authenticate, markAllAsRead);
router.delete('/notifications/:id', authenticate, deleteNotification);

// ========== Moderation Routes ==========

// User can report items/appraisals
router.post('/reports', authenticate, createReport);

// Admin-only routes
router.get('/admin/reports', authenticate, authorize('admin'), getReports);
router.put('/admin/reports/:id/review', authenticate, authorize('admin'), reviewReport);
router.get('/admin/items', authenticate, authorize('admin'), getAllItems);
router.put('/admin/items/:id/status', authenticate, authorize('admin'), updateItemStatus);
router.get('/admin/stats', authenticate, authorize('admin'), getModerationStats);

module.exports = router;
