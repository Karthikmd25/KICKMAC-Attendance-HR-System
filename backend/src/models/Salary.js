const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
    },
    basicSalary: {
      type: Number,
      required: true,
      default: 0,
    },
    allowances: {
      type: Number,
      default: 0,
    },
    workingDaysPerMonth: {
      type: Number,
      default: 26, // e.g. excluding Sundays
    },
    overtimeRatePerHour: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Salary', salarySchema);