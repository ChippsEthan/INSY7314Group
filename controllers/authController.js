// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret, saltRounds } = require('../config/env');
const { logger } = require('../config/logger');
const { maskEmail } = require('../config/logSanitiser');
const { logEvent } = require('../utils/auditLogger'); // ADDED

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({ email: { $eq: email } });
    if (existingUser) {
      logger.warn('Registration rejected: email already exists', {
        event: 'auth.register.duplicate', email: maskEmail(email), ip: req.ip, requestId: req.id,
      });
      return res.status(400).json({
        status: 400,
        message: 'An account with this email address already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'client',
    });

    logger.info('New user registered', {
      event: 'auth.register.success', userId: newUser._id.toString(), role: newUser.role,
      email: maskEmail(newUser.email), ip: req.ip, requestId: req.id,
    });

    return res.status(201).json({
      status: 201,
      message: 'Registration successful.',
      user: newUser.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: { $eq: email } });

    const invalidCredentials = {
      status: 401,
      message: 'Invalid email or password.',
    };

    if (!user) {
      logger.warn('Failed login attempt', {
        event: 'auth.login.failed', reason: 'unknown_email', email: maskEmail(email), ip: req.ip, requestId: req.id,
      });
      return res.status(401).json(invalidCredentials);
    }

    //NEW: ACCOUNT LOCKOUT CHECK
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      const minsLeft = Math.ceil((user.lockoutUntil - Date.now()) / 60000);
      logger.warn('Login rejected: account locked', {
        event: 'auth.login.locked', userId: user._id.toString(), email: maskEmail(email), ip: req.ip, requestId: req.id,
      });
      return res.status(429).json({ 
        status: 429,
        message: `Account is temporarily locked. Try again in ${minsLeft} minutes.` 
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      //NEW: INCREMENT FAILED ATTEMPTS
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 mins
      }
      await user.save();

      // Log the audit event
      await logEvent('USER_LOGIN_FAILED', user._id, req, { email: maskEmail(email), attempts: user.failedLoginAttempts });

      logger.warn('Failed login attempt', {
        event: 'auth.login.failed', reason: 'wrong_password', userId: user._id.toString(),
        email: maskEmail(email), ip: req.ip, requestId: req.id,
      });
      return res.status(401).json(invalidCredentials);
    }

    //NEW: RESET FAILED ATTEMPTS ON SUCCESS
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      jwtSecret,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    // Log the audit event
    await logEvent('USER_LOGIN_SUCCESS', user._id, req, { role: user.role });

    logger.info('Successful login', {
      event: 'auth.login.success', userId: user._id.toString(), role: user.role,
      email: maskEmail(user.email), ip: req.ip, requestId: req.id,
    });

    return res.status(200).json({
      status: 200,
      message: 'Login successful.',
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me (protected)
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    return res.status(200).json({
      status: 200,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
