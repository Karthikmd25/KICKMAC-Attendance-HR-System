const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const regularisationRoutes = require('./routes/regularisationRoutes');
const outsideVisitRoutes = require('./routes/outsideVisitRoutes');

const app = express();

app.use(
  cors({
    origin: 'https://kickmac-attendance-hr-system.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/permission', permissionRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/regularisation', regularisationRoutes);
app.use('/api/outside-visit', outsideVisitRoutes);

module.exports = app;