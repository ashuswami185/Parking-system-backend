const Procurement = require('../models/Procurement');

// @desc    Get all procurements
// @route   GET /api/procurements
// @access  Private
exports.getProcurements = async (req, res) => {
  try {
    const { status, vendor, isMSE, isGeM, startDate, endDate, sort } = req.query;
    
    let query = {};

    // Filter by role
    if (req.user.role === 'vendor') {
      query.vendorId = req.user.id;
    }

    // Apply filters
    if (status) query.status = status;
    if (vendor) query.vendorName = { $regex: vendor, $options: 'i' };
    if (isMSE !== undefined) query.isMSE = isMSE === 'true';
    if (isGeM !== undefined) query.isGeM = isGeM === 'true';
    
    if (startDate || endDate) {
      query.procurementDate = {};
      if (startDate) query.procurementDate.$gte = new Date(startDate);
      if (endDate) query.procurementDate.$lte = new Date(endDate);
    }

    // Sort
    let sortOption = { procurementDate: -1 };
    if (sort === 'amount_asc') sortOption = { amount: 1 };
    if (sort === 'amount_desc') sortOption = { amount: -1 };
    if (sort === 'date_asc') sortOption = { procurementDate: 1 };

    const procurements = await Procurement.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort(sortOption);

    res.json({
      success: true,
      count: procurements.length,
      data: procurements
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single procurement
// @route   GET /api/procurements/:id
// @access  Private
exports.getProcurement = async (req, res) => {
  try {
    const procurement = await Procurement.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('vendorId', 'name email companyName');

    if (!procurement) {
      return res.status(404).json({ message: 'Procurement not found' });
    }

    // Check access
    if (req.user.role === 'vendor' && procurement.vendorId?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this procurement' });
    }

    res.json({
      success: true,
      data: procurement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create procurement
// @route   POST /api/procurements
// @access  Private (Admin, Vendor)
exports.createProcurement = async (req, res) => {
  try {
    // Generate purchase ID
    const lastProcurement = await Procurement.findOne().sort({ createdAt: -1 });
    const nextId = lastProcurement ? parseInt(lastProcurement.purchaseId.split('-')[1]) + 1 : 1;
    const purchaseId = `PRC-${String(nextId).padStart(6, '0')}`;

    const procurementData = {
      ...req.body,
      purchaseId,
      createdBy: req.user.id
    };

    // If vendor is creating, set their own vendor ID
    if (req.user.role === 'vendor') {
      procurementData.vendorId = req.user.id;
      procurementData.vendorName = req.user.companyName || req.user.name;
    }

    const procurement = await Procurement.create(procurementData);

    res.status(201).json({
      success: true,
      data: procurement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update procurement
// @route   PUT /api/procurements/:id
// @access  Private
exports.updateProcurement = async (req, res) => {
  try {
    let procurement = await Procurement.findById(req.params.id);

    if (!procurement) {
      return res.status(404).json({ message: 'Procurement not found' });
    }

    // Check access
    if (req.user.role === 'vendor' && procurement.vendorId?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this procurement' });
    }

    // Vendors can't update approved procurements
    if (req.user.role === 'vendor' && procurement.status !== 'pending') {
      return res.status(403).json({ message: 'Cannot update procurement after approval/rejection' });
    }

    procurement = await Procurement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: procurement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete procurement
// @route   DELETE /api/procurements/:id
// @access  Private (Admin only)
exports.deleteProcurement = async (req, res) => {
  try {
    const procurement = await Procurement.findById(req.params.id);

    if (!procurement) {
      return res.status(404).json({ message: 'Procurement not found' });
    }

    await procurement.deleteOne();

    res.json({
      success: true,
      message: 'Procurement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve/Reject procurement
// @route   PUT /api/procurements/:id/status
// @access  Private (Admin only)
exports.updateProcurementStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const procurement = await Procurement.findById(req.params.id);

    if (!procurement) {
      return res.status(404).json({ message: 'Procurement not found' });
    }

    procurement.status = status;
    procurement.remarks = remarks;
    procurement.approvedBy = req.user.id;
    procurement.approvalDate = Date.now();

    await procurement.save();

    res.json({
      success: true,
      data: procurement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get procurement statistics
// @route   GET /api/procurements/stats/summary
// @access  Private
exports.getProcurementStats = async (req, res) => {
  try {
    const stats = await Procurement.aggregate([
      {
        $group: {
          _id: null,
          totalProcurements: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          mseCount: {
            $sum: { $cond: ['$isMSE', 1, 0] }
          },
          mseAmount: {
            $sum: { $cond: ['$isMSE', '$amount', 0] }
          },
          gemCount: {
            $sum: { $cond: ['$isGeM', 1, 0] }
          },
          gemAmount: {
            $sum: { $cond: ['$isGeM', '$amount', 0] }
          }
        }
      }
    ]);

    // Get monthly trends
    const monthlyTrends = await Procurement.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$procurementDate' },
            month: { $month: '$procurementDate' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || {},
        monthlyTrends
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

