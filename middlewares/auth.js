// middlewares/auth.js
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { logger } = require('../config/logger');

// Verify JWT token on protected routes
const verifyToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    logger.warn('Request without token', {
      event: 'auth.token.missing', method: req.method, path: req.originalUrl.split('?')[0], ip: req.ip, requestId: req.id,
    });
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
    logger.warn('Invalid or expired token', {
      event: 'auth.token.invalid', reason: err.name, path: req.originalUrl.split('?')[0], ip: req.ip, requestId: req.id,
    });
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
      logger.warn('Access denied: wrong role', {
        event: 'access.denied', userId: req.user.id, role: req.user.role, required: roles,
        method: req.method, path: req.originalUrl.split('?')[0], ip: req.ip, requestId: req.id,
      });
      return res.status(403).json({
        status: 403,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };