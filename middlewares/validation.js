// middlewares/validation.js
const { body, validationResult } = require('express-validator');

// Middleware to check validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 400,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// Registration validation
exports.registerValidation = [
  body('username')
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters.'),
  body('email')
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
    .matches(/\d/).withMessage('Password must contain a number.')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character.'),
  body('role')
    .optional()
    .isIn(['client', 'freelancer', 'admin']).withMessage('Invalid role.'),
  handleValidation,
];

// Login validation
exports.loginValidation = [
  body('email')
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.'),
  body('password')
    .notEmpty().withMessage('Password is required.'),
  handleValidation,
];