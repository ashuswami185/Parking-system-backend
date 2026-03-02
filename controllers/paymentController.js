const Payment = require('../models/Payment');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
exports.getPayments = async (req, res) => {
  try {
    const { status, vendor, startDate, endDate, sort } = req.query;
    
    let query = {};

    // Filter by role
    if (req.user.role === 'vendor') {
      query.vendorId = req.user.id;
    }

    // Apply filters
    if (status) query.paymentStatus = status;
    if (vendor) query.vendorName = { $regex: vendor, $options: 'i' };
    
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    // Sort
    let sortOption = { createdAt: -1 };
    if (sort === 'amount_asc') sortOption = { amount: 1 };
    if (sort === 'amount_desc') sortOption = { amount: -1 };
    if (sort === 'date_asc') sortOption = { paymentDate: 1 };

    const payments = await Payment.find(query)
      .populate('vendorId', 'name email companyName')
      .populate('procurementId', 'purchaseId itemName')
      .populate('createdBy', 'name email')
      .populate('processedBy', 'name email')
      .sort(sortOption);

    res.json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('vendorId', 'name email companyName')
      .populate('procurementId', 'purchaseId itemName')
      .populate('createdBy', 'name email')
      .populate('processedBy', 'name email');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check access
    if (req.user.role === 'vendor' && payment.vendorId?._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this payment' });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create payment
// @route   POST /api/payments
// @access  Private (Admin only)
exports.createPayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      createdBy: req.user.id
    };

    const payment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private (Admin only)
exports.updatePayment = async (req, res) => {
  try {
    let payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private (Admin only)
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await payment.deleteOne();

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id/status
// @access  Private (Admin only)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, transactionId, remarks } = req.body;

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.paymentStatus = paymentStatus;
    if (transactionId) payment.transactionId = transactionId;
    if (remarks) payment.remarks = remarks;
    payment.processedBy = req.user.id;
    
    if (paymentStatus === 'completed') {
      payment.paymentDate = Date.now();
    }

    await payment.save();

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats/summary
// @access  Private
exports.getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$amount', 0] }
          },
          processingCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'processing'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] }
          },
          completedAmount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, '$amount', 0] }
          }
        }
      }
    ]);

    // Get overdue payments
    const overduePayments = await Payment.countDocuments({
      paymentStatus: { $in: ['pending', 'processing'] },
      dueDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      data: {
        summary: stats[0] || {},
        overduePayments
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

