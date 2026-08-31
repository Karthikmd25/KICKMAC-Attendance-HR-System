const OutsideVisit = require('../models/OutsideVisit');

// @desc Employee logs an outside office visit
// @route POST /api/outside-visit
exports.createOutsideVisit = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const { latitude, longitude, photo, reason, notes } = req.body;

    if (latitude === undefined || longitude === undefined || !reason) {
      return res.status(400).json({ message: 'GPS coordinates and reason are required' });
    }

    // Basic size guard for base64 photo (roughly 5MB limit)
    if (photo && photo.length > 7000000) {
      return res.status(400).json({ message: 'Photo is too large. Please use a smaller image.' });
    }

    const visit = await OutsideVisit.create({
      employee: employeeId,
      latitude,
      longitude,
      photo,
      reason,
      notes,
    });

    res.status(201).json({ message: 'Outside office visit logged', visit });
  } catch (error) {
    console.error('Create outside visit error:', error.message);
    res.status(500).json({ message: 'Server error while logging outside visit' });
  }
};

// @desc Employee views their own outside visit history
// @route GET /api/outside-visit/my
exports.getMyOutsideVisits = async (req, res) => {
  try {
    const employeeId = req.user.employee?._id;
    if (!employeeId) {
      return res.status(400).json({ message: 'No employee profile linked to this user' });
    }

    const visits = await OutsideVisit.find({ employee: employeeId }).sort({ createdAt: -1 });

    res.json({ count: visits.length, visits });
  } catch (error) {
    console.error('Get my outside visits error:', error.message);
    res.status(500).json({ message: 'Server error while fetching outside visits' });
  }
};

// @desc Admin: get all outside visits (optionally filter by status)
// @route GET /api/admin/outside-visit?status=PENDING
exports.getAllOutsideVisits = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const visits = await OutsideVisit.find(query)
      .populate('employee', 'employeeId name department')
      .sort({ createdAt: -1 });

    res.json({ count: visits.length, visits });
  } catch (error) {
    console.error('Get all outside visits error:', error.message);
    res.status(500).json({ message: 'Server error while fetching outside visits' });
  }
};

// @desc Admin: approve or reject an outside visit
// @route PUT /api/admin/outside-visit/:id
exports.reviewOutsideVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Action must be APPROVE or REJECT' });
    }

    const visit = await OutsideVisit.findById(id);
    if (!visit) {
      return res.status(404).json({ message: 'Outside visit not found' });
    }

    if (visit.status !== 'PENDING') {
      return res.status(400).json({ message: 'This request has already been reviewed' });
    }

    visit.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    visit.approvedBy = req.user._id;
    visit.approvedAt = new Date();
    if (action === 'REJECT' && rejectionReason) {
      visit.rejectionReason = rejectionReason;
    }

    await visit.save();

    res.json({ message: `Outside visit ${visit.status.toLowerCase()}`, visit });
  } catch (error) {
    console.error('Review outside visit error:', error.message);
    res.status(500).json({ message: 'Server error while reviewing outside visit' });
  }
};