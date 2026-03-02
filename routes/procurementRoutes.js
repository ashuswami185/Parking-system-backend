const express = require('express');
const router = express.Router();
const {
  getProcurements,
  getProcurement,
  createProcurement,
  updateProcurement,
  deleteProcurement,
  updateProcurementStatus,
  getProcurementStats
} = require('../controllers/procurementController');
const { protect, authorize } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

router.use(protect);

router.route('/')
  .get(getProcurements)
  .post(
    authorize('admin', 'vendor'),
    auditLogger('create_procurement', 'procurement'),
    createProcurement
  );

router.get('/stats/summary', getProcurementStats);

router.route('/:id')
  .get(getProcurement)
  .put(
    authorize('admin', 'vendor'),
    auditLogger('update_procurement', 'procurement'),
    updateProcurement
  )
  .delete(
    authorize('admin'),
    auditLogger('delete_procurement', 'procurement'),
    deleteProcurement
  );

router.put('/:id/status',
  authorize('admin'),
  auditLogger('approve_procurement', 'procurement'),
  updateProcurementStatus
);

module.exports = router;

