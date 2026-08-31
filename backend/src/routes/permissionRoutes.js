const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPermissionRequest,
  getMyPermissionRequests,
} = require('../controllers/permissionController');

router.post('/', protect, createPermissionRequest);
router.get('/my', protect, getMyPermissionRequests);

module.exports = router;