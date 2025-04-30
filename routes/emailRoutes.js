const express = require('express');
const router = express.Router();
const {
  sendUserEmail,
  getUserEmails,
  getEmailById
} = require('../controllers/emailController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.post('/', sendUserEmail);
router.get('/', getUserEmails);
router.get('/:id', getEmailById);

module.exports = router;