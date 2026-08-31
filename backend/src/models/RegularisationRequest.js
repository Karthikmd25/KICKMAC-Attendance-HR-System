const mongoose = require('mongoose');

const regularisationRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD — the attendance date being corrected
      required: true,
    },
    requestedLoginTime: {
      type: String, // e.g. "09:35" (24hr HH:mm)
    },
    requestedLogoutTime: {
      type: String, // e.g. "18:30"
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RegularisationRequest', regularisationRequestSchema);