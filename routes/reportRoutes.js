const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getMSEReport,
  getGeMReport,
  getAuditLogs
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/mse', getMSEReport);
router.get('/gem', getGeMReport);
router.get('/audit-logs', authorize('admin', 'auditor'), getAuditLogs);

module.exports = router;

