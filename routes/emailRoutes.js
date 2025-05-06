const express = require('express');
const router = express.Router();
const {
  sendUserEmail,
  getUserEmails,
  getEmailById,
  getUserEmailsByAdmin,
  getAllEmails
} = require('../controllers/emailController');
const { protect, requireSuperAdmin } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Regular user routes
router.post('/', sendUserEmail);
router.get('/', getUserEmails);
router.get('/:id', getEmailById);

// Superadmin routes
router.get('/admin/all', requireSuperAdmin, getAllEmails);
router.get('/admin/user/:userId', requireSuperAdmin, getUserEmailsByAdmin);

module.exports = router;