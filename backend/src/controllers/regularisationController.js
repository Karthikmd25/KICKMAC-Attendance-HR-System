const RegularisationRequest = require('../models/RegularisationRequest');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');

// @desc Employee submits a regularisation request
// @route POST /api/regularisation
exports.createRegularisationRequest = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const { date, requestedLoginTime, requestedLogoutTime, reason } = req.body;

    if (!date || !reason || (!requestedLoginTime && !requestedLogoutTime)) {
      return res.status(400).json({
        message: 'Date, reason, and at least one of requested login/logout time are required',
      });
    }

    const request = await RegularisationRequest.create({
      employee: employeeId,
      date,
      requestedLoginTime,
      requestedLogoutTime,
      reason,
    });

    res.status(201).json({ message: 'Regularisation request submitted', request });
  } catch (error) {
    console.error('Create regularisation request error:', error.message);
    res.status(500).json({ message: 'Server error while submitting regularisation request' });
  }
};

// @desc Employee views their own regularisation requests
// @route GET /api/regularisation/my
exports.getMyRegularisationRequests = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const requests = await RegularisationRequest.find({ employee: employeeId }).sort({ createdAt: -1 });

    res.json({ count: requests.length, requests });
  } catch (error) {
    console.error('Get my regularisation requests error:', error.message);
    res.status(500).json({ message: 'Server error while fetching regularisation requests' });
  }
};

// @desc Admin: get all regularisation requests (optionally filter by status)
// @route GET /api/admin/regularisation?status=PENDING
exports.getAllRegularisationRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const requests = await RegularisationRequest.find(query)
      .populate('employee', 'employeeId name department')
      .sort({ createdAt: -1 });

    res.json({ count: requests.length, requests });
  } catch (error) {
    console.error('Get all regularisation requests error:', error.message);
    res.status(500).json({ message: 'Server error while fetching regularisation requests' });
  }
};

// @desc Admin: approve or reject a regularisation request
// @route PUT /api/admin/regularisation/:id
exports.reviewRegularisationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Action must be APPROVE or REJECT' });
    }

    const request = await RegularisationRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Regularisation request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'This request has already been reviewed' });
    }

    if (action === 'APPROVE') {
      // Find or create the attendance record for that date, then apply the correction
      let attendance = await Attendance.findOne({ employee: request.employee, date: request.date });

      const before = attendance
        ? { loginTime: attendance.loginTime, logoutTime: attendance.logoutTime }
        : null;

      if (!attendance) {
        attendance = new Attendance({
          employee: request.employee,
          date: request.date,
          attendanceStatus: 'PRESENT',
        });
      }

      if (request.requestedLoginTime) {
        const [hh, mm] = request.requestedLoginTime.split(':').map(Number);
        const loginDate = new Date(`${request.date}T00:00:00`);
        loginDate.setHours(hh, mm, 0, 0);
        attendance.loginTime = loginDate;
        attendance.loginLocationStatus = attendance.loginLocationStatus || 'UNKNOWN';
      }

      if (request.requestedLogoutTime) {
        const [hh, mm] = request.requestedLogoutTime.split(':').map(Number);
        const logoutDate = new Date(`${request.date}T00:00:00`);
        logoutDate.setHours(hh, mm, 0, 0);
        attendance.logoutTime = logoutDate;
        attendance.logoutLocationStatus = attendance.logoutLocationStatus || 'UNKNOWN';
      }

      if (attendance.loginTime && attendance.logoutTime) {
        const diffMs = attendance.logoutTime - attendance.loginTime;
        const lunchMs = attendance.lunchDurationMinutes ? attendance.lunchDurationMinutes * 60 * 1000 : 0;
        attendance.workingHours = Math.max(0, Math.round(((diffMs - lunchMs) / (1000 * 60 * 60)) * 100) / 100);
      }

      attendance.attendanceStatus = 'PRESENT';
      await attendance.save();

      // Audit log entry
      await AuditLog.create({
        action: 'REGULARISATION_APPROVED',
        performedBy: req.user._id,
        targetEmployee: request.employee,
        details: {
          regularisationRequestId: request._id,
          date: request.date,
          before,
          after: { loginTime: attendance.loginTime, logoutTime: attendance.logoutTime },
        },
      });
    }

    request.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    if (action === 'REJECT' && rejectionReason) {
      request.rejectionReason = rejectionReason;
    }

    await request.save();

    res.json({ message: `Regularisation request ${request.status.toLowerCase()}`, request });
  } catch (error) {
    console.error('Review regularisation request error:', error.message);
    res.status(500).json({ message: 'Server error while reviewing regularisation request' });
  }
};