const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getTodayAttendanceAll,
  getAllEmployees,
  createEmployee,
  setEmployeeStatus,
  deleteEmployee,
  getEmployeeDetail,
  getMonthlyAttendanceReport,
  getLeaveReport,
} = require('../controllers/adminController');
const {
  getAllPermissionRequests,
  reviewPermissionRequest,
} = require('../controllers/permissionController');
const {
  getAllLeaveRequests,
  reviewLeaveRequest,
} = require('../controllers/leaveController');
const {
  getAllRegularisationRequests,
  reviewRegularisationRequest,
} = require('../controllers/regularisationController');
const {
  getAllOutsideVisits,
  reviewOutsideVisit,
} = require('../controllers/outsideVisitController');
const {
  setSalaryConfig,
  getSalaryConfig,
  calculateSalary,
} = require('../controllers/salaryController');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');

router.use(protect, authorize('admin'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/attendance/today', getTodayAttendanceAll);
router.get('/employees', getAllEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:employeeId/status', setEmployeeStatus);
router.delete('/employees/:employeeId', deleteEmployee);
router.get('/employees/:employeeId/detail', getEmployeeDetail);
router.get('/permission', getAllPermissionRequests);
router.put('/permission/:id', reviewPermissionRequest);
router.get('/leave', getAllLeaveRequests);
router.put('/leave/:id', reviewLeaveRequest);
router.get('/regularisation', getAllRegularisationRequests);
router.put('/regularisation/:id', reviewRegularisationRequest);
router.get('/outside-visit', getAllOutsideVisits);
router.put('/outside-visit/:id', reviewOutsideVisit);
router.put('/salary/:employeeId', setSalaryConfig);
router.get('/salary/:employeeId', getSalaryConfig);
router.get('/salary/:employeeId/calculate', calculateSalary);
router.get('/reports/monthly-attendance', getMonthlyAttendanceReport);
router.get('/reports/leave', getLeaveReport);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markAsRead);
router.put('/notifications/read-all', markAllAsRead);

module.exports = router;