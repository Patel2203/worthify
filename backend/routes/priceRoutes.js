const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Analyze prices (Registered users only)
router.post('/analyze', authorize('user', 'admin'), priceController.analyzePrices);

// Get price history for an item
router.get('/history/:itemId', priceController.getPriceHistory);

// Delete price log (Admin only)
router.delete('/:id', authorize('admin'), priceController.deletePriceLog);

module.exports = router;
