const mongoose = require('mongoose');

const officeSettingsSchema = new mongoose.Schema(
  {
    officeLatitude: { type: Number, required: true },
    officeLongitude: { type: Number, required: true },
    officeRadiusMeters: { type: Number, required: true, default: 200 },
    maxLunchDurationMinutes: { type: Number, default: 60 },
    fifteenMinuteCheckEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OfficeSettings', officeSettingsSchema);