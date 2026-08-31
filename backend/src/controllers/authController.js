const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc Register a new employee (creates User + Employee)
// @route POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, name, employeeId, department, designation, phone } = req.body;

    if (!email || !password || !name || !employeeId) {
      return res.status(400).json({ message: 'Email, password, name, and employeeId are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingEmployeeId = await Employee.findOne({ employeeId });
    if (existingEmployeeId) {
      return res.status(400).json({ message: 'Employee ID already in use' });
    }

    // Role is NEVER taken from req.body — always defaults to employee here
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

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        employeeId: employee.employeeId,
        name: employee.name,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc Login
// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate('employee');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.employeeId,
        name: user.employee?.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};