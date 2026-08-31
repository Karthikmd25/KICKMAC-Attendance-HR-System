import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import './AdminDashboard.css';

const getErrorMessage = (error) => error.response?.data?.message
  || (error.code === 'ERR_NETWORK' ? 'Unable to reach the server.' : 'Something went wrong. Please try again.');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AdminSalary() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const response = await api.get('/admin/employees');
      setEmployees(response.data.employees);
      if (response.data.employees.length > 0) {
        setSelectedEmployeeId(response.data.employees[0]._id);
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const calculate = async () => {
    if (!selectedEmployeeId) return;
    setCalculating(true);
    setResult(null);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.get(`/admin/salary/${selectedEmployeeId}/calculate?month=${month}&year=${year}`);
      setResult(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <main className="employee-dashboard phase-one-dashboard">
      <header className="employee-header">
        <div className="brand-lockup"><span className="brand-mark">K</span><span>KICKMAC</span></div>
        <div className="header-title"><span>Workspace</span><h1>Salary</h1></div>
        <div className="employee-identity"><strong>{user?.name || 'Admin'}</strong><span>{user?.employeeId || 'Admin'} / Admin</span><button className="btn-secondary" onClick={handleLogout}>Log out</button></div>
      </header>

      <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.6rem' }}>
        <Link to="/admin" className="btn-secondary" style={{ textDecoration: 'none' }}>← Dashboard</Link>
        <Link to="/admin/employees" className="btn-secondary" style={{ textDecoration: 'none' }}>👥 Employees</Link>
      </div>

      {message.text && <div className={`message ${message.type === 'error' ? 'error-message' : 'success-message'}`} role="status">{message.text}</div>}

      <section className="attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Payroll</p><h2>Calculate salary</h2></div></div>

        {employeesLoading ? (
          <p className="calendar-loading">Loading employees...</p>
        ) : (
          <div className="salary-filter-row">
            <div className="form-group">
              <label>Employee</label>
              <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.employeeId}) — {emp.designation || 'No designation'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Year</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <button className="btn-primary" style={{ width: 'auto', marginTop: '1.4rem' }} disabled={calculating} onClick={calculate}>
              {calculating ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
        )}
      </section>

      {result && (
        <section className="attendance-card">
          <div className="card-heading">
            <div><p className="eyebrow">{MONTHS[result.month - 1]} {result.year}</p><h2>{result.employee.name} ({result.employee.employeeId})</h2></div>
            <span className="status-pill is-present">₹{result.netSalary.toLocaleString()}</span>
          </div>

          <div className="salary-breakdown">
            <div className="salary-section">
              <h3>Earnings</h3>
              <div className="salary-line"><span>Basic salary</span><strong>₹{result.basicSalary.toLocaleString()}</strong></div>
              <div className="salary-line"><span>Allowances</span><strong>₹{result.allowances.toLocaleString()}</strong></div>
              <div className="salary-line"><span>Overtime pay ({result.overtimeHours}h)</span><strong>₹{result.overtimePay.toLocaleString()}</strong></div>
              <div className="salary-line total"><span>Gross salary</span><strong>₹{result.grossSalary.toLocaleString()}</strong></div>
            </div>

            <div className="salary-section">
              <h3>Attendance</h3>
              <div className="salary-line"><span>Working days (month)</span><strong>{result.workingDaysPerMonth}</strong></div>
              <div className="salary-line"><span>Present days</span><strong>{result.presentDays}</strong></div>
              <div className="salary-line"><span>Half days</span><strong>{result.halfDays}</strong></div>
              <div className="salary-line"><span>Paid leave days</span><strong>{result.paidLeaveDays}</strong></div>
              <div className="salary-line"><span>Unpaid leave days</span><strong>{result.unpaidLeaveDays}</strong></div>
              <div className="salary-line total"><span>Total paid days</span><strong>{result.paidDays}</strong></div>
            </div>

            <div className="salary-section">
              <h3>Deductions</h3>
              <div className="salary-line"><span>LOP days</span><strong>{result.lopDays}</strong></div>
              <div className="salary-line"><span>LOP deduction</span><strong>₹{result.lopDeduction.toLocaleString()}</strong></div>
              <div className="salary-line"><span>Other deductions</span><strong>₹{result.otherDeductions.toLocaleString()}</strong></div>
              <div className="salary-line total"><span>Total deductions</span><strong>₹{result.totalDeductions.toLocaleString()}</strong></div>
            </div>

            <div className="salary-net">
              <span>Net salary</span>
              <strong>₹{result.netSalary.toLocaleString()}</strong>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}