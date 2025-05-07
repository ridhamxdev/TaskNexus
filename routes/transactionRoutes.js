const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  getDailyDeductionBatches,
  getBatchTransactions,
  getUserTransactions,
  getUserTransactionsByAdmin,
  createTransaction
} = require('../controllers/transactionController');
const { protect, requireSuperAdmin } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Regular user routes
router.get('/', getUserTransactions);
router.post('/', createTransaction);

// Superadmin routes
router.get('/admin/all', requireSuperAdmin, getAllTransactions);
router.get('/admin/daily-batches', requireSuperAdmin, getDailyDeductionBatches);
router.get('/admin/batch/:batchId', requireSuperAdmin, getBatchTransactions);
router.get('/admin/user/:userId', requireSuperAdmin, getUserTransactionsByAdmin);

module.exports = router;