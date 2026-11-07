// utils/auditLogger.js
const AuditLog = require('../models/AuditLog');

exports.logEvent = async (action, userId, req, details = {}) => {
  try {
    await AuditLog.create({
      action,
      userId,
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      details,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};