const Attendance = require('../models/Attendance');
const OfficeSettings = require('../models/OfficeSettings');
const { checkLocationStatus, getDistanceInMeters } = require('../utils/geofence');

// Helper: get today's date as YYYY-MM-DD (server's local date)
const getTodayDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getEmployeeId = (req) => req.user.employee?._id;

const getVerificationIntervalMs = () => {
  if (process.env.NODE_ENV === 'production') return 15 * 60 * 1000;
  const configuredSeconds = Number(process.env.ATTENDANCE_VERIFICATION_INTERVAL_SECONDS);
  const seconds = Number.isFinite(configuredSeconds) && configuredSeconds > 0 ? configuredSeconds : 900;
  return seconds * 1000;
};

const setVerificationSchedule = (attendance) => {
  if (!attendance.fifteenMinuteCheck) attendance.fifteenMinuteCheck = {};
  if (attendance.loginTime) {
    const requiredAt = new Date(attendance.loginTime.getTime() + getVerificationIntervalMs());
    if (!attendance.fifteenMinuteCheck.requiredAt || attendance.fifteenMinuteCheck.requiredAt.getTime() !== requiredAt.getTime()) {
      attendance.fifteenMinuteCheck.requiredAt = requiredAt;
    }
  }
  return attendance;
};

const getCoordinates = (body) => {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || accuracy < 0 || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude, accuracy };
};

const getLocationOrReject = async (latitude, longitude, res, outOfRangeMessage = 'You are outside the permitted office location.') => {
  const officeSettings = await OfficeSettings.findOne();
  const locationStatus = checkLocationStatus(latitude, longitude, officeSettings);
  if (locationStatus === 'OUT_OF_RANGE') {
    res.status(403).json({ message: outOfRangeMessage, locationStatus });
    return null;
  }
  if (locationStatus === 'UNKNOWN') {
    res.status(503).json({ message: 'Office location is not configured.', locationStatus });
    return null;
  }
  return locationStatus;
};

// @desc Employee login (attendance)
// @route POST /api/attendance/login
exports.markLogin = async (req, res) => {
  try {
    const coordinates = getCoordinates(req.body);
    if (!coordinates) {
      return res.status(400).json({ message: 'GPS latitude and longitude are required' });
    }
    const { latitude, longitude } = coordinates;

    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const today = getTodayDateString();

    const existing = await Attendance.findOne({ employee: employeeId, date: today });
    if (existing && existing.loginTime) {
      return res.status(400).json({ message: "Today's login has already been recorded." });
    }

    const locationStatus = await getLocationOrReject(latitude, longitude, res);
    if (!locationStatus) return;

    let attendance;
    const loginTime = new Date();
    if (existing) {
      existing.loginTime = loginTime;
      existing.loginLatitude = latitude;
      existing.loginLongitude = longitude;
      existing.loginAccuracy = coordinates.accuracy;
      existing.loginLocationStatus = locationStatus;
      existing.attendanceStatus = 'PRESENT';
      existing.fifteenMinuteCheck.requiredAt = new Date(loginTime.getTime() + getVerificationIntervalMs());
      existing.fifteenMinuteCheck.completed = false;
      existing.fifteenMinuteCheck.gpsVerified = false;
      attendance = await existing.save();
    } else {
      attendance = await Attendance.create({
        employee: employeeId,
        date: today,
        loginTime,
        loginLatitude: latitude,
        loginLongitude: longitude,
        loginAccuracy: coordinates.accuracy,
        loginLocationStatus: locationStatus,
        attendanceStatus: 'PRESENT',
        fifteenMinuteCheck: {
          requiredAt: new Date(loginTime.getTime() + getVerificationIntervalMs()),
          status: 'PENDING',
          completed: false,
          gpsVerified: false,
        },
      });
    }

    res.status(201).json({
      message: 'Attendance marked successfully',
      locationStatus,
      attendance,
    });
  } catch (error) {
    console.error('Attendance login error:', error.message);
    res.status(500).json({ message: 'Server error while recording login' });
  }
};

// @desc Employee logout (attendance)
// @route POST /api/attendance/logout
exports.markLogout = async (req, res) => {
  try {
    const coordinates = getCoordinates(req.body);
    if (!coordinates) {
      return res.status(400).json({ message: 'GPS latitude and longitude are required' });
    }
    const { latitude, longitude } = coordinates;

    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const today = getTodayDateString();


    const existing = await Attendance.findOne({ employee: employeeId, date: today });
    if (!existing || !existing.loginTime) {
      return res.status(400).json({ message: 'You must login before logging out' });
    }
    if (existing.logoutTime) {
      return res.status(400).json({ message: "Today's attendance is already completed." });
    }

    const locationStatus = await getLocationOrReject(latitude, longitude, res, 'Logout cannot be marked outside the permitted office location.');
    if (!locationStatus) return;

    existing.logoutTime = new Date();
    existing.logoutLatitude = latitude;
    existing.logoutLongitude = longitude;
    existing.logoutAccuracy = coordinates.accuracy;
    existing.logoutLocationStatus = locationStatus;

    const diffMs = existing.logoutTime - existing.loginTime;
    const lunchMs = existing.lunchDurationMinutes ? existing.lunchDurationMinutes * 60 * 1000 : 0;
    existing.workingHours = Math.max(0, Math.round(((diffMs - lunchMs) / (1000 * 60 * 60)) * 100) / 100);

    const attendance = await existing.save();

    res.json({
      message: 'Logout recorded successfully',
      locationStatus,
      attendance,
    });
  } catch (error) {
    console.error('Attendance logout error:', error.message);
    res.status(500).json({ message: 'Server error while recording logout' });
  }
};

// @desc Get today's attendance status for logged-in employee
// @route GET /api/attendance/today
exports.getTodayAttendance = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }
    const today = getTodayDateString();

    const attendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (attendance) {
      setVerificationSchedule(attendance);
      if (attendance.isModified('fifteenMinuteCheck')) await attendance.save();
    }

    res.json({ date: today, attendance: attendance || null });
  } catch (error) {
    console.error('Get today attendance error:', error.message);
    res.status(500).json({ message: 'Server error while fetching attendance' });
  }
};

exports.verifyLocation = async (req, res) => {
  try {
    const coordinates = getCoordinates(req.body);
    if (!coordinates) return res.status(400).json({ message: 'GPS latitude, longitude and accuracy are required' });
    const employeeId = getEmployeeId(req);
    if (!employeeId) return res.status(400).json({ message: 'No employee profile linked to this user' });

    const attendance = await Attendance.findOne({ employee: employeeId, date: getTodayDateString() });
    if (!attendance || !attendance.loginTime) return res.status(400).json({ message: 'You must login before verifying your location.' });
    if (attendance.logoutTime) return res.status(400).json({ message: 'Location verification is unavailable after logout.' });
    setVerificationSchedule(attendance);
    if (attendance.fifteenMinuteCheck.gpsVerified || attendance.fifteenMinuteCheck.completed) {
      return res.status(400).json({ message: 'Location verification has already been completed.' });
    }
    const requiredAt = new Date(attendance.loginTime.getTime() + getVerificationIntervalMs());
    if (new Date() < requiredAt) {
      return res.status(400).json({ message: 'Location verification is not due yet.', requiredAt });
    }

    const locationStatus = await getLocationOrReject(coordinates.latitude, coordinates.longitude, res);
    if (!locationStatus) return;
    const verifiedAt = new Date();
    attendance.fifteenMinuteCheck.completed = true;
    attendance.fifteenMinuteCheck.verifiedAt = verifiedAt;
    attendance.fifteenMinuteCheck.checkTime = verifiedAt;
    attendance.fifteenMinuteCheck.latitude = coordinates.latitude;
    attendance.fifteenMinuteCheck.longitude = coordinates.longitude;
    attendance.fifteenMinuteCheck.accuracy = coordinates.accuracy;
    attendance.fifteenMinuteCheck.gpsVerified = true;
    attendance.fifteenMinuteCheck.status = 'COMPLETED';
    await attendance.save();
    res.json({ message: 'Location verified', locationStatus, attendance });
  } catch (error) {
    console.error('Location verification error:', error.message);
    res.status(500).json({ message: 'Server error while verifying location' });
  }
};

exports.markLunchOut = async (req, res) => {
  try {
    const coordinates = getCoordinates(req.body);
    if (!coordinates) return res.status(400).json({ message: 'GPS latitude, longitude and accuracy are required' });
    const employeeId = getEmployeeId(req);
    if (!employeeId) return res.status(400).json({ message: 'No employee profile linked to this user' });

    const attendance = await Attendance.findOne({ employee: employeeId, date: getTodayDateString() });
    if (!attendance || !attendance.loginTime) return res.status(400).json({ message: 'You must login before marking lunch out.' });
    if (attendance.logoutTime) return res.status(400).json({ message: 'Lunch cannot be marked after logout.' });
    if (attendance.lunchOut) return res.status(400).json({ message: 'Lunch out has already been recorded.' });

    const locationStatus = await getLocationOrReject(coordinates.latitude, coordinates.longitude, res);
    if (!locationStatus) return;
    attendance.lunchOut = new Date();
    attendance.lunchOutLatitude = coordinates.latitude;
    attendance.lunchOutLongitude = coordinates.longitude;
    attendance.lunchOutAccuracy = coordinates.accuracy;
    await attendance.save();
    res.json({ message: 'Lunch out marked successfully', locationStatus, attendance });
  } catch (error) {
    console.error('Lunch out error:', error.message);
    res.status(500).json({ message: 'Server error while recording lunch out' });
  }
};

exports.markLunchIn = async (req, res) => {
  try {
    const coordinates = getCoordinates(req.body);
    if (!coordinates) return res.status(400).json({ message: 'GPS latitude, longitude and accuracy are required' });
    const employeeId = getEmployeeId(req);
    if (!employeeId) return res.status(400).json({ message: 'No employee profile linked to this user' });

    const attendance = await Attendance.findOne({ employee: employeeId, date: getTodayDateString() });
    if (!attendance || !attendance.loginTime) return res.status(400).json({ message: 'You must login before marking lunch in.' });
    if (attendance.logoutTime) return res.status(400).json({ message: 'Lunch cannot be marked after logout.' });
    if (!attendance.lunchOut) return res.status(400).json({ message: 'Lunch out must be marked first.' });
    if (attendance.lunchIn) return res.status(400).json({ message: 'Lunch in has already been recorded.' });

    const locationStatus = await getLocationOrReject(coordinates.latitude, coordinates.longitude, res);
    if (!locationStatus) return;
    attendance.lunchIn = new Date();
    attendance.lunchInLatitude = coordinates.latitude;
    attendance.lunchInLongitude = coordinates.longitude;
    attendance.lunchInAccuracy = coordinates.accuracy;
    attendance.lunchDurationMinutes = Math.max(0, Math.round((attendance.lunchIn - attendance.lunchOut) / 60000));
    await attendance.save();
    res.json({ message: 'Lunch in marked successfully', locationStatus, attendance });
  } catch (error) {
    console.error('Lunch in error:', error.message);
    res.status(500).json({ message: 'Server error while recording lunch in' });
  }
};

exports.getMonthlyCalendar = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) and year are required' });
    }

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    const records = await Attendance.find({
      employee: employeeId,
      date: { $regex: `^${prefix}` },
    });

    const recordMap = {};
    records.forEach((r) => {
      recordMap[r.date] = r;
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const today = getTodayDateString();

    const calendar = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
      const record = recordMap[dateStr];

      let status;
      if (record) {
        status = record.attendanceStatus;
      } else if (dateStr > today) {
        status = 'UPCOMING';
      } else {
        status = 'ABSENT';
      }

      calendar.push({
        date: dateStr,
        status,
        loginTime: record?.loginTime || null,
        logoutTime: record?.logoutTime || null,
        workingHours: record?.workingHours || 0,
      });
    }

    res.json({ month, year, calendar });
  } catch (error) {
    console.error('Get monthly calendar error:', error.message);
    res.status(500).json({ message: 'Server error while fetching calendar' });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const { from, to } = req.query;

    const query = { employee: employeeId };
    if (from && to) {
      query.date = { $gte: from, $lte: to };
    } else if (from) {
      query.date = { $gte: from };
    } else if (to) {
      query.date = { $lte: to };
    }

    const records = await Attendance.find(query).sort({ date: -1 });

    res.json({ count: records.length, records });
  } catch (error) {
    console.error('Get attendance history error:', error.message);
    res.status(500).json({ message: 'Server error while fetching history' });
  }
};