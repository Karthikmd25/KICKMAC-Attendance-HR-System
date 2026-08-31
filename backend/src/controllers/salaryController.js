const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');

// @desc Admin: set or update salary configuration for an employee
// @route PUT /api/admin/salary/:employeeId
exports.setSalaryConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { basicSalary, allowances, workingDaysPerMonth, overtimeRatePerHour, otherDeductions } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let salary = await Salary.findOne({ employee: employeeId });
    if (!salary) {
      salary = new Salary({ employee: employeeId });
    }

    if (basicSalary !== undefined) salary.basicSalary = basicSalary;
    if (allowances !== undefined) salary.allowances = allowances;
    if (workingDaysPerMonth !== undefined) salary.workingDaysPerMonth = workingDaysPerMonth;
    if (overtimeRatePerHour !== undefined) salary.overtimeRatePerHour = overtimeRatePerHour;
    if (otherDeductions !== undefined) salary.otherDeductions = otherDeductions;

    await salary.save();

    res.json({ message: 'Salary configuration saved', salary });
  } catch (error) {
    console.error('Set salary config error:', error.message);
    res.status(500).json({ message: 'Server error while saving salary configuration' });
  }
};

// @desc Admin: get salary configuration for an employee
// @route GET /api/admin/salary/:employeeId
exports.getSalaryConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const salary = await Salary.findOne({ employee: employeeId });
    res.json({ salary: salary || null });
  } catch (error) {
    console.error('Get salary config error:', error.message);
    res.status(500).json({ message: 'Server error while fetching salary configuration' });
  }
};

// Helper: count days in a given month
const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

// @desc Admin: calculate salary for an employee for a given month/year
// @route GET /api/admin/salary/:employeeId/calculate?month=8&year=2026
exports.calculateSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) and year are required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const salaryConfig = await Salary.findOne({ employee: employeeId });
    if (!salaryConfig) {
      return res.status(400).json({ message: 'No salary configuration found for this employee. Please set it first.' });
    }

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const totalDaysInMonth = daysInMonth(year, month);

    // Get all attendance records for this employee in this month
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $regex: `^${prefix}` },
    });

    // Count present days (has a login) vs half days
    let presentDays = 0;
    let halfDays = 0;
    let totalOvertimeHours = 0;

    attendanceRecords.forEach((a) => {
      if (a.attendanceStatus === 'HALF_DAY') {
        halfDays += 1;
      } else if (a.loginTime) {
        presentDays += 1;
        // Overtime = hours beyond 8 in a day, if working hours were tracked
        if (a.workingHours && a.workingHours > 8) {
          totalOvertimeHours += a.workingHours - 8;
        }
      }
    });

    // Get approved leave requests overlapping this month, separated by whether they count against balance (paid) or not
    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: 'APPROVED',
      fromDate: { $lte: `${prefix}-${String(totalDaysInMonth).padStart(2, '0')}` },
      toDate: { $gte: `${prefix}-01` },
    });

    // For simplicity: all approved leave types with a balance (CASUAL/SICK/EMERGENCY/OPTIONAL) count as PAID leave.
    // HALF_DAY leave type already reflected in attendance halfDays count above; OTHER leave type = UNPAID.
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    approvedLeaves.forEach((l) => {
      if (l.leaveType === 'OTHER') {
        unpaidLeaveDays += l.daysRequested;
      } else if (l.leaveType !== 'HALF_DAY') {
        paidLeaveDays += l.daysRequested;
      }
    });

    const workingDaysPerMonth = salaryConfig.workingDaysPerMonth || 26;

    // Paid days = present + half-day (counted as 0.5) + paid leave
    const paidDays = presentDays + halfDays * 0.5 + paidLeaveDays;

    // LOP (Loss of Pay) days = anything in the working-day quota not covered by paid days
    const lopDays = Math.max(0, workingDaysPerMonth - paidDays);

    const grossSalary = salaryConfig.basicSalary + salaryConfig.allowances;
    const perDayRate = workingDaysPerMonth > 0 ? grossSalary / workingDaysPerMonth : 0;
    const lopDeduction = Math.round(perDayRate * lopDays * 100) / 100;

    const overtimePay = Math.round(totalOvertimeHours * (salaryConfig.overtimeRatePerHour || 0) * 100) / 100;

    const totalDeductions = Math.round((lopDeduction + (salaryConfig.otherDeductions || 0)) * 100) / 100;

    const netSalary = Math.round((grossSalary + overtimePay - totalDeductions) * 100) / 100;

    res.json({
      employee: {
        employeeId: employee.employeeId,
        name: employee.name,
      },
      month,
      year,
      basicSalary: salaryConfig.basicSalary,
      allowances: salaryConfig.allowances,
      grossSalary,
      workingDaysPerMonth,
      presentDays,
      halfDays,
      paidLeaveDays,
      unpaidLeaveDays,
      paidDays: Math.round(paidDays * 100) / 100,
      lopDays: Math.round(lopDays * 100) / 100,
      overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
      overtimePay,
      lopDeduction,
      otherDeductions: salaryConfig.otherDeductions || 0,
      totalDeductions,
      netSalary,
    });
  } catch (error) {
    console.error('Calculate salary error:', error.message);
    res.status(500).json({ message: 'Server error while calculating salary' });
  }
};