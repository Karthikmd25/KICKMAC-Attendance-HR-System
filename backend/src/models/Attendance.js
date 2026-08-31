const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      // Stored as YYYY-MM-DD string for easy uniqueness/querying per day
      type: String,
      required: true,
    },

    // Login
    loginTime: { type: Date },
    loginLatitude: { type: Number },
    loginLongitude: { type: Number },
    loginAccuracy: { type: Number },
    loginLocationStatus: {
      type: String,
      enum: ['VERIFIED', 'OUT_OF_RANGE', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    loginPhoto: { type: String }, // URL/path to stored photo, added later

    // Logout
    logoutTime: { type: Date },
    logoutLatitude: { type: Number },
    logoutLongitude: { type: Number },
    logoutAccuracy: { type: Number },
    logoutLocationStatus: {
      type: String,
      enum: ['VERIFIED', 'OUT_OF_RANGE', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    logoutPhoto: { type: String },

    // Lunch
    lunchOut: { type: Date },
    lunchOutLatitude: { type: Number },
    lunchOutLongitude: { type: Number },
    lunchOutAccuracy: { type: Number },
    lunchIn: { type: Date },
    lunchInLatitude: { type: Number },
    lunchInLongitude: { type: Number },
    lunchInAccuracy: { type: Number },
    lunchDurationMinutes: { type: Number },

       // 15-minute check
    fifteenMinuteCheck: {
      requiredAt: { type: Date },
      completed: { type: Boolean, default: false },
      gpsVerified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      latitude: { type: Number },
      longitude: { type: Number },
      photo: { type: String },
      status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'MISSED'],
        default: 'PENDING',
      },
    },

    workingHours: { type: Number, default: 0 }, // in hours, e.g. 8.5

    attendanceStatus: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'LATE'],
      default: 'ABSENT',
    },
  },
  { timestamps: true }
);

// One attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);