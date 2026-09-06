const { body, validationResult } = require('express-validator');


//Runs express-validator checks and short-circuits with 400 if any fail.
//Call this as the LAST middleware in a validation chain.

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 400,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Registration rules 
const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters.')
    .isAlphanumeric().withMessage('Username must contain only letters and numbers.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),

  body('role')
    .optional()
    .isIn(['client', 'freelancer']).withMessage('Role must be either "client" or "freelancer".'),

  handleValidationErrors,
];

// Login rules
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),

  handleValidationErrors,
];

module.exports = { registerValidation, loginValidation };
