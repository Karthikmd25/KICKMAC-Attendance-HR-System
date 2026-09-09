import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './AdminDashboard.css';
import NotificationBell from '../components/NotificationBell';

const getErrorMessage = (error) => error.response?.data?.message
  || (error.code === 'ERR_NETWORK' ? 'Unable to reach the server.' : 'Something went wrong. Please try again.');

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : '--';

const OUTSIDE_REASON_LABELS = {
  CLIENT_MEETING: 'Client Meeting',
  BANK_WORK: 'Bank Work',
  DELIVERY: 'Delivery',
  OFFICIAL_WORK: 'Official Work',
  OTHER: 'Other',
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [attendanceToday, setAttendanceToday] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [regularisationRequests, setRegularisationRequests] = useState([]);
  const [regularisationLoading, setRegularisationLoading] = useState(true);
  const [outsideVisits, setOutsideVisits] = useState([]);
  const [outsideVisitsLoading, setOutsideVisitsLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [actioningId, setActioningId] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const response = await api.get('/admin/dashboard-stats');
      setStats(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadAttendanceToday = async () => {
    setAttendanceLoading(true);
    try {
      const response = await api.get('/admin/attendance/today');
      setAttendanceToday(response.data.attendance);
    } catch (error) {
      console.error('Failed to load attendance', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    setLeaveLoading(true);
    try {
      const response = await api.get('/admin/leave?status=PENDING');
      setLeaveRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to load leave requests', error);
    } finally {
      setLeaveLoading(false);
    }
  };

  const loadPermissionRequests = async () => {
    setPermissionLoading(true);
    try {
      const response = await api.get('/admin/permission?status=PENDING');
      setPermissionRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to load permission requests', error);
    } finally {
      setPermissionLoading(false);
    }
  };

  const loadRegularisationRequests = async () => {
    setRegularisationLoading(true);
    try {
      const response = await api.get('/admin/regularisation?status=PENDING');
      setRegularisationRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to load regularisation requests', error);
    } finally {
      setRegularisationLoading(false);
    }
  };

  const loadOutsideVisits = async () => {
    setOutsideVisitsLoading(true);
    try {
      const response = await api.get('/admin/outside-visit?status=PENDING');
      setOutsideVisits(response.data.visits);
    } catch (error) {
      console.error('Failed to load outside visits', error);
    } finally {
      setOutsideVisitsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadAttendanceToday();
    loadLeaveRequests();
    loadPermissionRequests();
    loadRegularisationRequests();
    loadOutsideVisits();
  }, []);

  const reviewLeave = async (id, action) => {
    setActioningId(id);
    setMessage({ type: '', text: '' });
    try {
      await api.put(`/admin/leave/${id}`, { action });
      setMessage({ type: 'success', text: `Leave request ${action === 'APPROVE' ? 'approved' : 'rejected'}` });
      loadLeaveRequests();
      loadStats();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setActioningId('');
    }
  };

  const reviewPermission = async (id, action) => {
    setActioningId(id);
    setMessage({ type: '', text: '' });
    try {
      await api.put(`/admin/permission/${id}`, { action });
      setMessage({ type: 'success', text: `Permission request ${action === 'APPROVE' ? 'approved' : 'rejected'}` });
      loadPermissionRequests();
      loadStats();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setActioningId('');
    }
  };

  const reviewRegularisation = async (id, action) => {
    setActioningId(id);
    setMessage({ type: '', text: '' });
    try {
      await api.put(`/admin/regularisation/${id}`, { action });
      setMessage({ type: 'success', text: `Regularisation request ${action === 'APPROVE' ? 'approved' : 'rejected'}` });
      loadRegularisationRequests();
      loadAttendanceToday();
      loadStats();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setActioningId('');
    }
  };

  const reviewOutsideVisit = async (id, action) => {
    setActioningId(id);
    setMessage({ type: '', text: '' });
    try {
      await api.put(`/admin/outside-visit/${id}`, { action });
      setMessage({ type: 'success', text: `Outside visit ${action === 'APPROVE' ? 'approved' : 'rejected'}` });
      loadOutsideVisits();
      loadStats();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setActioningId('');
    }
  };

  return (
    <main className="employee-dashboard phase-one-dashboard">
      <header className="employee-header">
        <div className="brand-lockup"><span className="brand-mark">SO</span><span>STAFFONLY</span></div>
        <div className="header-title"><span>Workspace</span><h1>Admin Dashboard</h1></div>
        <div className="employee-identity">
          <NotificationBell />
          <strong>{user?.name || 'Admin'}</strong><span>{user?.employeeId || 'Admin'} / Admin</span><button className="btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
        </header>
      <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.6rem' }}>
        <a href="/admin/employees" className="btn-secondary" style={{ textDecoration: 'none' }}>👥 Employees</a>
        <a href="/admin/salary" className="btn-secondary" style={{ textDecoration: 'none' }}>💰 Salary</a>
        <a href="/admin/reports" className="btn-secondary" style={{ textDecoration: 'none' }}>📊 Reports</a>
      </div>

      {message.text && <div className={`message ${message.type === 'error' ? 'error-message' : 'success-message'}`} role="status">{message.text}</div>}

      <section className="stats-grid">
        {statsLoading ? (
          <p className="calendar-loading">Loading stats...</p>
        ) : stats && (
          <>
            <div className="stat-card"><span>Total employees</span><strong>{stats.totalEmployees}</strong></div>
            <div className="stat-card"><span>Present today</span><strong className="verified">{stats.presentToday}</strong></div>
            <div className="stat-card"><span>Absent today</span><strong>{stats.absentToday}</strong></div>
            <div className="stat-card"><span>Late today</span><strong>{stats.lateToday}</strong></div>
            <div className="stat-card"><span>Pending leave</span><strong>{leaveRequests.length}</strong></div>
            <div className="stat-card"><span>Pending permission</span><strong>{permissionRequests.length}</strong></div>
            <div className="stat-card"><span>Pending regularisation</span><strong>{regularisationRequests.length}</strong></div>
            <div className="stat-card"><span>Pending outside visits</span><strong>{outsideVisits.length}</strong></div>
          </>
        )}
      </section>

      <section className="attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Today</p><h2>Live attendance</h2></div></div>
        {attendanceLoading ? (
          <p className="calendar-loading">Loading attendance...</p>
        ) : attendanceToday.length === 0 ? (
          <p className="empty-note">No attendance records for today yet.</p>
        ) : (
          <div className="admin-table">
            <div className="admin-table-header">
              <span>Employee</span><span>ID</span><span>Login</span><span>Logout</span><span>GPS</span><span>Status</span>
            </div>
            {attendanceToday.map((a) => (
              <div key={a._id} className="admin-table-row">
                <span>{a.employee?.name}</span>
                <span>{a.employee?.employeeId}</span>
                <span>{formatTime(a.loginTime)}</span>
                <span>{formatTime(a.logoutTime)}</span>
                <span className={a.loginLocationStatus === 'VERIFIED' ? 'verified' : ''}>{a.loginLocationStatus === 'VERIFIED' ? 'Verified' : 'Not verified'}</span>
                <span className="status-pill is-present">{a.attendanceStatus}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Approvals</p><h2>Pending leave requests</h2></div></div>
        {leaveLoading ? (
          <p className="calendar-loading">Loading requests...</p>
        ) : leaveRequests.length === 0 ? (
          <p className="empty-note">No pending leave requests.</p>
        ) : (
          <div className="request-list">
            {leaveRequests.map((r) => (
              <div key={r._id} className="request-row">
                <div className="request-main">
                  <strong>{r.employee?.name} ({r.employee?.employeeId})</strong>
                  <span>{r.leaveType.replace('_', ' ')} — {r.fromDate} to {r.toDate} ({r.daysRequested} day{r.daysRequested !== 1 ? 's' : ''})</span>
                  <span className="request-reason">{r.reason}</span>
                </div>
                <div className="admin-actions">
                  <button className="btn-approve" disabled={actioningId === r._id} onClick={() => reviewLeave(r._id, 'APPROVE')}>Approve</button>
                  <button className="btn-reject" disabled={actioningId === r._id} onClick={() => reviewLeave(r._id, 'REJECT')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Approvals</p><h2>Pending permission requests</h2></div></div>
        {permissionLoading ? (
          <p className="calendar-loading">Loading requests...</p>
        ) : permissionRequests.length === 0 ? (
          <p className="empty-note">No pending permission requests.</p>
        ) : (
          <div className="request-list">
            {permissionRequests.map((r) => (
              <div key={r._id} className="request-row">
                <div className="request-main">
                  <strong>{r.employee?.name} ({r.employee?.employeeId})</strong>
                  <span>{r.date} — {r.startTime} to {r.endTime}</span>
                  <span className="request-reason">{r.reason}</span>
                </div>
                <div className="admin-actions">
                  <button className="btn-approve" disabled={actioningId === r._id} onClick={() => reviewPermission(r._id, 'APPROVE')}>Approve</button>
                  <button className="btn-reject" disabled={actioningId === r._id} onClick={() => reviewPermission(r._id, 'REJECT')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Approvals</p><h2>Pending regularisation requests</h2></div></div>
        {regularisationLoading ? (
          <p className="calendar-loading">Loading requests...</p>
        ) : regularisationRequests.length === 0 ? (
          <p className="empty-note">No pending regularisation requests.</p>
        ) : (
          <div className="request-list">
            {regularisationRequests.map((r) => (
              <div key={r._id} className="request-row">
                <div className="request-main">
                  <strong>{r.employee?.name} ({r.employee?.employeeId})</strong>
                  <span>
                    {r.date}
                    {r.requestedLoginTime && ` · Login ${r.requestedLoginTime}`}
                    {r.requestedLogoutTime && ` · Logout ${r.requestedLogoutTime}`}
                  </span>
                  <span className="request-reason">{r.reason}</span>
                </div>
                <div className="admin-actions">
                  <button className="btn-approve" disabled={actioningId === r._id} onClick={() => reviewRegularisation(r._id, 'APPROVE')}>Approve</button>
                  <button className="btn-reject" disabled={actioningId === r._id} onClick={() => reviewRegularisation(r._id, 'REJECT')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Approvals</p><h2>Pending outside office visits</h2></div></div>
        {outsideVisitsLoading ? (
          <p className="calendar-loading">Loading visits...</p>
        ) : outsideVisits.length === 0 ? (
          <p className="empty-note">No pending outside office visits.</p>
        ) : (
          <div className="request-list">
            {outsideVisits.map((v) => (
              <div key={v._id} className="request-row">
                <div className="request-main outside-visit-row">
                  {v.photo && (
                    <img
                      src={v.photo}
                      alt="Visit"
                      className="visit-thumb clickable"
                      onClick={() => setPreviewPhoto(v.photo)}
                    />
                  )}
                  <div>
                    <strong>{v.employee?.name} ({v.employee?.employeeId})</strong>
                    <span>{OUTSIDE_REASON_LABELS[v.reason] || v.reason} — {new Date(v.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {v.notes && <span className="request-reason">{v.notes}</span>}
                  </div>
                </div>
                <div className="admin-actions">
                  <button className="btn-approve" disabled={actioningId === v._id} onClick={() => reviewOutsideVisit(v._id, 'APPROVE')}>Approve</button>
                  <button className="btn-reject" disabled={actioningId === v._id} onClick={() => reviewOutsideVisit(v._id, 'REJECT')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {previewPhoto && (
        <div className="verification-modal" role="dialog" aria-modal="true" onClick={() => setPreviewPhoto(null)}>
          <div className="photo-preview-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setPreviewPhoto(null)}>×</button>
            <img src={previewPhoto} alt="Full size" className="photo-preview-img" />
          </div>
        </div>
      )}
    </main>
  );
}