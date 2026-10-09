// middlewares/errorHandler.js

// Global error handler - NO stack traces exposed
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  // Log for debugging (server-side only)
  console.error(`[ERROR] ${status} - ${message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Send clean response (NO stack traces!)
  res.status(status).json({
    status,
    message,
  });
};

// 404 handler
const notFound = (req, res) => {
  res.status(404).json({
    status: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { errorHandler, notFound };