require('dotenv').config();
const connectDB = require('../config/db');
const OfficeSettings = require('../models/OfficeSettings');

const run = async () => {
  await connectDB();

  const settings = await OfficeSettings.findOne();
  if (!settings) {
    console.log('No office settings found — run seed:office first');
    process.exit(1);
  }

  settings.officeLatitude = 13.0363813;
  settings.officeLongitude = 77.5133386;
  settings.officeRadiusMeters = 200;

  await settings.save();

  console.log('Office location updated:', settings);
  process.exit(0);
};

run().catch((err) => {
  console.error('Update error:', err.message);
  process.exit(1);
});