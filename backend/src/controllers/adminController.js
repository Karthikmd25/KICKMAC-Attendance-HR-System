const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

const getTodayDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// @desc Get dashboard statistics
// @route GET /api/admin/dashboard-stats
exports.getDashboardStats = async (req, res) => {
  try {
    const today = getTodayDateString();

    const totalEmployees = await Employee.countDocuments({ isActive: true });

    const todayAttendance = await Attendance.find({ date: today });

    const presentToday = todayAttendance.filter((a) => a.loginTime).length;
    const absentToday = totalEmployees - presentToday;

    // "Late" placeholder logic: login after 9:30 AM (adjust later via office settings)
    const lateToday = todayAttendance.filter((a) => {
      if (!a.loginTime) return false;
      const loginHour = new Date(a.loginTime).getHours();
      const loginMinute = new Date(a.loginTime).getMinutes();
      return loginHour > 9 || (loginHour === 9 && loginMinute > 30);
    }).length;

    res.json({
      date: today,
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      // Leave/regularisation/outside-office pending counts will be added
      // once those modules exist (Step 7+)
      pendingLeaveRequests: 0,
      pendingRegularisationRequests: 0,
      pendingOutsideOfficeRequests: 0,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error.message);
    res.status(500).json({ message: 'Server error while fetching dashboard stats' });
  }
};

// @desc Get today's attendance for all employees (live attendance table)
// @route GET /api/admin/attendance/today
exports.getTodayAttendanceAll = async (req, res) => {
  try {
    const today = getTodayDateString();

    const attendance = await Attendance.find({ date: today }).populate(
      'employee',
      'employeeId name department designation'
    );

    res.json({ date: today, count: attendance.length, attendance });
  } catch (error) {
    console.error('Get today attendance (all) error:', error.message);
    res.status(500).json({ message: 'Server error while fetching attendance' });
  }
};
// @desc Admin: get list of all employees with salary info
// @route GET /api/admin/employees
exports.getAllEmployees = async (req, res) => {
  try {
    const Salary = require('../models/Salary');
    const employees = await Employee.find().sort({ name: 1 });

    const employeesWithSalary = await Promise.all(
      employees.map(async (emp) => {
        const salary = await Salary.findOne({ employee: emp._id });
        return {
          _id: emp._id,
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          designation: emp.designation,
          phone: emp.phone,
          joiningDate: emp.joiningDate,
          isActive: emp.isActive,
          salary: salary
            ? { basicSalary: salary.basicSalary, allowances: salary.allowances }
            : null,
        };
      })
    );

    res.json({ count: employeesWithSalary.length, employees: employeesWithSalary });
  } catch (error) {
    console.error('Get all employees error:', error.message);
    res.status(500).json({ message: 'Server error while fetching employees' });
  }
};
// @desc Admin: monthly attendance report for all employees
// @route GET /api/admin/reports/monthly-attendance?month=8&year=2026
exports.getMonthlyAttendanceReport = async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) and year are required' });
    }

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    const employees = await Employee.find({ isActive: true }).sort({ name: 1 });

    const records = await require('../models/Attendance').find({
      date: { $regex: `^${prefix}` },
    });

    const report = employees.map((emp) => {
      const empRecords = records.filter((r) => r.employee.toString() === emp._id.toString());

      const presentDays = empRecords.filter((r) => r.loginTime).length;
      const totalWorkingHours = empRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0);
      const lateCount = empRecords.filter((r) => {
        if (!r.loginTime) return false;
        const hour = new Date(r.loginTime).getHours();
        const minute = new Date(r.loginTime).getMinutes();
        return hour > 9 || (hour === 9 && minute > 30);
      }).length;

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
        presentDays,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        lateCount,
      };
    });

    res.json({ month, year, report });
  } catch (error) {
    console.error('Monthly attendance report error:', error.message);
    res.status(500).json({ message: 'Server error while generating report' });
  }
};

