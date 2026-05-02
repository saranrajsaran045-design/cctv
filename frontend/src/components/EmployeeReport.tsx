import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Filter, Download } from 'lucide-react';
import api from '../api';

interface AttendanceLog {
  id: number;
  timestamp: string;
  camera_id: string;
}

const EmployeeReport: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/employee/my-attendance');
        setLogs(res.data);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Filter logs by period
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    const now = new Date();
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return logDate >= weekAgo;
    }
    if (period === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      return logDate >= monthAgo;
    }
    return true;
  });

  const presentCount = new Set(filteredLogs.map(l => l.timestamp.split('T')[0])).size;
  const totalDays = period === 'weekly' ? 7 : (period === 'monthly' ? 30 : presentCount);
  const missedCount = Math.max(0, totalDays - presentCount);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Report</h1>
          <p className="text-gray-500 mt-1">Detailed history of your check-ins.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Present</p>
            <h3 className="text-2xl font-bold text-green-600">{presentCount} Days</h3>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Missed Days</p>
            <h3 className="text-2xl font-bold text-red-500">{missedCount} Days</h3>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Method</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Working Hrs</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Object.entries(
              filteredLogs.reduce((acc: any, log) => {
                const date = log.timestamp.split('T')[0];
                if (!acc[date]) acc[date] = [];
                acc[date].push(log);
                return acc;
              }, {})
            ).sort((a, b) => b[0].localeCompare(a[0])).map(([date, dayLogs]: [string, any]) => {
              const sortedDayLogs = [...dayLogs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
              const inTime = sortedDayLogs[0];
              const outTime = sortedDayLogs.length > 1 ? sortedDayLogs[sortedDayLogs.length - 1] : null;
              
              let workingHoursStr = "-";
              if (inTime && outTime) {
                const diffMs = new Date(outTime.timestamp).getTime() - new Date(inTime.timestamp).getTime();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                workingHoursStr = `${diffHrs}h ${diffMins}m`;
              }
              
              return (
                <tr key={date} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-gray-900 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        In: {new Date(inTime.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {outTime && (
                        <span className="text-gray-500 text-xs flex items-center gap-1.5 mt-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          Out: {new Date(outTime.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {Array.from(new Set(dayLogs.map((l: any) => l.camera_id))).map((cam: any) => (
                        <span key={cam} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                          {cam}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900 font-medium font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                      {workingHoursStr}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                      <CheckCircle size={14} className="mr-1" /> Present
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredLogs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <XCircle size={48} className="text-gray-200" />
                    <p className="text-gray-400 font-medium">No records found for this period.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeReport;
