const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getVendors
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

router.use(protect);

router.get('/vendors/list', getVendors);

router.route('/')
  .get(authorize('admin'), getUsers)
  .post(
    authorize('admin'),
    auditLogger('create_user', 'user'),
    createUser
  );

router.route('/:id')
  .get(authorize('admin'), getUser)
  .put(
    authorize('admin'),
    auditLogger('update_user', 'user'),
    updateUser
  )
  .delete(
    authorize('admin'),
    auditLogger('delete_user', 'user'),
    deleteUser
  );

router.put('/:id/toggle-status',
  authorize('admin'),
  auditLogger('update_user', 'user'),
  toggleUserStatus
);

module.exports = router;