// @desc Admin: leave report for all employees
// @route GET /api/admin/reports/leave?month=8&year=2026
exports.getLeaveReport = async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) and year are required' });
    }

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    const LeaveRequest = require('../models/LeaveRequest');

    const requests = await LeaveRequest.find({
      status: 'APPROVED',
      fromDate: { $regex: `^${prefix}` },
    })
      .populate('employee', 'employeeId name department')
      .sort({ fromDate: 1 });

    const report = requests.map((r) => ({
      employeeId: r.employee?.employeeId,
      name: r.employee?.name,
      department: r.employee?.department,
      leaveType: r.leaveType,
      fromDate: r.fromDate,
      toDate: r.toDate,
      daysRequested: r.daysRequested,
      reason: r.reason,
    }));

    res.json({ month, year, report });
  } catch (error) {
    console.error('Leave report error:', error.message);
    res.status(500).json({ message: 'Server error while generating leave report' });
  }
};
// @desc Admin: create a new employee account
// @route POST /api/admin/employees
exports.createEmployee = async (req, res) => {
  try {
    const User = require('../models/User');
    const { email, password, name, employeeId, department, designation, phone } = req.body;

    if (!email || !password || !name || !employeeId) {
      return res.status(400).json({ message: 'Email, password, name, and employeeId are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingEmployeeId = await Employee.findOne({ employeeId });
    if (existingEmployeeId) {
      return res.status(400).json({ message: 'Employee ID already in use' });
    }

    // Role is always 'employee' — admin cannot create another admin through this form
    const user = await User.create({
      email,
      password,
      role: 'employee',
    });

    const employee = await Employee.create({
      user: user._id,
      employeeId,
      name,
      department,
      designation,
      phone,
      joiningDate: new Date(),
    });

    user.employee = employee._id;
    await user.save();

    res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        employeeId: employee.employeeId,
        name: employee.name,
        email: user.email,
        department: employee.department,
        designation: employee.designation,
      },
    });
  } catch (error) {
    console.error('Create employee error:', error.message);
    res.status(500).json({ message: 'Server error while creating employee' });
  }
};
// @desc Admin: activate or deactivate an employee
// @route PUT /api/admin/employees/:employeeId/status
exports.setEmployeeStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive (true/false) is required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Prevent an admin from deactivating themselves
    if (employee.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    employee.isActive = isActive;
    await employee.save();

    // Also deactivate the linked User account so they can't log in
    const User = require('../models/User');
    await User.findByIdAndUpdate(employee.user, { isActive });

    res.json({
      message: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`,
      employee: { _id: employee._id, employeeId: employee.employeeId, isActive: employee.isActive },
    });
  } catch (error) {
    console.error('Set employee status error:', error.message);
    res.status(500).json({ message: 'Server error while updating employee status' });
  }
};
// @desc Admin: permanently delete an employee (hard delete)
// @route DELETE /api/admin/employees/:employeeId
exports.deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const User = require('../models/User');

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await User.findByIdAndDelete(employee.user);
    await Employee.findByIdAndDelete(employeeId);

    res.json({ message: 'Employee deleted permanently' });
  } catch (error) {
    console.error('Delete employee error:', error.message);
    res.status(500).json({ message: 'Server error while deleting employee' });
  }
};

// @desc Admin: get full detail for one employee (profile + history)
// @route GET /api/admin/employees/:employeeId/detail
exports.getEmployeeDetail = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const Attendance = require('../models/Attendance');
    const LeaveRequest = require('../models/LeaveRequest');
    const PermissionRequest = require('../models/PermissionRequest');
    const RegularisationRequest = require('../models/RegularisationRequest');
    const OutsideVisit = require('../models/OutsideVisit');
    const Salary = require('../models/Salary');

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const User = require('../models/User');
    const user = await User.findById(employee.user).select('email isActive');

    const [attendance, leave, permission, regularisation, outsideVisits, salary] = await Promise.all([
      Attendance.find({ employee: employeeId }).sort({ date: -1 }).limit(30),
      LeaveRequest.find({ employee: employeeId }).sort({ createdAt: -1 }).limit(20),
      PermissionRequest.find({ employee: employeeId }).sort({ createdAt: -1 }).limit(20),
      RegularisationRequest.find({ employee: employeeId }).sort({ createdAt: -1 }).limit(20),
      OutsideVisit.find({ employee: employeeId }).sort({ createdAt: -1 }).limit(20),
      Salary.findOne({ employee: employeeId }),
    ]);

    res.json({
      profile: {
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: user?.email,
        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
        isActive: employee.isActive,
        leaveBalance: employee.leaveBalance,
      },
      salary,
      attendance,
      leave,
      permission,
      regularisation,
      outsideVisits,
    });
  } catch (error) {
    console.error('Get employee detail error:', error.message);
    res.status(500).json({ message: 'Server error while fetching employee detail' });
  }
};