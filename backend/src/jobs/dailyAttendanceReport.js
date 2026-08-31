const cron = require('node-cron');
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

const isSunday = () => new Date().getDay() === 0;

const createMorningReport = async () => {
  if (isSunday()) {
    console.log('[Cron] Skipped morning report — Sunday (holiday)');
    return;
  }

  const today = getTodayDateString();
  const totalEmployees = await Employee.countDocuments({ isActive: true });
  const loggedInCount = await Attendance.countDocuments({ date: today, loginTime: { $exists: true } });

  await Notification.create({
    type: 'MORNING_ATTENDANCE_REPORT',
    message: `${loggedInCount} of ${totalEmployees} employees have logged in as of 9:15 AM.`,
    data: { date: today, loggedInCount, totalEmployees },
    forRole: 'admin',
  });

  console.log(`[Cron] Morning report created: ${loggedInCount}/${totalEmployees} logged in`);
};

const createEveningReport = async () => {
  if (isSunday()) {
    console.log('[Cron] Skipped evening report — Sunday (holiday)');
    return;
  }

  const today = getTodayDateString();
  const totalEmployees = await Employee.countDocuments({ isActive: true });
  const loggedOutCount = await Attendance.countDocuments({ date: today, logoutTime: { $exists: true } });

  await Notification.create({
    type: 'EVENING_ATTENDANCE_REPORT',
    message: `${loggedOutCount} of ${totalEmployees} employees have logged out as of 6:15 PM.`,
    data: { date: today, loggedOutCount, totalEmployees },
    forRole: 'admin',
  });

  console.log(`[Cron] Evening report created: ${loggedOutCount}/${totalEmployees} logged out`);
};

const startScheduledJobs = () => {
  // Runs at 9:15 AM every day (server local time) — job itself skips Sundays
  cron.schedule('15 9 * * *', createMorningReport);

  // Runs at 6:15 PM every day (server local time) — job itself skips Sundays
  cron.schedule('15 18 * * *', createEveningReport);

  console.log('Scheduled attendance report jobs started (9:15 AM & 6:15 PM daily, auto-skips Sunday)');
};

module.exports = { startScheduledJobs, createMorningReport, createEveningReport };