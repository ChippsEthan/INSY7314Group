// middlewares/xssSanitize.js
// Custom XSS sanitizer - removes HTML tags from all string inputs

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    // Remove any HTML tags
    return value.replace(/<[^>]*>/g, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }
  return value;
};

const xssSanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

module.exports = xssSanitize;