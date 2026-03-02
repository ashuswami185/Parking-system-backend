const Procurement = require('../models/Procurement');
const Payment = require('../models/Payment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    // Procurement stats
    const procurementStats = await Procurement.aggregate([
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                pending: {
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                approved: {
                  $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                },
                completed: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                }
              }
            }
          ],
          mse: [
            {
              $match: { isMSE: true }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            }
          ],
          gem: [
            {
              $match: { isGeM: true }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            }
          ],
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            },
            { $sort: { amount: -1 } },
            { $limit: 5 }
          ],
          monthly: [
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
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
          ]
        }
      }
    ]);

    // Payment stats
    const paymentStats = await Payment.aggregate([
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                pending: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
                },
                pendingAmount: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$amount', 0] }
                },
                processing: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'processing'] }, 1, 0] }
                },
                completed: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] }
                },
                completedAmount: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, '$amount', 0] }
                }
              }
            }
          ],
          overdue: [
            {
              $match: {
                paymentStatus: { $in: ['pending', 'processing'] },
                dueDate: { $lt: new Date() }
              }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            }
          ]
        }
      }
    ]);

    // User stats
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent activities
    const recentActivities = await AuditLog.find()
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        procurements: procurementStats[0],
        payments: paymentStats[0],
        users: userStats,
        recentActivities
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get MSE report
// @route   GET /api/reports/mse
// @access  Private
exports.getMSEReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.procurementDate = {};
      if (startDate) dateFilter.procurementDate.$gte = new Date(startDate);
      if (endDate) dateFilter.procurementDate.$lte = new Date(endDate);
    }

    const mseData = await Procurement.aggregate([
      {
        $match: { isMSE: true, ...dateFilter }
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                byStatus: {
                  $push: {
                    status: '$status',
                    amount: '$amount'
                  }
                }
              }
            }
          ],
          byVendor: [
            {
              $group: {
                _id: '$vendorName',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            },
            { $sort: { amount: -1 } }
          ],
          byMonth: [
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
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ]
        }
      }
    ]);

    // Calculate percentage
    const totalProcurements = await Procurement.countDocuments(dateFilter);
    const totalAmount = await Procurement.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const mseCount = mseData[0].summary[0]?.totalCount || 0;
    const mseAmount = mseData[0].summary[0]?.totalAmount || 0;

    res.json({
      success: true,
      data: {
        ...mseData[0],
        percentages: {
          count: totalProcurements ? ((mseCount / totalProcurements) * 100).toFixed(2) : 0,
          amount: totalAmount[0]?.total ? ((mseAmount / totalAmount[0].total) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get GeM report
// @route   GET /api/reports/gem
// @access  Private
exports.getGeMReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.procurementDate = {};
      if (startDate) dateFilter.procurementDate.$gte = new Date(startDate);
      if (endDate) dateFilter.procurementDate.$lte = new Date(endDate);
    }

    const gemData = await Procurement.aggregate([
      {
        $match: { isGeM: true, ...dateFilter }
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
              }
            }
          ],
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            },
            { $sort: { amount: -1 } }
          ],
          byMonth: [
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
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ]
        }
      }
    ]);

    // Calculate percentage
    const totalProcurements = await Procurement.countDocuments(dateFilter);
    const totalAmount = await Procurement.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const gemCount = gemData[0].summary[0]?.totalCount || 0;
    const gemAmount = gemData[0].summary[0]?.totalAmount || 0;

    res.json({
      success: true,
      data: {
        ...gemData[0],
        percentages: {
          count: totalProcurements ? ((gemCount / totalProcurements) * 100).toFixed(2) : 0,
          amount: totalAmount[0]?.total ? ((gemAmount / totalAmount[0].total) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get audit logs
// @route   GET /api/reports/audit-logs
// @access  Private (Admin, Auditor)
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, module, startDate, endDate, userId } = req.query;
    
    let query = {};
    
    if (action) query.action = action;
    if (module) query.module = module;
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

