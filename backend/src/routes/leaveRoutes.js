const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createLeaveRequest,
  getMyLeaveRequests,
  getMyLeaveBalance,
} = require('../controllers/leaveController');

router.post('/', protect, createLeaveRequest);
router.get('/my', protect, getMyLeaveRequests);
router.get('/balance', protect, getMyLeaveBalance);

module.exports = router;