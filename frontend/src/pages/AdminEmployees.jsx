import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import '../pages/AdminDashboard.css';

const getErrorMessage = (error) => error.response?.data?.message
  || (error.code === 'ERR_NETWORK' ? 'Unable to reach the server.' : 'Something went wrong. Please try again.');

const emptyNewEmployee = {
  employeeId: '', name: '', email: '', phone: '', department: '', designation: '', password: '',
};

export default function AdminEmployees() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState('');
  const [salaryForm, setSalaryForm] = useState({ basicSalary: '', allowances: '' });
  const [saving, setSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState(emptyNewEmployee);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/employees');
      setEmployees(response.data.employees);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const startEdit = (emp) => {
    setEditingId(emp._id);
    setSalaryForm({
      basicSalary: emp.salary?.basicSalary ?? '',
      allowances: emp.salary?.allowances ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setSalaryForm({ basicSalary: '', allowances: '' });
  };

  const saveSalary = async (employeeId) => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put(`/admin/salary/${employeeId}`, {
        basicSalary: Number(salaryForm.basicSalary) || 0,
        allowances: Number(salaryForm.allowances) || 0,
      });
      setMessage({ type: 'success', text: 'Salary updated' });
      cancelEdit();
      loadEmployees();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setNewEmployee(emptyNewEmployee);
    setShowPassword(false);
  };

  const submitNewEmployee = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage({ type: '', text: '' });
    try {
      await api.post('/admin/employees', newEmployee);
      setMessage({ type: 'success', text: `Employee ${newEmployee.employeeId} created successfully` });
      closeAddForm();
      loadEmployees();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="employee-dashboard phase-one-dashboard">
      <header className="employee-header">
        <div className="brand-lockup"><span className="brand-mark">K</span><span>KICKMAC</span></div>
        <div className="header-title"><span>Workspace</span><h1>Employees</h1></div>
        <div className="employee-identity"><strong>{user?.name || 'Admin'}</strong><span>{user?.employeeId || 'Admin'} / Admin</span><button className="btn-secondary" onClick={handleLogout}>Log out</button></div>
      </header>

      <div style={{ marginBottom: '1.2rem' }}>
        <Link to="/admin" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>← Back to dashboard</Link>
      </div>

      {message.text && <div className={`message ${message.type === 'error' ? 'error-message' : 'success-message'}`} role="status">{message.text}</div>}

      <section className="attendance-card">
        <div className="card-heading">
          <div><p className="eyebrow">Team</p><h2>All employees ({employees.length})</h2></div>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddForm(true)}>+ Add Employee</button>
        </div>

        {loading ? (
          <p className="calendar-loading">Loading employees...</p>
        ) : (
          <div className="employee-list">
            {employees.map((emp) => (
              <div key={emp._id} className="employee-row">
                <div className="employee-row-main">
                  <strong>{emp.name}</strong>
                  <span className="employee-row-sub">{emp.employeeId} · {emp.designation || '—'} · {emp.department || '—'}</span>
                </div>

                {editingId === emp._id ? (
                  <div className="employee-salary-edit">
                    <input
                      type="number"
                      placeholder="Basic salary"
                      value={salaryForm.basicSalary}
                      onChange={(e) => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Allowances"
                      value={salaryForm.allowances}
                      onChange={(e) => setSalaryForm({ ...salaryForm, allowances: e.target.value })}
                    />
                    <button className="btn-approve" disabled={saving} onClick={() => saveSalary(emp._id)}>Save</button>
                    <button className="btn-reject" disabled={saving} onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <div className="employee-salary-view">
                    <span>
                      {emp.salary
                        ? `₹${emp.salary.basicSalary.toLocaleString()} + ₹${emp.salary.allowances.toLocaleString()} = ₹${(emp.salary.basicSalary + emp.salary.allowances).toLocaleString()}`
                        : 'No salary set'}
                    </span>
                    <button className="btn-secondary" onClick={() => startEdit(emp)}>Edit salary</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showAddForm && (
        <div className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="add-employee-title">
          <div className="verification-modal-card">
            <button className="modal-close" aria-label="Close" onClick={closeAddForm}>×</button>
            <p className="eyebrow">New employee</p>
            <h2 id="add-employee-title">Add Employee</h2>

            <form onSubmit={submitNewEmployee} className="permission-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    value={newEmployee.employeeId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                    placeholder="EMP002"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Full name</label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="Ravi Kumar"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="ravi@kickmac.com"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    placeholder="9876543210"
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    placeholder="Sales"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={newEmployee.designation}
                  onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                  placeholder="Helper / Manager / HR / Sales Executive"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary gps-button" disabled={creating}>
                {creating ? 'Creating...' : 'Create Employee'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}