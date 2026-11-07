// middlewares/requestLogger.js
// Logs one line per request (method, path, status, duration, user) - never bodies or tokens.
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../config/logger');

module.exports = (req, res, next) => {
  const start = Date.now();
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'HTTP request', {
      event: 'http.request',
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0], // query strings are not logged
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
      userId: req.user?.id,
    });
  });

  next();
};
