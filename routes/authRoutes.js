const { Router } = require('express');
const { register, login, me } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middlewares/validation');
const { verifyToken } = require('../middlewares/auth');

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected route – JWT required
router.get('/me', verifyToken, me);

module.exports = router;
