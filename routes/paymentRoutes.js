const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  updatePaymentStatus,
  getPaymentStats
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(
    authorize('admin'),
    auditLogger('create_payment', 'payment'),
    createPayment
  );

router.get('/stats/summary', getPaymentStats);

router.route('/:id')
  .get(getPayment)
  .put(
    authorize('admin'),
    auditLogger('update_payment', 'payment'),
    updatePayment
  )
  .delete(
    authorize('admin'),
    auditLogger('delete_payment', 'payment'),
    deletePayment
  );

router.put('/:id/status',
  authorize('admin'),
  auditLogger('update_payment', 'payment'),
  updatePaymentStatus
);

module.exports = router;

