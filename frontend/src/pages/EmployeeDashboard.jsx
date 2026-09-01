import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './EmployeeDashboard.css';
import OutsideVisit from '../components/OutsideVisit';

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : 'Not marked';

const formatWorkingHours = (hours) => {
  if (!hours) return '0h 0m';
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);

  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const getErrorMessage = (error) => error.response?.data?.message
  || (error.code === 'ERR_NETWORK' ? 'Unable to reach the attendance server.' : 'Something went wrong. Please try again.');

const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'EMERGENCY', label: 'Emergency Leave' },
  { value: 'OPTIONAL', label: 'Optional Leave' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'OTHER', label: 'Other' },
];

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const date = new Date();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [now, setNow] = useState(Date.now());
  const [verificationMinimized, setVerificationMinimized] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [permissionForm, setPermissionForm] = useState({ date: '', startTime: '', endTime: '', reason: '' });
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionSubmitting, setPermissionSubmitting] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'CASUAL', fromDate: '', toDate: '', halfDayType: 'FIRST_HALF', reason: '' });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveBalanceLoading, setLeaveBalanceLoading] = useState(true);
  const [showRegularisationForm, setShowRegularisationForm] = useState(false);
  const [regularisationForm, setRegularisationForm] = useState({ date: '', requestedLoginTime: '', requestedLogoutTime: '', reason: '' });
  const [regularisationRequests, setRegularisationRequests] = useState([]);
  const [regularisationLoading, setRegularisationLoading] = useState(true);
  const [regularisationSubmitting, setRegularisationSubmitting] = useState(false);
  const [outsideVisits, setOutsideVisits] = useState([]);
  const [outsideVisitsLoading, setOutsideVisitsLoading] = useState(true);

  const loadToday = async () => {
    setLoading(true);
    try {
      const response = await api.get('/attendance/today');
      // setDate(response.data.date);
      setAttendance(response.data.attendance);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadToday(); }, []);

  const loadCalendar = async () => {
    setCalendarLoading(true);
    try {
      const response = await api.get(`/attendance/calendar?month=${calendarMonth}&year=${calendarYear}`);
      setCalendarDays(response.data.calendar);
    } catch (error) {
      console.error('Failed to load calendar', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => { loadCalendar(); }, [calendarMonth, calendarYear]);

  const loadPermissionRequests = async () => {
    setPermissionLoading(true);
    try {
      const response = await api.get('/permission/my');
      setPermissionRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to load permission requests', error);
    } finally {
      setPermissionLoading(false);
    }
  };

  useEffect(() => { loadPermissionRequests(); }, []);

  const submitPermissionRequest = async (e) => {
    e.preventDefault();
    setPermissionSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.post('/permission', permissionForm);
      setMessage({ type: 'success', text: 'Permission request submitted' });
      setShowPermissionForm(false);
      setPermissionForm({ date: '', startTime: '', endTime: '', reason: '' });
      loadPermissionRequests();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setPermissionSubmitting(false);
    }
  };

  const permissionStatusClass = (status) => {
    switch (status) {
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return 'status-pending';
    }
  };

  const loadLeaveRequests = async () => {
    setLeaveLoading(true);
    try {
      const response = await api.get('/leave/my');
      setLeaveRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to load leave requests', error);
    } finally {
      setLeaveLoading(false);
    }
  };

  const loadLeaveBalance = async () => {
    setLeaveBalanceLoading(true);
    try {
      const response = await api.get('/leave/balance');
      setLeaveBalance(response.data.balance);
    } catch (error) {
      console.error('Failed to load leave balance', error);
    } finally {
      setLeaveBalanceLoading(false);
    }
  };

  useEffect(() => { loadLeaveRequests(); loadLeaveBalance(); }, []);

  const submitLeaveRequest = async (e) => {
    e.preventDefault();
    setLeaveSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        leaveType: leaveForm.leaveType,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.leaveType === 'HALF_DAY' ? leaveForm.fromDate : leaveForm.toDate,
        reason: leaveForm.reason,
      };
      if (leaveForm.leaveType === 'HALF_DAY') {
        payload.halfDayType = leaveForm.halfDayType;
      }
      await api.post('/leave', payload);
      setMessage({ type: 'success', text: 'Leave request submitted' });
      setShowLeaveForm(false);
      setLeaveForm({ leaveType: 'CASUAL', fromDate: '', toDate: '', halfDayType: 'FIRST_HALF', reason: '' });
      loadLeaveRequests();
      loadLeaveBalance();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const leaveTypeLabel = (type) => LEAVE_TYPES.find((t) => t.value === type)?.label || type;

  const loadRegularisationRequests = async () => {
    setRegularisationLoading(true);
    try {
      const response = await api.get('/regularisation/my');
      setRegularisationRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to load regularisation requests', error);
    } finally {
      setRegularisationLoading(false);
    }
  };

  useEffect(() => { loadRegularisationRequests(); }, []);

  const submitRegularisationRequest = async (e) => {
    e.preventDefault();
    setRegularisationSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.post('/regularisation', regularisationForm);
      setMessage({ type: 'success', text: 'Regularisation request submitted' });
      setShowRegularisationForm(false);
      setRegularisationForm({ date: '', requestedLoginTime: '', requestedLogoutTime: '', reason: '' });
      loadRegularisationRequests();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setRegularisationSubmitting(false);
    }
  };

  const loadOutsideVisits = async () => {
    setOutsideVisitsLoading(true);
    try {
      const response = await api.get('/outside-visit/my');
      setOutsideVisits(response.data.visits);
    } catch (error) {
      console.error('Failed to load outside visits', error);
    } finally {
      setOutsideVisitsLoading(false);
    }
  };

  useEffect(() => { loadOutsideVisits(); }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const goToPreviousMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const monthName = new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });

  const statusClass = (status) => {
    switch (status) {
      case 'PRESENT': return 'day-present';
      case 'ABSENT': return 'day-absent';
      case 'LEAVE': return 'day-leave';
      case 'HALF_DAY': return 'day-half';
      case 'HOLIDAY': return 'day-holiday';
      case 'LATE': return 'day-late';
      case 'UPCOMING': return 'day-upcoming';
      default: return '';
    }
  };

  const getPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          });
        },
        (error) => {
          switch (error.code) {
            case 1:
              reject(new Error('Location permission denied. Please allow Location access for this site.'));
              break;
            case 2:
              reject(new Error('Unable to determine your location. Turn on GPS/Location and try again.'));
              break;
            case 3:
              reject(new Error('GPS request timed out. Please try again.'));
              break;
            default:
              reject(new Error('Unable to get your current location.'));
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });

  const markAttendance = async (type, successMessage) => {
    setAction(type);
    setMessage({ type: '', text: 'Getting your location...' });
    try {
      const response = await api.post(`/attendance/${type}`, await getPosition());
      setAttendance(response.data.attendance);
      setMessage({ type: 'success', text: successMessage });
      loadCalendar();
    } catch (error) {
      setMessage({ type: 'error', text: error.message?.includes('location') || error.message?.includes('Location')
        ? error.message : getErrorMessage(error) });
    } finally {
      setAction('');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const isLoggedIn = Boolean(attendance?.loginTime);
  const isLoggedOut = Boolean(attendance?.logoutTime);
  const lunchOutMarked = Boolean(attendance?.lunchOut);
  const lunchInMarked = Boolean(attendance?.lunchIn);
  const verification = attendance?.fifteenMinuteCheck;
  const verificationDueAt = verification?.requiredAt ? new Date(verification.requiredAt).getTime() : 0;
  const verificationComplete = Boolean(verification?.gpsVerified || verification?.completed);
  const verificationRequired = isLoggedIn && !isLoggedOut && !verificationComplete && verificationDueAt > 0 && now >= verificationDueAt;
  const remainingSeconds = Math.max(0, Math.ceil((verificationDueAt - now) / 1000));
  const verificationStatus = verificationComplete ? 'Verified' : verificationRequired ? 'Verification required' : 'Waiting';
  const status = attendance?.attendanceStatus === 'PRESENT' ? 'Present' : (attendance?.attendanceStatus || 'Not marked').replace('_', ' ');
  const gpsVerified = attendance?.loginLocationStatus === 'VERIFIED' && (!isLoggedOut || attendance.logoutLocationStatus === 'VERIFIED');

  return (
    <main className="employee-dashboard phase-one-dashboard">
      <header className="employee-header">
        <div className="brand-lockup"><span className="brand-mark">K</span><span>KICKMAC</span></div>
        <div className="header-title"><span>Workspace</span><h1>Employee Dashboard</h1></div>
        <div className="employee-identity"><strong>{user?.name || 'Employee'}</strong><span>{user?.employeeId || 'Employee'} / Employee</span><button className="btn-secondary" onClick={handleLogout}>Log out</button></div>
      </header>

      <section className="welcome-row"><div><p className="eyebrow">Good morning, {user?.name?.split(' ')[0] || 'there'}</p><h2>Track your attendance.</h2></div><div className="date-chip">{formatDate(date)}</div></section>
      {message.text && <div className={`message ${message.type === 'error' ? 'error-message' : message.type === 'success' ? 'success-message' : 'info-message'}`} role="status">{message.text}</div>}

      <section className="phase-one-attendance attendance-card primary-card">
        <div className="card-heading"><div><p className="eyebrow">Today&apos;s attendance</p><h2>{isLoggedOut ? 'Attendance complete' : isLoggedIn ? 'You are checked in' : 'You are not checked in'}</h2></div><span className={`status-pill ${isLoggedIn ? 'is-present' : ''}`}>{status}</span></div>
        <div className="attendance-metrics"><div><span>Login time</span><strong>{formatTime(attendance?.loginTime)}</strong></div><div><span>Logout time</span><strong>{formatTime(attendance?.logoutTime)}</strong></div><div><span>Working hours</span><strong>{formatWorkingHours(attendance?.workingHours)}</strong></div><div><span>GPS status</span><strong className={gpsVerified ? 'verified' : ''}>{gpsVerified ? 'Verified' : 'Not verified'}</strong></div></div>
        <div className="attendance-location"><span>Employee ID</span><strong>{user?.employeeId || 'Not available'}</strong><span>Role</span><strong>Employee</strong></div>
        <div className="action-row">
          {!isLoggedIn && <button className="btn-primary gps-button" disabled={loading || Boolean(action)} onClick={() => markAttendance('login', 'Attendance marked successfully')}><span>◎</span>{action === 'login' ? 'Getting your location...' : 'Mark login'}</button>}
          {isLoggedIn && !isLoggedOut && <button className="btn-primary gps-button" disabled={Boolean(action)} onClick={() => markAttendance('logout', 'Attendance marked successfully')}><span>◎</span>{action === 'logout' ? 'Getting your location...' : 'Mark logout'}</button>}
          {isLoggedOut && <div className="complete-note">Attendance completed ✓</div>}
        </div>
      </section>
      <section className="lunch-card attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Break time</p><h2>Lunch break</h2></div><span className="lunch-icon">⌁</span></div>
        <div className="lunch-details"><div><span>Lunch out</span><strong>{formatTime(attendance?.lunchOut)}</strong></div><div><span>Lunch in</span><strong>{formatTime(attendance?.lunchIn)}</strong></div><div><span>Lunch duration</span><strong>{attendance?.lunchDurationMinutes || 0} minutes</strong></div></div>
        <div className="lunch-status"><span>GPS verification</span><strong className={lunchOutMarked && lunchInMarked ? 'verified' : ''}>{lunchOutMarked && lunchInMarked ? '✓ Verified' : 'Not verified'}</strong></div>
        <div className="action-row">
          <button className="btn-secondary" disabled={!isLoggedIn || isLoggedOut || lunchOutMarked || Boolean(action)} onClick={() => markAttendance('lunch-out', 'Lunch out marked successfully')}>🍴 Lunch out</button>
          <button className="btn-secondary" disabled={!isLoggedIn || isLoggedOut || !lunchOutMarked || lunchInMarked || Boolean(action)} onClick={() => markAttendance('lunch-in', 'Lunch in marked successfully')}>↩ Lunch in</button>
          {lunchInMarked && <div className="complete-note">Lunch break completed ✓</div>}
        </div>
      </section>
      {isLoggedIn && <section className="verification-card attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Attendance verification</p><h2>15-minute verification</h2></div><span className={`status-pill ${verificationComplete ? 'is-present' : verificationRequired ? 'is-required' : ''}`}>{verificationStatus}</span></div>
        <div className="verification-summary"><div><span>Status</span><strong>{verificationStatus}</strong></div><div><span>{verificationRequired ? 'Action' : 'Time remaining'}</span><strong>{verificationRequired ? 'Please verify your location' : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`}</strong></div><div><span>Verified at</span><strong>{formatTime(verification?.verifiedAt)}</strong></div></div>
        {!verificationComplete && verificationRequired && <button className="btn-primary gps-button" disabled={Boolean(action)} onClick={() => markAttendance('verification', 'Location verified')}><span>◎</span>{action === 'verification' ? 'Getting your location...' : 'Verify location'}</button>}
      </section>}

      <section className="calendar-card attendance-card">
        <div className="card-heading">
          <div><p className="eyebrow">Your record</p><h2>Attendance calendar</h2></div>
          <div className="calendar-nav">
            <button className="btn-secondary" onClick={goToPreviousMonth}>‹</button>
            <span className="calendar-month-label">{monthName}</span>
            <button className="btn-secondary" onClick={goToNextMonth}>›</button>
          </div>
        </div>
        {calendarLoading ? (
          <p className="calendar-loading">Loading calendar...</p>
        ) : (
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="calendar-day-label">{d}</div>
            ))}
            {calendarDays.length > 0 && Array.from({ length: new Date(calendarYear, calendarMonth - 1, 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty"></div>
            ))}
            {calendarDays.map((day) => {
              const now = new Date();

            const localToday =
           `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

              const isToday = day.date === localToday;
              const hasData = day.status !== 'UPCOMING' && day.status !== 'ABSENT';
              const dayClass = day.status === 'ABSENT' ? '' : statusClass(day.status);
              return (
                <div key={day.date} className={`calendar-day ${dayClass} ${isToday ? 'is-today' : ''}`}>
                  <span className="calendar-day-number">{parseInt(day.date.slice(-2), 10)}</span>
                  {hasData && <span className="calendar-day-dot"></span>}
                </div>
              );
            })}
          </div>
        )}
        <div className="calendar-legend">
          <span className="legend-item"><span className="dot legend-present"></span>Present</span>
          <span className="legend-item"><span className="dot legend-absent"></span>Absent</span>
          <span className="legend-item"><span className="dot legend-leave"></span>Leave</span>
          <span className="legend-item"><span className="dot legend-half"></span>Half day</span>
          <span className="legend-item"><span className="dot legend-holiday"></span>Holiday</span>
          <span className="legend-item"><span className="dot legend-late"></span>Late</span>
        </div>
      </section>

      <section className="leave-card attendance-card">
        <div className="card-heading">
          <div><p className="eyebrow">Time off</p><h2>Leave balance</h2></div>
          <button className="btn-primary" onClick={() => setShowLeaveForm(true)}>+ Apply leave</button>
        </div>
        {leaveBalanceLoading ? (
          <p className="calendar-loading">Loading balance...</p>
        ) : leaveBalance && (
          <div className="leave-balance-grid">
            {Object.entries(leaveBalance).map(([key, val]) => (
              <div key={key} className="leave-balance-item">
                <span className="leave-balance-label">{key}</span>
                <strong>{val.remaining}</strong>
                <span className="leave-balance-sub">of {val.eligible} left</span>
              </div>
            ))}
          </div>
        )}

        <div className="card-heading" style={{ marginTop: '1.5rem' }}>
          <div><p className="eyebrow">History</p><h2>Leave requests</h2></div>
        </div>
        {leaveLoading ? (
          <p className="calendar-loading">Loading requests...</p>
        ) : leaveRequests.length === 0 ? (
          <p className="empty-note">No leave requests yet.</p>
        ) : (
          <div className="request-list">
            {leaveRequests.map((r) => (
              <div key={r._id} className="request-row">
                <div className="request-main">
                  <strong>{leaveTypeLabel(r.leaveType)}</strong>
                  <span>
                    {new Date(`${r.fromDate}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    {r.fromDate !== r.toDate && ` – ${new Date(`${r.toDate}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}`}
                    {' '}({r.daysRequested} day{r.daysRequested !== 1 ? 's' : ''})
                  </span>
                  <span className="request-reason">{r.reason}</span>
                </div>
                <span className={`status-pill ${permissionStatusClass(r.status)}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="permission-card attendance-card">
        <div className="card-heading">
          <div><p className="eyebrow">Requests</p><h2>Permission</h2></div>
          <button className="btn-primary" onClick={() => setShowPermissionForm(true)}>+ New request</button>
        </div>
        {permissionLoading ? (
          <p className="calendar-loading">Loading requests...</p>
        ) : permissionRequests.length === 0 ? (
          <p className="empty-note">No permission requests yet.</p>
        ) : (
          <div className="request-list">
            {permissionRequests.map((r) => (
              <div key={r._id} className="request-row">
                <div className="request-main">
                  <strong>{new Date(`${r.date}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  <span>{r.startTime} – {r.endTime}</span>
                  <span className="request-reason">{r.reason}</span>
                </div>
                <span className={`status-pill ${permissionStatusClass(r.status)}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="regularisation-card attendance-card">
        <div className="card-heading">
          <div><p className="eyebrow">Corrections</p><h2>Regularisation</h2></div>
          <button className="btn-primary" onClick={() => setShowRegularisationForm(true)}>+ New request</button>
        </div>
        {regularisationLoading ? (
          <p className="calendar-loading">Loading requests...</p>
        ) : regularisationRequests.length === 0 ? (
          <p className="empty-note">No regularisation requests yet.</p>
        ) : (
          <div className="request-list">
            {regularisationRequests.map((r) => (
              <div key={r._id} className="request-row">
                <div className="request-main">
                  <strong>{new Date(`${r.date}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  <span>
                    {r.requestedLoginTime && `Login ${r.requestedLoginTime}`}
                    {r.requestedLoginTime && r.requestedLogoutTime && ' · '}
                    {r.requestedLogoutTime && `Logout ${r.requestedLogoutTime}`}
                  </span>
                  <span className="request-reason">{r.reason}</span>
                </div>
                <span className={`status-pill ${permissionStatusClass(r.status)}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {showPermissionForm && (
        <div className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="permission-title">
          <div className="verification-modal-card">
            <button className="modal-close" aria-label="Close" onClick={() => setShowPermissionForm(false)}>×</button>
            <p className="eyebrow">New request</p>
            <h2 id="permission-title">Permission request</h2>
            <form onSubmit={submitPermissionRequest} className="permission-form">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={permissionForm.date}
                  onChange={(e) => setPermissionForm({ ...permissionForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>From</label>
                  <input
                    type="time"
                    value={permissionForm.startTime}
                    onChange={(e) => setPermissionForm({ ...permissionForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>To</label>
                  <input
                    type="time"
                    value={permissionForm.endTime}
                    onChange={(e) => setPermissionForm({ ...permissionForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  value={permissionForm.reason}
                  onChange={(e) => setPermissionForm({ ...permissionForm, reason: e.target.value })}
                  placeholder="Personal work"
                  required
                />
              </div>
              <button type="submit" className="btn-primary gps-button" disabled={permissionSubmitting}>
                {permissionSubmitting ? 'Submitting...' : 'Submit request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showLeaveForm && (
        <div className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="verification-modal-card">
            <button className="modal-close" aria-label="Close" onClick={() => setShowLeaveForm(false)}>×</button>
            <p className="eyebrow">New request</p>
            <h2 id="leave-title">Apply for leave</h2>
            <form onSubmit={submitLeaveRequest} className="permission-form">
              <div className="form-group">
                <label>Leave type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {leaveForm.leaveType === 'HALF_DAY' ? (
                <>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={leaveForm.fromDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Half</label>
                    <select
                      value={leaveForm.halfDayType}
                      onChange={(e) => setLeaveForm({ ...leaveForm, halfDayType: e.target.value })}
                    >
                      <option value="FIRST_HALF">First half</option>
                      <option value="SECOND_HALF">Second half</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label>From date</label>
                    <input
                      type="date"
                      value={leaveForm.fromDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>To date</label>
                    <input
                      type="date"
                      value={leaveForm.toDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Reason for leave"
                  required
                />
              </div>
              <button type="submit" className="btn-primary gps-button" disabled={leaveSubmitting}>
                {leaveSubmitting ? 'Submitting...' : 'Submit request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showRegularisationForm && (
        <div className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="regularisation-title">
          <div className="verification-modal-card">
            <button className="modal-close" aria-label="Close" onClick={() => setShowRegularisationForm(false)}>×</button>
            <p className="eyebrow">New request</p>
            <h2 id="regularisation-title">Regularisation request</h2>
            <form onSubmit={submitRegularisationRequest} className="permission-form">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={regularisationForm.date}
                  onChange={(e) => setRegularisationForm({ ...regularisationForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Correct login time</label>
                  <input
                    type="time"
                    value={regularisationForm.requestedLoginTime}
                    onChange={(e) => setRegularisationForm({ ...regularisationForm, requestedLoginTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Correct logout time</label>
                  <input
                    type="time"
                    value={regularisationForm.requestedLogoutTime}
                    onChange={(e) => setRegularisationForm({ ...regularisationForm, requestedLogoutTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  value={regularisationForm.reason}
                  onChange={(e) => setRegularisationForm({ ...regularisationForm, reason: e.target.value })}
                  placeholder="I forgot to mark logout"
                  required
                />
              </div>
              <button type="submit" className="btn-primary gps-button" disabled={regularisationSubmitting}>
                {regularisationSubmitting ? 'Submitting...' : 'Submit request'}
              </button>
            </form>
          </div>
        </div>
      )}

      <OutsideVisit
        visits={outsideVisits}
        loading={outsideVisitsLoading}
        onSubmitted={loadOutsideVisits}
        setMessage={setMessage}
      />

      {verificationRequired && !verificationMinimized && <div className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-title"><div className="verification-modal-card"><button className="modal-close" aria-label="Minimize verification" onClick={() => setVerificationMinimized(true)}>×</button><p className="eyebrow">Attendance check</p><h2 id="verification-title">15 minutes have been completed.</h2><p>Please verify your current location.</p><div className="modal-status">GPS status: <strong>Not verified</strong></div><button className="btn-primary gps-button" disabled={Boolean(action)} onClick={() => markAttendance('verification', 'Location verified')}><span>◎</span>{action === 'verification' ? 'Getting your location...' : 'Verify location'}</button></div></div>}
    </main>
  );
}