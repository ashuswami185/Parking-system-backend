const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'create_procurement', 'update_procurement', 
      'delete_procurement', 'approve_procurement', 'reject_procurement',
      'create_payment', 'update_payment', 'delete_payment', 
      'create_user', 'update_user', 'delete_user',
      'export_data', 'import_data', 'generate_report',
      'password_reset_request', 'password_reset'
    ]
  },
  module: {
    type: String,
    required: true,
    enum: ['auth', 'procurement', 'payment', 'user', 'report']
  },
  details: {
    type: String
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ipAddress: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

