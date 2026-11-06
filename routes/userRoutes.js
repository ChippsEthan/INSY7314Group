// routes/userRoutes.js
const { Router } = require('express');
const { getMyIncome } = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { getMyTax } = require('../controllers/taxController');

const router = Router();

// Freelancer only - view income
router.get('/me/income', verifyToken, requireRole('freelancer'), getMyIncome);
// Freelancer only - view tax
router.get('/me/tax', verifyToken, requireRole('freelancer'), getMyTax);

module.exports = router;