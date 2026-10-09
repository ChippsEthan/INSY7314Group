// middlewares/auth.js
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

// Verify JWT token on protected routes
const verifyToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({
      status: 401,
      message: 'No token provided. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({
      status: 401,
      message: 'Invalid or expired token.',
    });
  }
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 403,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };