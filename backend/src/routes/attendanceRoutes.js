const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  markLogin,
  markLogout,
  getTodayAttendance,
  markLunchOut,
  markLunchIn,
  verifyLocation,
  getMonthlyCalendar,
  getAttendanceHistory,
} = require('../controllers/attendanceController');

router.post('/login', protect, markLogin);
router.post('/logout', protect, markLogout);
router.get('/today', protect, getTodayAttendance);
router.post('/lunch-out', protect, markLunchOut);
router.post('/lunch-in', protect, markLunchIn);
router.post('/verification', protect, verifyLocation);
router.get('/calendar', protect, getMonthlyCalendar);
router.get('/history', protect, getAttendanceHistory);

module.exports = router;