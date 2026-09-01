import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminEmployees from './pages/AdminEmployees';
import AdminSalary from './pages/AdminSalary';
import AdminReports from './pages/AdminReports';
import AdminEmployeeDetail from './pages/AdminEmployeeDetail';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
                    <Route
            path="/admin/employees"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminEmployees />
              </ProtectedRoute>
            }
          />
                    <Route
            path="/admin/salary"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminSalary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
         <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminReports />
              </ProtectedRoute>
            }
          />
           <Route
            path="/admin/employees/:employeeId"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminEmployeeDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;