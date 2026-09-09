require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Employee = require('../models/Employee');

const seed = async () => {
  await connectDB();

  const email = 'admin@staffonly.com';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const user = await User.create({
    email,
    password: 'admin123', // change this after first login
    role: 'admin',
  });

  const employee = await Employee.create({
    user: user._id,
    employeeId: 'ADMIN001',
    name: 'Admin',
    department: 'Management',
    designation: 'Administrator',
    joiningDate: new Date(),
  });

  user.employee = employee._id;
  await user.save();

  console.log('Admin user created:');
  console.log('  Email:', email);
  console.log('  Password: admin123');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err.message);
  process.exit(1);
});