const { logger } = require('../config/logger');


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
  // An invalid ObjectId (e.g. /api/gigs/not-a-valid-id) is the client's mistake, not a server fault
  const isBadId = err.name === 'CastError';
  const status = isBadId ? 400 : err.status || err.statusCode || 500;

  // Full details (including the stack) stay in the server-side log only
  logger.log(status >= 500 ? 'error' : 'warn', 'Request failed', {
    event: 'error',
    errorMessage: err.message,
    stack: err.stack,
    status,
    method: req.method,
    path: req.originalUrl.split('?')[0],
    userId: req.user?.id,
    requestId: req.id,
  });

  // The client only ever receives a safe, generic message - never a stack trace or internals
  let message = err.message;
  if (status === 500) message = 'An unexpected error occurred. Please try again later.';
  if (isBadId) message = 'Invalid ID format.';

  res.status(status).json({ status, message });
};

module.exports = { notFound, errorHandler };