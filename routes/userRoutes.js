const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  getAllUsers
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');

router.route('/')
  .post(registerUser)
  .get(getAllUsers);

router.route('/login') 
  .post(loginUser);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/')
  .delete(protect, deleteUser);

module.exports = router;