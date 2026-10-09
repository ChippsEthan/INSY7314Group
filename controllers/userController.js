// controllers/userController.js
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// GET /api/users/me/income - Freelancer only
exports.getMyIncome = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    const transactions = await Transaction.find({ freelancer: req.user.id })
      .populate('client', 'username email')
      .populate('booking', 'price status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 200,
      totalIncome: user.income || 0,
      transactionCount: transactions.length,
      transactions,
    });
  } catch (err) {
    next(err);
  }
};