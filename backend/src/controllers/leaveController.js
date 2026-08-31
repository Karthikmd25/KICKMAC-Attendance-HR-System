const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');

const countDays = (fromDate, toDate, isHalfDay) => {
  if (isHalfDay) return 0.5;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffMs = to - from;
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

const leaveTypeToBalanceKey = {
  CASUAL: 'casual',
  SICK: 'sick',
  EMERGENCY: 'emergency',
  OPTIONAL: 'optional',
};

// @desc Employee submits a leave request
// @route POST /api/leave
exports.createLeaveRequest = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const { leaveType, fromDate, toDate, halfDayType, reason } = req.body;

    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'Leave type, from date, to date, and reason are required' });
    }

    if (leaveType === 'HALF_DAY' && !halfDayType) {
      return res.status(400).json({ message: 'Half day type (FIRST_HALF or SECOND_HALF) is required for half day leave' });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ message: 'From date cannot be after to date' });
    }

    const daysRequested = countDays(fromDate, toDate, leaveType === 'HALF_DAY');

    // Check leave balance for types that have a balance (casual, sick, emergency, optional)
    const balanceKey = leaveTypeToBalanceKey[leaveType];
    if (balanceKey) {
      const employee = await Employee.findById(employeeId);
      const eligible = employee.leaveBalance[balanceKey] || 0;

      // Sum up already-approved + pending requests of this type
      const existingRequests = await LeaveRequest.find({
        employee: employeeId,
        leaveType,
        status: { $in: ['PENDING', 'APPROVED'] },
      });
      const alreadyUsed = existingRequests.reduce((sum, r) => sum + r.daysRequested, 0);
      const remaining = eligible - alreadyUsed;

      if (daysRequested > remaining) {
        return res.status(400).json({
          message: `Insufficient ${leaveType.toLowerCase()} leave balance. Remaining: ${remaining} day(s), requested: ${daysRequested} day(s)`,
        });
      }
    }

    const request = await LeaveRequest.create({
      employee: employeeId,
      leaveType,
      fromDate,
      toDate,
      halfDayType: leaveType === 'HALF_DAY' ? halfDayType : undefined,
      reason,
      daysRequested,
    });

    res.status(201).json({ message: 'Leave request submitted', request });
  } catch (error) {
    console.error('Create leave request error:', error.message);
    res.status(500).json({ message: 'Server error while submitting leave request' });
  }
};

// @desc Employee views their own leave requests
// @route GET /api/leave/my
exports.getMyLeaveRequests = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const requests = await LeaveRequest.find({ employee: employeeId }).sort({ createdAt: -1 });

    res.json({ count: requests.length, requests });
  } catch (error) {
    console.error('Get my leave requests error:', error.message);
    res.status(500).json({ message: 'Server error while fetching leave requests' });
  }
};

// @desc Employee views their leave balance
// @route GET /api/leave/balance
exports.getMyLeaveBalance = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const employee = await Employee.findById(employeeId);
    const eligible = employee.leaveBalance;

    const approvedOrPending = await LeaveRequest.find({
      employee: employeeId,
      status: { $in: ['PENDING', 'APPROVED'] },
      leaveType: { $in: ['CASUAL', 'SICK', 'EMERGENCY', 'OPTIONAL'] },
    });

    const used = { casual: 0, sick: 0, emergency: 0, optional: 0 };
    approvedOrPending.forEach((r) => {
      const key = leaveTypeToBalanceKey[r.leaveType];
      if (key) used[key] += r.daysRequested;
    });

    const balance = {};
    Object.keys(eligible.toObject ? eligible.toObject() : eligible).forEach((key) => {
      balance[key] = {
        eligible: eligible[key],
        used: used[key] || 0,
        remaining: eligible[key] - (used[key] || 0),
      };
    });

    res.json({ balance });
  } catch (error) {
    console.error('Get leave balance error:', error.message);
    res.status(500).json({ message: 'Server error while fetching leave balance' });
  }
};
// @desc Admin: get all leave requests (optionally filter by status)
// @route GET /api/admin/leave?status=PENDING
exports.getAllLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'employeeId name department')
      .sort({ createdAt: -1 });

    res.json({ count: requests.length, requests });
  } catch (error) {
    console.error('Get all leave requests error:', error.message);
    res.status(500).json({ message: 'Server error while fetching leave requests' });
  }
};

// @desc Admin: approve or reject a leave request
// @route PUT /api/admin/leave/:id
exports.reviewLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Action must be APPROVE or REJECT' });
    }

    const request = await LeaveRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'This request has already been reviewed' });
    }

    request.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    if (action === 'REJECT' && rejectionReason) {
      request.rejectionReason = rejectionReason;
    }

    await request.save();

    res.json({ message: `Leave request ${request.status.toLowerCase()}`, request });
  } catch (error) {
    console.error('Review leave request error:', error.message);
    res.status(500).json({ message: 'Server error while reviewing leave request' });
  }
};