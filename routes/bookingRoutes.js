// routes/bookingRoutes.js
const { Router } = require('express');
const { createBooking, getMyBookings } = require('../controllers/bookingController');
const { verifyToken, requireRole } = require('../middlewares/auth');

const router = Router();

// Client only - create booking
router.post('/', verifyToken, requireRole('client'), createBooking);

// Clients and freelancers - view own bookings
router.get('/me', verifyToken, getMyBookings);

module.exports = router;