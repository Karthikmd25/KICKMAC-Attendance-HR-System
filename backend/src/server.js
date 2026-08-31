require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startScheduledJobs } = require('./jobs/dailyAttendanceReport');

const port = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
    startScheduledJobs();
  });
});