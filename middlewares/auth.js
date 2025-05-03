const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Authentication middleware to protect routes
 * Verifies JWT token from cookies or authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
module.exports.protect = async (req, res, next) => {
  console.log('Cookies:', req.cookies);
  console.log('Headers:', req.headers);

  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - User not found' });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};
