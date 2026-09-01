import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import './AdminDashboard.css';

const getErrorMessage = (error) => error.response?.data?.message
  || (error.code === 'ERR_NETWORK' ? 'Unable to reach the server.' : 'Something went wrong. Please try again.');

const formatDate = (value) => value ? new Date(value).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';

const statusClass = (status) => {
  switch (status) {
    case 'APPROVED': return 'status-approved';
    case 'REJECTED': return 'status-rejected';
    default: return 'status-pending';
  }
};

export default function AdminEmployeeDetail() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { employeeId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('attendance');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/employees/${employeeId}/detail`);
      setData(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDetail(); }, [employeeId]);

  const tabs = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'leave', label: 'Leave' },
    { key: 'permission', label: 'Permission' },
    { key: 'regularisation', label: 'Regularisation' },
    { key: 'outsideVisits', label: 'Outside Visits' },
  ];

  return (
    <main className="employee-dashboard phase-one-dashboard">
      <header className="employee-header">
        <div className="brand-lockup"><span className="brand-mark">K</span><span>KICKMAC</span></div>
        <div className="header-title"><span>Workspace</span><h1>Employee Detail</h1></div>
        <div className="employee-identity"><strong>{user?.name || 'Admin'}</strong><span>{user?.employeeId || 'Admin'} / Admin</span><button className="btn-secondary" onClick={handleLogout}>Log out</button></div>
      </header>

      <div style={{ marginBottom: '1.2rem' }}>
        <Link to="/admin/employees" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>← Back to employees</Link>
      </div>

      {message.text && <div className={`message ${message.type === 'error' ? 'error-message' : 'success-message'}`} role="status">{message.text}</div>}

      {loading ? (
        <p className="calendar-loading">Loading employee details...</p>
      ) : data && (
        <>
          <section className="attendance-card">
            <div className="card-heading">
              <div><p className="eyebrow">Profile</p><h2>{data.profile.name} ({data.profile.employeeId})</h2></div>
              <span className={`status-pill ${data.profile.isActive ? 'is-present' : ''}`}>{data.profile.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="attendance-metrics">
              <div><span>Email</span><strong>{data.profile.email || '—'}</strong></div>
              <div><span>Phone</span><strong>{data.profile.phone || '—'}</strong></div>
              <div><span>Department</span><strong>{data.profile.department || '—'}</strong></div>
              <div><span>Designation</span><strong>{data.profile.designation || '—'}</strong></div>
              <div><span>Joined</span><strong>{formatDate(data.profile.joiningDate)}</strong></div>
              <div><span>Salary</span><strong>{data.salary ? `₹${(data.salary.basicSalary + data.salary.allowances).toLocaleString()}` : 'Not set'}</strong></div>
            </div>
            <div className="leave-balance-grid" style={{ marginTop: '1rem' }}>
              {data.profile.leaveBalance && Object.entries(data.profile.leaveBalance).map(([key, val]) => (
                <div key={key} className="leave-balance-item">
                  <span className="leave-balance-label">{key}</span>
                  <strong>{val}</strong>
                  <span className="leave-balance-sub">eligible/year</span>
                </div>
              ))}
            </div>
          </section>

          <section className="attendance-card">
            <div className="card-heading">
              <div><p className="eyebrow">History</p><h2>Records</h2></div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  className={activeTab === t.key ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: 'auto' }}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'attendance' && (
              data.attendance.length === 0 ? <p className="empty-note">No attendance records.</p> : (
                <div className="admin-table">
                  <div className="admin-table-header"><span>Date</span><span>Login</span><span>Logout</span><span>Hours</span><span>Status</span></div>
                  {data.attendance.map((a) => (
                    <div key={a._id} className="admin-table-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                      <span>{a.date}</span>
                      <span>{formatTime(a.loginTime)}</span>
                      <span>{formatTime(a.logoutTime)}</span>
                      <span>{a.workingHours || 0}h</span>
                      <span>{a.attendanceStatus}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'leave' && (
              data.leave.length === 0 ? <p className="empty-note">No leave requests.</p> : (
                <div className="request-list">
                  {data.leave.map((r) => (
                    <div key={r._id} className="request-row">
                      <div className="request-main">
                        <strong>{r.leaveType.replace('_', ' ')}</strong>
                        <span>{r.fromDate} to {r.toDate} ({r.daysRequested} day{r.daysRequested !== 1 ? 's' : ''})</span>
                        <span className="request-reason">{r.reason}</span>
                      </div>
                      <span className={`status-pill ${statusClass(r.status)}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'permission' && (
              data.permission.length === 0 ? <p className="empty-note">No permission requests.</p> : (
                <div className="request-list">
                  {data.permission.map((r) => (
                    <div key={r._id} className="request-row">
                      <div className="request-main">
                        <strong>{r.date}</strong>
                        <span>{r.startTime} – {r.endTime}</span>
                        <span className="request-reason">{r.reason}</span>
                      </div>
                      <span className={`status-pill ${statusClass(r.status)}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'regularisation' && (
              data.regularisation.length === 0 ? <p className="empty-note">No regularisation requests.</p> : (
                <div className="request-list">
                  {data.regularisation.map((r) => (
                    <div key={r._id} className="request-row">
                      <div className="request-main">
                        <strong>{r.date}</strong>
                        <span>
                          {r.requestedLoginTime && `Login ${r.requestedLoginTime}`}
                          {r.requestedLoginTime && r.requestedLogoutTime && ' · '}
                          {r.requestedLogoutTime && `Logout ${r.requestedLogoutTime}`}
                        </span>
                        <span className="request-reason">{r.reason}</span>
                      </div>
                      <span className={`status-pill ${statusClass(r.status)}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'outsideVisits' && (
              data.outsideVisits.length === 0 ? <p className="empty-note">No outside visits.</p> : (
                <div className="request-list">
                  {data.outsideVisits.map((v) => (
                    <div key={v._id} className="request-row">
                      <div className="request-main outside-visit-row">
                        {v.photo && <img src={v.photo} alt="Visit" className="visit-thumb" />}
                        <div>
                          <strong>{v.reason.replace('_', ' ')}</strong>
                          <span>{new Date(v.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          {v.notes && <span className="request-reason">{v.notes}</span>}
                        </div>
                      </div>
                      <span className={`status-pill ${statusClass(v.status)}`}>{v.status}</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        </>
      )}
    </main>
  );
}