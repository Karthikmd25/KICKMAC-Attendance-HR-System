require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const OfficeSettings = require('../models/OfficeSettings');

const seed = async () => {
  await connectDB();

  const existing = await OfficeSettings.findOne();
  if (existing) {
    console.log('Office settings already exist:', existing);
    process.exit(0);
  }

  const settings = await OfficeSettings.create({
    officeLatitude: 12.9716,   // <-- replace with your real office latitude
    officeLongitude: 77.5946,  // <-- replace with your real office longitude
    officeRadiusMeters: 200,
    maxLunchDurationMinutes: 60,
    fifteenMinuteCheckEnabled: true,
  });

  console.log('Office settings created:', settings);
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err.message);
  process.exit(1);
});