import React, { useEffect, useState } from 'react';
import { Users, Camera, ClipboardList, XCircle, Edit2 } from 'lucide-react';
import api from '../api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    employees: 0,
    cameras: 0,
    todayAttendance: 0
  });
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editTimestamp, setEditTimestamp] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      const [empRes, camRes, attRes] = await Promise.all([
        api.get('/employees'),
        api.get('/cameras/active'),
        api.get('/attendance')
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const todayCount = attRes.data.filter((log: any) => log.timestamp.startsWith(today)).length;

      setStats({
        employees: empRes.data.length,
        cameras: camRes.data.cameras.length,
        todayAttendance: todayCount
      });
      setAllLogs(attRes.data);
    } catch (error) {
      console.error("Error fetching stats", error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = async () => {
    if (!editingRow) return;
    try {
      await api.put(`/manage-log/${editingRow.outId}`, { timestamp: editTimestamp });
      setEditingRow(null);
      fetchStats();
    } catch (err) {
      alert('Failed to update timestamp');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/manage-log/${id}`);
      setIsDeletingId(null);
      fetchStats();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.employees}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Cameras</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.cameras}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Camera size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Attendance</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.todayAttendance}</p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <ClipboardList size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600" /> Today's Live Presence
          </h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
            Live Feed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b text-xs uppercase tracking-wider text-gray-400 font-bold">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">In Time</th>
                <th className="px-6 py-4">Latest Out</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(
                allLogs.filter((log: any) => log.timestamp.startsWith(new Date().toISOString().split('T')[0]))
                  .reduce((acc: any, log: any) => {
                    const empId = log.employee?.emp_id || 'unknown';
                    if (!acc[empId]) {
                      acc[empId] = {
                        name: log.employee?.name || 'Unknown',
                        dept: log.employee?.department || '-',
                        in: log.timestamp,
                        inId: log.id,
                        out: log.timestamp,
                        outId: log.id
                      };
                    } else {
                      if (log.timestamp < acc[empId].in) {
                        acc[empId].in = log.timestamp;
                        acc[empId].inId = log.id;
                      }
                      if (log.timestamp > acc[empId].out) {
                        acc[empId].out = log.timestamp;
                        acc[empId].outId = log.id;
                      }
                    }
                    return acc;
                  }, {})
              ).map((row: any) => (
                <tr key={row.name} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{row.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                      {row.dept}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-600 font-bold">
                      {new Date(row.in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-blue-600 font-bold">
                      {row.in === row.out ? '-' : new Date(row.out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingRow(row);
                          setEditTimestamp(row.out.replace('Z', '').replace('T', ' ').substring(0, 19));
                        }}
                        className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit Record"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setIsDeletingId(row.outId)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Record"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {allLogs.filter((log: any) => log.timestamp.startsWith(new Date().toISOString().split('T')[0])).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    No attendance records for today yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Edit Attendance Time</h2>
              <button onClick={() => setEditingRow(null)} className="text-gray-400 hover:text-gray-600">
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-sm text-gray-500">Employee: <strong>{editingRow.name}</strong></p>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => setEditingRow(null)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdate}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeletingId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Record?</h2>
              <p className="text-gray-500 text-sm">This record will be removed from today's presence.</p>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => setIsDeletingId(null)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(isDeletingId)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
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

export default Dashboard;
