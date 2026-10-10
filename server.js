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

// Request body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Input sanitisation
app.use(mongoSanitize());
app.use(xssSanitize);

// Rate limiting
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

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 200,
    message: 'HustleHub+ API is running.',
  });
});

// API routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingLimiter, bookingRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// HTTPS certificate checks
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('[SERVER] FATAL: key.pem or cert.pem not found in project root.');
  console.error(
    '[SERVER] Generate them with: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes'
  );
  process.exit(1);
}

const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

// Connect to MongoDB before starting HTTPS
async function startServer() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[DB] MongoDB connected successfully.');

    https.createServer(sslOptions, app).listen(config.port, () => {
      console.log(
        `[SERVER] HustleHub+ API running on https://localhost:${config.port}`
      );
      console.log(`[SERVER] Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start:', error.message);
    process.exit(1);
  }
}

startServer();