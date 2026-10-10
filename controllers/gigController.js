// controllers/gigController.js
const Gig = require('../models/Gig');

// POST /api/gigs - Create a gig (freelancer only)
exports.createGig = async (req, res, next) => {
  try {
    const { title, description, price, category } = req.body;

    const gig = await Gig.create({
      title,
      description,
      price,
      category,
      freelancer: req.user.id,
    });

    res.status(201).json({
      status: 201,
      message: 'Gig created successfully!',
      gig,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/gigs - Get all gigs (public)
exports.getAllGigs = async (req, res, next) => {
  try {
    const gigs = await Gig.find()
      .populate('freelancer', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 200,
      count: gigs.length,
      gigs,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/gigs/:id - Get one gig (public)
exports.getGigById = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id).populate(
      'freelancer',
      'username email'
    );

    if (!gig) {
      return res.status(404).json({
        status: 404,
        message: 'Gig not found.',
      });
    }

    res.status(200).json({ status: 200, gig });
  } catch (err) {
    next(err);
  }
};

// PUT /api/gigs/:id - Update gig (owner only)
exports.updateGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({
        status: 404,
        message: 'Gig not found.',
      });
    }

    // Ownership check
    if (gig.freelancer.toString() !== req.user.id) {
      return res.status(403).json({
        status: 403,
        message: 'You can only update your own gigs.',
      });
    }

    const updatedGig = await Gig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 200,
      message: 'Gig updated successfully!',
      gig: updatedGig,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/gigs/:id - Delete gig (owner only)
exports.deleteGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({
        status: 404,
        message: 'Gig not found.',
      });
    }

    // Ownership check
    if (gig.freelancer.toString() !== req.user.id) {
      return res.status(403).json({
        status: 403,
        message: 'You can only delete your own gigs.',
      });
    }

    await Gig.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 200,
      message: 'Gig deleted successfully!',
    });
  } catch (err) {
    next(err);
  }
};