require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
  await connectDB();

  const email = 'karthik@kickmac.com';
  const newPassword = 'test123';

  const user = await User.findOne({ email });
  if (!user) {
    console.log('User not found:', email);
    process.exit(1);
  }

  user.password = newPassword; // will be hashed by the pre-save hook
  await user.save();

  console.log('Password reset successfully for:', email);
  console.log('New password:', newPassword);
  process.exit(0);
};

run().catch((err) => {
  console.error('Reset error:', err.message);
  process.exit(1);
});