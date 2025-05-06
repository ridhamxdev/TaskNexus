const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Basic authentication middleware
module.exports.protect = async (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user by primary key (id)
    const user = await User.findByPk(decoded.pk);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - User not found' });
    }

    // Add user and decoded token data to request
    req.user = user;
    req.token = decoded;
    
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};

// Role-based middleware for superadmin access
module.exports.requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden - Requires superadmin privileges' });
  }
  next();
};
