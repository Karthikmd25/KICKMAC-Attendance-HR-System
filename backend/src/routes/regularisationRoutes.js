const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createRegularisationRequest,
  getMyRegularisationRequests,
} = require('../controllers/regularisationController');

router.post('/', protect, createRegularisationRequest);
router.get('/my', protect, getMyRegularisationRequests);

module.exports = router;