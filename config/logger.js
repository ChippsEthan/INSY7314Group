// config/logger.js
// Central Winston logger. Writes to the console, to local files (logs/) and,
// when configured, to Better Stack (cloud log platform).
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const config = require('./env');
const { redact } = require('./logSanitiser');

const isTest = config.nodeEnv === 'test';

// Redact secrets from every log entry before it reaches any transport
const redactFormat = winston.format((info) => {
  const skip = new Set(['level', 'message', 'timestamp']);
  for (const key of Object.keys(info)) {
    if (!skip.has(key)) info[key] = redact({ [key]: info[key] })[key];
  }
  if (typeof info.message === 'string') info.message = redact(info.message);
  return info;
})();

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redactFormat
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${message}${extra}`;
  })
);

const transports = [
  new winston.transports.Console({ format: consoleFormat, silent: isTest }),
];

if (!isTest) {
  const logDir = path.join(__dirname, '..', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const fileFormat = winston.format.json();

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    })
  );
}

// Cloud logging (Better Stack) - only enabled when both values are set in .env
let logtail = null;
if (!isTest && config.betterStackToken && config.betterStackHost) {
  try {
    const { Logtail } = require('@logtail/node');
    const { LogtailTransport } = require('@logtail/winston');
    logtail = new Logtail(config.betterStackToken, {
      endpoint: `https://${config.betterStackHost}`,
    });
    transports.push(new LogtailTransport(logtail));
  } catch (err) {
    console.warn('[LOGGER] Better Stack packages not installed, cloud logging disabled:', err.message);
  }
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: baseFormat,
  defaultMeta: { service: 'hustlehub-api' },
  transports,
});

// Send any buffered logs to the cloud platform (call before the process exits)
async function flushLogs() {
  if (!logtail) return;
  try {
    await logtail.flush();
  } catch (err) {
    // never let logging break shutdown
  }
}

module.exports = { logger, flushLogs, cloudLoggingEnabled: Boolean(logtail) };
