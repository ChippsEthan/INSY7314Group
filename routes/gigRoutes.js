// routes/gigRoutes.js
const { Router } = require('express');
const {
  createGig,
  getAllGigs,
  getGigById,
  updateGig,
  deleteGig,
} = require('../controllers/gigController');
const { verifyToken, requireRole } = require('../middlewares/auth');

const router = Router();

// Public routes
router.get('/', getAllGigs);
router.get('/:id', getGigById);

// Protected routes (freelancers only)
router.post('/', verifyToken, requireRole('freelancer'), createGig);
router.put('/:id', verifyToken, requireRole('freelancer'), updateGig);
router.delete('/:id', verifyToken, requireRole('freelancer'), deleteGig);

module.exports = router;