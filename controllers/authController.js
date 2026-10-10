// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret, saltRounds } = require('../config/env');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    // Duplicate email check
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 400,
        message: 'An account with this email address already exists.',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'client',
    });

    console.log(`[AUTH] New user registered: ${newUser.email} (role: ${newUser.role})`);

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

    const user = await User.findOne({ email });

    const invalidCredentials = {
      status: 401,
      message: 'Invalid email or password.',
    };

    if (!user) {
      return res.status(401).json(invalidCredentials);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.warn(`[AUTH] Failed login attempt for: ${email}`);
      return res.status(401).json(invalidCredentials);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      jwtSecret,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    console.log(`[AUTH] Successful login: ${user.email}`);

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