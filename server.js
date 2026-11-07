const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config/env');

const authRoutes = require('./routes/authRoutes');
const gigRoutes = require('./routes/gigRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');

const { notFound, errorHandler } = require('./middlewares/errorHandler');
const xssSanitize = require('./middlewares/xssSanitize');
const requestLogger = require('./middlewares/requestLogger');
const { logger, flushLogs } = require('./config/logger');

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      config.nodeEnv === 'production'
        ? ['https://yourdomain.com']
        : [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://localhost:5000',
          ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging (method, path, status, duration - never bodies or tokens)
app.use(requestLogger);

// Request body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Input sanitisation
app.use(mongoSanitize());
app.use(xssSanitize);

// Rate limiting - every blocked request is logged as a security event
const rateLimitHandler = (limiter) => (req, res, next, options) => {
  logger.warn('Rate limit exceeded', {
    event: 'security.rate_limit', limiter, ip: req.ip, path: req.originalUrl.split('?')[0], requestId: req.id,
  });
  res.status(options.statusCode).json(options.message);
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  handler: rateLimitHandler('login'),
  message: { status: 429, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: rateLimitHandler('register'),
  message: { status: 429, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  handler: rateLimitHandler('booking'),
  message: {
    status: 429,
    message: 'Too many bookings. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 200,
    message: 'HustleHub+ API is running.',
  });
});

// API routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingLimiter, bookingRoutes);
app.use('/api/users', userRoutes);

// TEMPORARY ROUTE FOR SCREENSHOT
app.get('/api/audit-logs', async (req, res) => {
  try {
    const logs = await require('./models/AuditLog').find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Error handling
app.use(notFound);
app.use(errorHandler);

// Log fatal problems, send buffered logs to the cloud platform, then exit
const fatal = (message, meta = {}) => {
  logger.error(message, { event: 'server.fatal', ...meta });
  flushLogs().finally(() => process.exit(1));
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    event: 'process.unhandled_rejection',
    errorMessage: reason?.message || String(reason),
    stack: reason?.stack,
  });
});

process.on('uncaughtException', (err) => {
  fatal(`Uncaught exception: ${err.message}`, { stack: err.stack });
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    logger.info('Server shutting down', { event: 'server.shutdown', signal });
    flushLogs().finally(() => process.exit(0));
  });
});

// Connect to MongoDB before starting HTTPS
async function startServer() {
  try {
    // HTTPS certificate checks
    const certPath = path.join(__dirname, 'cert.pem');
    const keyPath = path.join(__dirname, 'key.pem');

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      throw new Error(
        'key.pem or cert.pem not found in project root. Generate them with: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes'
      );
    }

    const sslOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected successfully', { event: 'db.connected' });

    https.createServer(sslOptions, app).listen(config.port, () => {
      logger.info(`HustleHub+ API running on https://localhost:${config.port}`, {
        event: 'server.started',
        port: config.port,
        environment: config.nodeEnv,
      });
    });
  } catch (error) {
    fatal(`Failed to start: ${error.message}`);
  }
}

startServer();
