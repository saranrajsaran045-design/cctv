import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Lock, User } from 'lucide-react';
import api from '../api';

interface LoginProps {
  setIsAuthenticated: (auth: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ setIsAuthenticated }) => {
  const [role, setRole] = useState<'admin' | 'employee'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (role === 'admin') {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        response = await api.post('/token', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } else {
        response = await api.post('/employee/login', {
          emp_id: username,
          password: password
        });
      }
      
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', response.data.role);
      setIsAuthenticated(true);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center text-blue-600">
          <Camera size={48} />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          SmartTrack Portal
        </h2>
        <p className="mt-2 text-gray-600">Attendance & Management System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => { setRole('admin'); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${role === 'admin' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >
              Administrator
            </button>
            <button
              onClick={() => { setRole('employee'); setUsername(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${role === 'employee' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >
              Employee
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm text-center border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {role === 'admin' ? 'Admin Username' : 'Employee ID'}
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 py-2.5 border-gray-300 rounded-lg border transition"
                  placeholder={role === 'admin' ? 'admin' : 'EMP001'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 py-2.5 border-gray-300 rounded-lg border transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Authenticating...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
              </button>
            </div>
          </form>
        </div>
        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 CCTV Face Recognition Attendance System
        </p>
      </div>
    </div>
  );
};

export default Login;
