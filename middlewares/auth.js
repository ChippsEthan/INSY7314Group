const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { findById } = require('../models/User');


//Protects routes by verifying the JWT in the Authorization header.
//Attaches the decoded user payload to req.user on success.
 
//Expected header:  Authorization: Bearer <token>

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 401,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);

    // Confirm the user exists
    const user = findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 401,
        message: 'Token is valid but the associated user no longer exists.',
      });
    }

    // Attach minimal payload to request
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 401, message: 'Token has expired.' });
    }
    return res.status(401).json({ status: 401, message: 'Invalid token.' });
  }
};


//Role-based access guard. Use after verifyToken.
//Usage:  router.get('/admin', verifyToken, requireRole('admin'), handler)

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      status: 403,
      message: 'Forbidden. You do not have permission to access this resource.',
    });
  }
  next();
};

module.exports = { verifyToken, requireRole };
