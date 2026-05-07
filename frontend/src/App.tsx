import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import EmployeeSidebar from './components/EmployeeSidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeReport from './components/EmployeeReport';
import EmployeeProfile from './components/EmployeeProfile';
import Employees from './components/Employees';
import Cameras from './components/Cameras';
import Attendance from './components/Attendance';
import WebcamAttendance from './components/WebcamAttendance';
import HolidayManagement from './components/HolidayManagement';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  const [, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  
  // Get role directly from storage to ensure it's always sync'd with current token
  const role = localStorage.getItem('role') || 'admin';

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <div className="flex flex-col md:flex-row h-screen bg-gray-100">
                {role === 'admin' ? (
                  <Sidebar setIsAuthenticated={setIsAuthenticated} />
                ) : (
                  <EmployeeSidebar setIsAuthenticated={setIsAuthenticated} />
                )}
                <div className="flex-1 overflow-auto">
                  <main className="p-4 md:p-8">
                    <Routes>
                      {role === 'admin' ? (
                        <>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/employees" element={<Employees />} />
                          <Route path="/cameras" element={<Cameras />} />
                          <Route path="/attendance" element={<Attendance />} />
                          <Route path="/holidays" element={<HolidayManagement />} />
                        </>
                      ) : (
                        <>
                          <Route path="/" element={<EmployeeDashboard />} />
                          <Route path="/my-report" element={<EmployeeReport />} />
                          <Route path="/profile" element={<EmployeeProfile />} />
                        </>
                      )}
                      <Route path="/webcam-attendance" element={<WebcamAttendance />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
