require('dotenv').config();
const connectDB = require('../config/db');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');

const getTodayDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const run = async () => {
  await connectDB();

  const today = getTodayDateString();
  const totalEmployees = await Employee.countDocuments({ isActive: true });
  const loggedInCount = await Attendance.countDocuments({ date: today, loginTime: { $exists: true } });

  const notification = await Notification.create({
    type: 'MORNING_ATTENDANCE_REPORT',
    message: `${loggedInCount} of ${totalEmployees} employees have logged in as of 9:15 AM. (TEST - Sunday bypass)`,
    data: { date: today, loggedInCount, totalEmployees },
    forRole: 'admin',
  });

  console.log('Test notification created:', notification.message);
  process.exit(0);
};

run().catch((err) => {
  console.error('Test error:', err.message);
  process.exit(1);
});