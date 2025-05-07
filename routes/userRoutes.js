const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  getAllUsers,
  updateUserRole,
  deleteUserById
} = require('../controllers/userController');
const { protect, requireSuperAdmin } = require('../middlewares/auth');

// Public routes
router.post('/', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.delete('/', protect, deleteUser);


// Superadmin routes
router.put('/:id/role', protect, requireSuperAdmin, updateUserRole);
router.delete('/:id', protect, requireSuperAdmin, deleteUserById);

module.exports = router;