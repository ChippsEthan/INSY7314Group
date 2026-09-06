require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  jwtSecret: process.env.JWT_SECRET,
  saltRounds: parseInt(process.env.SALT_ROUNDS, 10) || 10,
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Fail if env vars missing
if (!config.jwtSecret) {
  console.error('[CONFIG] FATAL: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

if (config.jwtSecret.length < 32) {
  console.warn('[CONFIG] WARNING: JWT_SECRET should be at least 32 characters long.');
}

module.exports = config;
