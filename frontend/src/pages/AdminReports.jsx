import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import './AdminDashboard.css';

const getErrorMessage = (error) => error.response?.data?.message
  || (error.code === 'ERR_NETWORK' ? 'Unable to reach the server.' : 'Something went wrong. Please try again.');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AdminReports() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState('attendance');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const generateReport = async () => {
    setLoading(true);
    setReport(null);
    setMessage({ type: '', text: '' });
    try {
      const endpoint = reportType === 'attendance'
        ? `/admin/reports/monthly-attendance?month=${month}&year=${year}`
        : `/admin/reports/leave?month=${month}&year=${year}`;
      const response = await api.get(endpoint);
      setReport(response.data.report);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const attendanceColumns = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'presentDays', label: 'Present Days' },
    { key: 'totalWorkingHours', label: 'Total Hours' },
    { key: 'lateCount', label: 'Late Count' },
  ];

  const leaveColumns = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'fromDate', label: 'From' },
    { key: 'toDate', label: 'To' },
    { key: 'daysRequested', label: 'Days' },
    { key: 'reason', label: 'Reason' },
  ];

  const columns = reportType === 'attendance' ? attendanceColumns : leaveColumns;
  const reportTitle = reportType === 'attendance' ? 'Monthly Attendance Report' : 'Leave Report';

  const exportCSV = () => {
    if (!report || report.length === 0) return;
    const rows = report.map((row) => {
      const obj = {};
      columns.forEach((col) => { obj[col.label] = row[col.key]; });
      return obj;
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-report-${MONTHS[month - 1]}-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!report || report.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`STAFFONLY - ${reportTitle}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`${MONTHS[month - 1]} ${year}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [columns.map((c) => c.label)],
      body: report.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 77, 41] },
    });

    doc.save(`${reportType}-report-${MONTHS[month - 1]}-${year}.pdf`);
  };

  return (
    <main className="employee-dashboard phase-one-dashboard">
      <header className="employee-header">
        <div className="brand-lockup"><span className="brand-mark">SO</span><span>STAFFONLY</span></div>
        <div className="header-title"><span>Workspace</span><h1>Reports</h1></div>
        <div className="employee-identity"><strong>{user?.name || 'Admin'}</strong><span>{user?.employeeId || 'Admin'} / Admin</span><button className="btn-secondary" onClick={handleLogout}>Log out</button></div>
      </header>

      <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.6rem' }}>
        <Link to="/admin" className="btn-secondary" style={{ textDecoration: 'none' }}>← Dashboard</Link>
        <Link to="/admin/employees" className="btn-secondary" style={{ textDecoration: 'none' }}>👥 Employees</Link>
        <Link to="/admin/salary" className="btn-secondary" style={{ textDecoration: 'none' }}>💰 Salary</Link>
      </div>

      {message.text && <div className={`message ${message.type === 'error' ? 'error-message' : 'success-message'}`} role="status">{message.text}</div>}

      <section className="attendance-card">
        <div className="card-heading"><div><p className="eyebrow">Generate</p><h2>Reports</h2></div></div>

        <div className="salary-filter-row">
          <div className="form-group">
            <label>Report type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="attendance">Monthly Attendance</option>
              <option value="leave">Leave Report</option>
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
          <button className="btn-primary" style={{ width: 'auto', marginTop: '1.4rem' }} disabled={loading} onClick={generateReport}>
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </section>

      {report && (
        <section className="attendance-card">
          <div className="card-heading">
            <div><p className="eyebrow">{MONTHS[month - 1]} {year}</p><h2>{reportTitle}</h2></div>
            <div className="admin-actions">
              <button className="btn-secondary" onClick={exportCSV} disabled={report.length === 0}>⬇ CSV</button>
              <button className="btn-secondary" onClick={exportPDF} disabled={report.length === 0}>⬇ PDF</button>
            </div>
          </div>

          {report.length === 0 ? (
            <p className="empty-note">No data found for this period.</p>
          ) : (
            <div className="admin-table">
              <div className="admin-table-header" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
                {columns.map((c) => <span key={c.key}>{c.label}</span>)}
              </div>
              {report.map((row, i) => (
                <div key={i} className="admin-table-row" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
                  {columns.map((c) => <span key={c.key}>{row[c.key]}</span>)}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}