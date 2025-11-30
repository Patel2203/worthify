const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate);

// Get all users (Admin only)
router.get('/', authorize('admin'), userController.getAllUsers);

// Get user stats
router.get('/stats/:userId?', userController.getUserStats);

// Get user by ID (Admin only)
router.get('/:id', authorize('admin'), userController.getUserById);

// Update user role (Admin only)
router.put('/:id/role', authorize('admin'), userController.updateUserRole);

// Delete user (Admin only)
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;
