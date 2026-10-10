// controllers/bookingController.js
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const Gig = require('../models/Gig');
const User = require('../models/User');

// POST /api/bookings - Client books a gig
exports.createBooking = async (req, res, next) => {
  try {
    const { gigId } = req.body;

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({
        status: 404,
        message: 'Gig not found.',
      });
    }

    // Can't book your own gig
    if (gig.freelancer.toString() === req.user.id) {
      return res.status(400).json({
        status: 400,
        message: 'You cannot book your own gig.',
      });
    }

    // Create booking
    const booking = await Booking.create({
      gig: gig._id,
      client: req.user.id,
      freelancer: gig.freelancer,
      price: gig.price,
    });

    // Create transaction record
    const transaction = await Transaction.create({
      booking: booking._id,
      client: req.user.id,
      freelancer: gig.freelancer,
      amount: gig.price,
      type: 'payment',
      status: 'completed',
    });

    // Update freelancer income
    await User.findByIdAndUpdate(gig.freelancer, {
      $inc: { income: gig.price },
    });

    res.status(201).json({
      status: 201,
      message: 'Booking confirmed!',
      booking,
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/me - Get current user's bookings
exports.getMyBookings = async (req, res, next) => {
  try {
    let bookings;

    if (req.user.role === 'client') {
      bookings = await Booking.find({ client: req.user.id })
        .populate('gig', 'title price category')
        .populate('freelancer', 'username email')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'freelancer') {
      bookings = await Booking.find({ freelancer: req.user.id })
        .populate('gig', 'title price category')
        .populate('client', 'username email')
        .sort({ createdAt: -1 });
    } else {
      // Admin sees all
      bookings = await Booking.find()
        .populate('gig', 'title price')
        .populate('client', 'username email')
        .populate('freelancer', 'username email')
        .sort({ createdAt: -1 });
    }

    res.status(200).json({
      status: 200,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    next(err);
  }
};