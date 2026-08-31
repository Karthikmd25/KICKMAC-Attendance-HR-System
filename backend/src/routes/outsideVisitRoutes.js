const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOutsideVisit,
  getMyOutsideVisits,
} = require('../controllers/outsideVisitController');

router.post('/', protect, createOutsideVisit);
router.get('/my', protect, getMyOutsideVisits);

module.exports = router;