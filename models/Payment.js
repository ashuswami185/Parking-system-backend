const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendorName: {
    type: String,
    required: true
  },
  procurementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procurement'
  },
  invoiceNo: {
    type: String,
    required: [true, 'Please add an invoice number'],
    unique: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMode: {
    type: String,
    enum: ['bank_transfer', 'cheque', 'online', 'rtgs', 'neft'],
    required: true
  },
  transactionId: {
    type: String
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  paymentDate: {
    type: Date
  },
  dueDate: {
    type: Date,
    required: true
  },
  remarks: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentSchema.index({ paymentStatus: 1, paymentDate: -1 });
paymentSchema.index({ vendorId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

