// server.js
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

// ==========================
// CONNECT TO MONGODB
// ==========================
mongoose
  .connect(config.mongoUri)
  .then(() => console.log('[DB] ✅ MongoDB connected successfully!'))
  .catch((err) => {
    console.error('[DB] ❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ==========================
// INITIALISE EXPRESS
// ==========================
const app = express();

// Trust proxy (so rate-limit sees real IP)
app.set('trust proxy', 1);

// ==========================
// SECURITY MIDDLEWARE
// ==========================

// Helmet with Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// CORS - allow React frontend
app.use(
  cors({
    origin:
      config.nodeEnv === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:5173', 'https://localhost:5000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body parsers (limit payload size)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Sanitize inputs against NoSQL injection ($ and . in keys)
app.use(mongoSanitize());

// Sanitize inputs against XSS (script tags)
app.use(xssSanitize);

// ==========================
// RATE LIMITERS
// ==========================

// Auth limiter - 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking limiter - 10 bookings per hour
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    status: 429,
    message: 'Too many bookings. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================
// ROUTES
// ==========================

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 200, message: 'HustleHub+ API is running.' });
});

// Auth routes (with rate limiting)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);

// Gig routes
app.use('/api/gigs', gigRoutes);

// Booking routes (with rate limiting)
app.use('/api/bookings', bookingLimiter, bookingRoutes);

// User routes (income tracking)
app.use('/api/users', userRoutes);

// ==========================
// ERROR HANDLING
// ==========================
app.use(notFound);
app.use(errorHandler);

// ==========================
// START HTTPS SERVER
// ==========================
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
};

https.createServer(httpsOptions, app).listen(config.port, () => {
  console.log(`[SERVER] HustleHub+ API running on https://localhost:${config.port}`);
  console.log(`[SERVER] Environment: ${config.nodeEnv}`);
});