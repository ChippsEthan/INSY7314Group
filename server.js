const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Security Middleware 

// Helmet sets secure HTTP response headers (XSS protection, no-sniff, etc.)
app.use(helmet());

// CORS – restrict to known origins in production; open for local dev
app.use(
  cors({
    origin: config.nodeEnv === 'production' ? ['https://yourdomain.com'] : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsing 
app.use(express.json({ limit: '10kb' }));       // Limit payload size to mitigate DoS
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Health Check 
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 200, message: 'HustleHub+ API is running.' });
});

// RRoutes
app.use('/api/auth', authRoutes);

// Error Handling 
app.use(notFound);
app.use(errorHandler);

// HTTPS Server 
// Generate self-signed certs with:
//   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
const certPath = path.join(__dirname, 'cert.pem');
const keyPath  = path.join(__dirname, 'key.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('[SERVER] FATAL: key.pem or cert.pem not found in project root.');
  console.error('[SERVER] Generate them with: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
  process.exit(1);
}

const sslOptions = {
  key:  fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

https.createServer(sslOptions, app).listen(config.port, () => {
  console.log(`[SERVER] HustleHub+ API running on https://localhost:${config.port}`);
  console.log(`[SERVER] Environment: ${config.nodeEnv}`);
});
