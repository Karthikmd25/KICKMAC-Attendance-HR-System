const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    leaveType: {
      type: String,
      enum: ['CASUAL', 'SICK', 'EMERGENCY', 'OPTIONAL', 'HALF_DAY', 'OTHER'],
      required: true,
    },
    fromDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    toDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    halfDayType: {
      type: String,
      enum: ['FIRST_HALF', 'SECOND_HALF'],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    daysRequested: {
      type: Number,
      required: true,
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

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);