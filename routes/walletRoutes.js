const express = require('express');
const router = express.Router();
const { getWalletBalance } = require('../controllers/walletController');
const { protect } = require('../middlewares/auth');

// Protected route - requires authentication
router.get('/balance', protect, getWalletBalance);

module.exports = router;