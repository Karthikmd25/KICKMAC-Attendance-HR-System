require('dotenv').config();
const connectDB = require('../config/db');
const Notification = require('../models/Notification');

const run = async () => {
  await connectDB();

  const result = await Notification.deleteMany({ message: { $regex: 'TEST' } });
  console.log(`Deleted ${result.deletedCount} test notification(s)`);

  process.exit(0);
};

run().catch((err) => {
  console.error('Cleanup error:', err.message);
  process.exit(1);
});