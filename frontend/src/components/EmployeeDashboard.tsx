import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, AlertCircle, CheckCircle, LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { API_URL } from '../api';

interface EmployeeProfile {
  emp_id: string;
  name: string;
  department: string;
  has_face: boolean;
}

interface AttendanceLog {
  id: number;
  timestamp: string;
  camera_id: string;
}

const EmployeeDashboard: React.FC = () => {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Calendar State
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, logsRes] = await Promise.all([
          api.get('/employee/me'),
          api.get('/employee/my-attendance')
        ]);
        setProfile(profileRes.data);
        setLogs(logsRes.data);
      } catch (err) {
        console.error('Error fetching employee data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Attendance Logic
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(log => log.timestamp.startsWith(today)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const hasInTime = todayLogs.length > 0;
  const inTime = hasInTime ? new Date(todayLogs[0].timestamp) : null;

  const now = new Date();
  const diffMinutes = inTime ? (now.getTime() - inTime.getTime()) / (1000 * 60) : 0;
  // Allow marking out after just 1 minute for testing and practical use
  const canMarkOut = hasInTime && diffMinutes >= 1;
  const alreadyMarkedOut = todayLogs.length > 1;

  const totalDays = 30;
  const presentCount = logs.filter((v, i, a) => a.findIndex(t => t.timestamp.split('T')[0] === v.timestamp.split('T')[0]) === i).length;
  const missedCount = Math.max(0, totalDays - presentCount);

  // Calculate Total Working Hours
  let totalMs = 0;
  Object.values(
    logs.reduce((acc: any, log) => {
      const date = log.timestamp.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    }, {})
  ).forEach((dayLogs: any) => {
    const sorted = [...dayLogs].sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));
    if (sorted.length > 1) {
      totalMs += new Date(sorted[sorted.length - 1].timestamp).getTime() - new Date(sorted[0].timestamp).getTime();
    }
  });
  const totalHrs = Math.floor(totalMs / (1000 * 60 * 60));
  const totalMins = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

  const renderCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const presentDates = new Set(logs.map(l => l.timestamp.split('T')[0]));

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="p-2"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPresent = presentDates.has(dateStr);
      days.push(
        <div key={d} className={`p-2 text-center rounded-lg font-medium text-sm ${isPresent ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
          {d}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.name}</h1>
          <p className="text-gray-500 mt-1">Here's your attendance overview for today.</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowCalendar(!showCalendar)}
            className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition"
          >
            <Calendar size={18} className="text-blue-600" />
            <span className="font-medium text-gray-700">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </button>

          {showCalendar && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 w-72 z-50">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => {
                  if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); }
                  else setCurrentMonth(m => m-1);
                }} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
                <div className="font-bold text-gray-800 text-sm">
                  {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={() => {
                  if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); }
                  else setCurrentMonth(m => m+1);
                }} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400 mb-2">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Action Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Daily Attendance Control</h2>
            <p className="text-blue-100 opacity-90 max-w-md">
              {!hasInTime
                ? "You haven't marked your 'In Time' yet. Please use the camera to check-in."
                : canMarkOut
                  ? "You can now mark your 'Out Time'. Ensure you are in front of the camera."
                  : "In Time marked successfully. 'Out Time' button will be available after 1 minute."}
            </p>
            {hasInTime && (
              <div className="mt-4 flex items-center gap-4 bg-white/10 w-fit px-4 py-2 rounded-xl border border-white/20">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold opacity-70">Check-in Time</span>
                  <span className="font-mono font-bold text-lg">{inTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {alreadyMarkedOut && (
                  <>
                    <div className="w-px h-8 bg-white/20" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold opacity-70">Check-out Time</span>
                      <span className="font-mono font-bold text-lg">{new Date(todayLogs[todayLogs.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            {!hasInTime ? (
              <button
                onClick={() => navigate('/webcam-attendance')}
                className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-50 transition-all flex items-center gap-3 active:scale-95"
              >
                <LogIn size={24} /> Mark In Time
              </button>
            ) : canMarkOut ? (
              <button
                onClick={() => navigate('/webcam-attendance')}
                className="bg-green-400 text-green-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-green-300 transition-all flex items-center gap-3 active:scale-95"
              >
                <LogOut size={24} /> Mark Out Time
              </button>
            ) : (
              <div className="bg-white/20 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/30 flex flex-col items-center">
                <span className="text-sm font-bold opacity-80 mb-1">Out-time available in:</span>
                <span className="text-xl font-mono font-bold">
                  {Math.floor(1 - diffMinutes)}m {Math.floor((60 - (diffMinutes * 60) % 60))}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${hasInTime ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              {hasInTime ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Status Today</p>
              <h3 className={`text-xl font-bold ${hasInTime ? 'text-green-600' : 'text-amber-600'}`}>
                {hasInTime ? 'Present' : 'Not Marked'}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Present Days</p>
              <h3 className="text-xl font-bold text-gray-900">{presentCount}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Missed Days</p>
              <h3 className="text-xl font-bold text-gray-900">{missedCount}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <User size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Face Status</p>
              <h3 className={`text-xl font-bold ${profile?.has_face ? 'text-green-600' : 'text-red-500'}`}>
                {profile?.has_face ? 'Registered' : 'Not Set'}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Hours</p>
              <h3 className="text-xl font-bold text-gray-900 font-mono">
                {totalHrs}h {totalMins}m
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" /> Recent Activity
            </h3>
            <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="divide-y divide-gray-50">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Attendance Marked</p>
                    <p className="text-xs text-gray-500">via {log.camera_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                No attendance logs found for this period.
              </div>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-6">Your Profile</h3>
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg overflow-hidden">
              {profile?.has_face ? (
                <img
                  src={`${API_URL}/employees/${profile.emp_id}/face`}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <User size={48} />
              )}
            </div>
            <h4 className="font-bold text-lg text-gray-900">{profile?.name}</h4>
            <p className="text-sm text-gray-500">{profile?.emp_id}</p>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-xl">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Department</p>
              <p className="font-medium text-gray-900">{profile?.department}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Account Status</p>
              <p className="font-medium text-green-600 flex items-center gap-1.5">
                <CheckCircle size={14} /> Active
              </p>
            </div>
          </div>
          <button className="w-full mt-6 bg-blue-50 text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-100 transition">
            Edit Profile
          </button>
        </div>
      </div>


    </div>
  );
};

export default EmployeeDashboard;
