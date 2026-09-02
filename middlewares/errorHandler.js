const { nodeEnv } = require('../config/env');


//404 handler – call before the global error handler.

const notFound = (req, res, next) => {
  res.status(404).json({
    status: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};


//Global error handler.

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log internally (safe – server-side only)
  console.error(`[ERROR] ${new Date().toISOString()} – ${err.message}`);

  const status = err.status || err.statusCode || 500;

  const response = {
    status,
    message: status === 500 ? 'An unexpected error occurred. Please try again later.' : err.message,
  };

  // include the stack for easier debugging
  if (nodeEnv === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

module.exports = { notFound, errorHandler };
