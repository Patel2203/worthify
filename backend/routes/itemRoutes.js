const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// All routes require authentication
router.use(authenticate);

// Create item (Registered users only)
router.post('/', authorize('user', 'admin'), upload.single('image'), itemController.createItem);

// Get all items (Users see their own, Admin sees all)
router.get('/', itemController.getAllItems);

// Get user's items (must come before /:id to avoid conflicts)
router.get('/user/:userId?', itemController.getUserItems);

// Search for similar items using Google Lens (reverse image search)
router.post('/search-similar', authorize('user', 'admin'), upload.single('image'), itemController.searchSimilarItems);

// Get single item by ID
router.get('/:id', itemController.getItemById);

// Update item (Owner or Admin)
router.put('/:id', authorize('user', 'admin'), itemController.updateItem);

// Delete item (Owner or Admin)
router.delete('/:id', authorize('user', 'admin'), itemController.deleteItem);

module.exports = router;
