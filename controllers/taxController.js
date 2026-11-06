// controllers/taxController.js
const User = require('../models/User');
const { calculateTax } = require('../services/taxService');

// GET /api/users/me/tax - Freelancer only
exports.getMyTax = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    const result = calculateTax(user.income || 0);

    res.status(200).json({
      status: 200,
      ...result,
      disclaimer:
        'Estimate only. Treats total income as one tax year of taxable income and applies the under-65 primary rebate. Not tax advice.',
    });
  } catch (err) {
    next(err);
  }
};
