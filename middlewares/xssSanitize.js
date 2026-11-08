// middlewares/xssSanitize.js
// Custom XSS sanitizer - removes HTML tags from all string inputs.

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const stripTags = (input) => {
  let output = '';
  let depth = 0;
  for (const ch of input) {
    if (ch === '<') {
      depth += 1;
    } else if (ch === '>') {
      if (depth > 0) depth -= 1;
    } else if (depth === 0) {
      output += ch;
    }
  }
  return output.trim();
};

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return stripTags(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !BLOCKED_KEYS.has(key))
        .map(([key, val]) => [key, sanitizeValue(val)])
    );
  }
  return value;
};

const xssSanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

module.exports = xssSanitize;
