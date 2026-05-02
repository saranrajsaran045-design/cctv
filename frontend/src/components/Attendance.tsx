import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, XCircle, Edit2 } from 'lucide-react';
import api, { API_URL } from '../api';

interface AttendanceLog {
  id: number;
  employee_id: number;
  camera_id: string;
  timestamp: string;
  employee: {
    emp_id: string;
    name: string;
    department: string;
  } | null;
}

const Attendance: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [period, setPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [editTimestamp, setEditTimestamp] = useState('');
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/attendance', { params: { period } });
      setLogs(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [period]);

  const handleExport = () => {
    const token = localStorage.getItem('token');
    window.open(`${API_URL}/attendance/export?token=${token}&period=${period}`, '_blank');
  };

  const handleUpdate = async () => {
    if (!editingLog) return;
    try {
      await api.put(`/manage-log/${editingLog.id}`, { timestamp: editTimestamp });
      setEditingLog(null);
      fetchLogs();
    } catch (err) {
      alert('Failed to update timestamp');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/manage-log/${id}`);
      setIsDeleting(null);
      fetchLogs();
    } catch (err) {
      alert('Failed to delete record');
    }
  };

  const periods = [
    { id: 'all', label: 'All History' },
    { id: 'daily', label: 'Daily Report' },
    { id: 'weekly', label: 'Weekly Report' },
    { id: 'monthly', label: 'Monthly Report' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Reports</h1>
          <p className="text-gray-500 mt-1">View and export attendance logs for your office.</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition shadow-md flex items-center gap-2"
        >
          <Download size={20} /> Export CSV
        </button>
      </div>

      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-full max-w-2xl">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id as any)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              period === p.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Calendar size={16} />
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50 flex items-center gap-3">
          <Filter size={20} className="text-gray-400" />
          <h3 className="font-bold text-gray-700">
            Showing {logs.length} record{logs.length !== 1 ? 's' : ''} 
            <span className="text-gray-400 font-normal ml-2">({period} view)</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b text-xs uppercase tracking-wider text-gray-400">
                <th className="p-6 font-semibold">Date</th>
                <th className="p-6 font-semibold">Employee Details</th>
                <th className="p-6 font-semibold">Department</th>
                <th className="p-6 font-semibold">In-Time</th>
                <th className="p-6 font-semibold">Out-Time</th>
                <th className="p-6 font-semibold">Working Hours</th>
                <th className="p-6 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.values(
                logs.reduce((acc: any, log) => {
                  const date = log.timestamp.split('T')[0];
                  const empId = log.employee?.emp_id || `unknown_${log.id}`;
                  const key = `${date}_${empId}`;
                  if (!acc[key]) acc[key] = { date, employee: log.employee, logs: [] };
                  acc[key].logs.push(log);
                  return acc;
                }, {})
              ).map((group: any, idx: number) => {
                const sortedLogs = [...group.logs].sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));
                const inLog = sortedLogs[0];
                const outLog = sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 1] : null;

                let workingHoursStr = "-";
                if (inLog && outLog) {
                  const diffMs = new Date(outLog.timestamp).getTime() - new Date(inLog.timestamp).getTime();
                  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  workingHoursStr = `${diffHrs}h ${diffMins}m`;
                }

                return (
                  <tr key={`${group.date}_${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-6">
                      <span className="text-gray-900 font-bold">
                        {new Date(group.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="p-6">
                      {group.employee ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                            {group.employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-gray-900 font-bold group-hover:text-blue-600 transition-colors">{group.employee.name}</p>
                            <p className="text-gray-400 text-xs font-mono">{group.employee.emp_id}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unknown User</span>
                      )}
                    </td>
                    <td className="p-6">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                        {group.employee?.department || '-'}
                      </span>
                    </td>
                    <td className="p-6">
                      {inLog ? (
                        <div className="flex items-center gap-3 group/edit">
                          <span className="text-gray-900 font-bold">
                            {new Date(inLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="opacity-0 group-hover/edit:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => { setEditingLog(inLog); setEditTimestamp(inLog.timestamp.replace('Z', '').replace('T', ' ').substring(0, 19)); }} className="text-blue-400 hover:text-blue-600" title="Edit In-Time">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => setIsDeleting(inLog.id)} className="text-red-400 hover:text-red-600" title="Delete In-Time">
                              <XCircle size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-6">
                      {outLog ? (
                        <div className="flex items-center gap-3 group/edit">
                          <span className="text-gray-900 font-bold">
                            {new Date(outLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="opacity-0 group-hover/edit:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => { setEditingLog(outLog); setEditTimestamp(outLog.timestamp.replace('Z', '').replace('T', ' ').substring(0, 19)); }} className="text-blue-400 hover:text-blue-600" title="Edit Out-Time">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => setIsDeleting(outLog.id)} className="text-red-400 hover:text-red-600" title="Delete Out-Time">
                              <XCircle size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-6">
                      <span className="text-gray-900 font-medium font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                        {workingHoursStr}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Present
                      </span>
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-gray-400">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Edit Attendance Time</h2>
              <button onClick={() => setEditingLog(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Timestamp (YYYY-MM-DD HH:MM:SS)</label>
                <input 
                  type="text"
                  value={editTimestamp}
                  onChange={(e) => setEditTimestamp(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 text-sm text-blue-700">
                <Filter size={20} className="shrink-0" />
                <p>Employee: <strong>{editingLog.employee?.name}</strong><br/>Original: {new Date(editingLog.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => setEditingLog(null)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdate}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                Update Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleting !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Record?</h2>
              <p className="text-gray-500 text-sm">This attendance record will be permanently removed.</p>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => setIsDeleting(null)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(isDeleting)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
