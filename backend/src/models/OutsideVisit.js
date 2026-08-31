const mongoose = require('mongoose');

const outsideVisitSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    photo: {
      type: String, // base64 data URL
    },
    reason: {
      type: String,
      enum: ['CLIENT_MEETING', 'BANK_WORK', 'DELIVERY', 'OFFICIAL_WORK', 'OTHER'],
      required: true,
    },
    notes: {
      type: String,
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

module.exports = mongoose.model('OutsideVisit', outsideVisitSchema);