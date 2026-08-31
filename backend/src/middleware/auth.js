const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the JWT token and attaches the user to req.user
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];

       const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('DEBUG - decoded token id:', decoded.id);

    const user = await User.findById(decoded.id).populate('employee');
    console.log('DEBUG - user found:', user ? user.email : 'NOT FOUND', '| isActive:', user?.isActive);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authorized, user not found or inactive' });
    }

    req.user = user; // attach full user doc (with role, employee info) to the request
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};

// Restricts access to specific roles, e.g. adminOnly('admin')
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};