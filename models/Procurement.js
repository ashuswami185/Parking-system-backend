const mongoose = require('mongoose');

const procurementSchema = new mongoose.Schema({
  purchaseId: {
    type: String,
    required: true,
    unique: true
  },
  itemName: {
    type: String,
    required: [true, 'Please add an item name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  vendorName: {
    type: String,
    required: [true, 'Please add a vendor name']
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  category: {
    type: String,
    required: true
  },
  isMSE: {
    type: Boolean,
    default: false
  },
  isGeM: {
    type: Boolean,
    default: false
  },
  gemOrderId: {
    type: String
  },
  procurementDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  deliveryDate: {
    type: Date
  },
  remarks: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
procurementSchema.index({ status: 1, procurementDate: -1 });
procurementSchema.index({ vendorId: 1 });
procurementSchema.index({ isMSE: 1, isGeM: 1 });

module.exports = mongoose.model('Procurement', procurementSchema);

