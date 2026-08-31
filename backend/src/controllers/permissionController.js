const PermissionRequest = require('../models/PermissionRequest');

// @desc Employee submits a permission request
// @route POST /api/permission
exports.createPermissionRequest = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const { date, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime || !reason) {
      return res.status(400).json({ message: 'Date, start time, end time, and reason are required' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const request = await PermissionRequest.create({
      employee: employeeId,
      date,
      startTime,
      endTime,
      reason,
    });

    res.status(201).json({ message: 'Permission request submitted', request });
  } catch (error) {
    console.error('Create permission request error:', error.message);
    res.status(500).json({ message: 'Server error while submitting permission request' });
  }
};

// @desc Employee views their own permission history
// @route GET /api/permission/my
exports.getMyPermissionRequests = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const requests = await PermissionRequest.find({ employee: employeeId }).sort({ createdAt: -1 });

    res.json({ count: requests.length, requests });
  } catch (error) {
    console.error('Get my permission requests error:', error.message);
    res.status(500).json({ message: 'Server error while fetching permission requests' });
  }
};
// @desc Admin: get all permission requests (optionally filter by status)
// @route GET /api/admin/permission?status=PENDING
exports.getAllPermissionRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const requests = await PermissionRequest.find(query)
      .populate('employee', 'employeeId name department')
      .sort({ createdAt: -1 });

    res.json({ count: requests.length, requests });
  } catch (error) {
    console.error('Get all permission requests error:', error.message);
    res.status(500).json({ message: 'Server error while fetching permission requests' });
  }
};

// @desc Admin: approve or reject a permission request
// @route PUT /api/admin/permission/:id
exports.reviewPermissionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'APPROVE' or 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Action must be APPROVE or REJECT' });
    }

    const request = await PermissionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Permission request not found' });
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

    res.json({ message: `Permission request ${request.status.toLowerCase()}`, request });
  } catch (error) {
    console.error('Review permission request error:', error.message);
    res.status(500).json({ message: 'Server error while reviewing permission request' });
  }
};