// routes/userRoutes.js
const { Router } = require('express');
const { getMyIncome } = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middlewares/auth');

const router = Router();

// Freelancer only - view income
router.get('/me/income', verifyToken, requireRole('freelancer'), getMyIncome);

module.exports = router;