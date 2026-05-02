import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserPlus, Upload, Search, X, Trash2, CheckCircle, Camera, SwitchCamera, Edit } from 'lucide-react';
import api from '../api';

interface Employee {
  id: number;
  emp_id: string;
  name: string;
  department: string;
  created_at: string;
  has_face: boolean;
}

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [faceMode, setFaceMode] = useState<'file' | 'webcam'>('webcam');

  // New Employee Form
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  
  // Edit Employee Form
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Webcam refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [shotCount, setShotCount] = useState(0);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/employees', { emp_id: empId, name, department, password });
      setShowModal(false);
      setEmpId(''); setName(''); setDepartment(''); setPassword('');
      fetchEmployees();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error adding employee');
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      await api.put(`/employees/${encodeURIComponent(editingEmployee.emp_id)}`, { 
        name: editName, 
        department: editDepartment 
      });
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error updating employee');
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    if (!window.confirm(`Delete employee "${empId}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/employees/${encodeURIComponent(empId)}`);
      fetchEmployees();
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert('Session expired. Please log in again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        alert(`Error deleting employee: ${error.response?.data?.detail || error.message}`);
      }
    }
  };

  // ── File upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/employees/${encodeURIComponent(selectedEmpId)}/faces`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Face registered successfully!');
      setShowFaceModal(false);
      fetchEmployees();
    } catch {
      alert('Failed to register face.');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Webcam helpers ──
  const startCamera = useCallback(async () => {
    setCameraError('');
    setCapturedPreview(null);
    setCapturedBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch {
      setCameraError('Camera access denied. Please allow permissions.');
      setCameraReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const openFaceModal = (empId: string) => {
    setSelectedEmpId(empId);
    setShotCount(0);
    setCapturedPreview(null);
    setCapturedBlob(null);
    setShowFaceModal(true);
  };

  useEffect(() => {
    if (showFaceModal && faceMode === 'webcam') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showFaceModal, faceMode, startCamera, stopCamera]);

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    const dataURL = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPreview(dataURL);
    canvas.toBlob((blob) => { if (blob) setCapturedBlob(blob); }, 'image/jpeg', 0.92);
  };

  const handleWebcamUpload = async () => {
    if (!capturedBlob) return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, 'face_capture.jpg');
      await api.post(`/employees/${encodeURIComponent(selectedEmpId)}/faces`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShotCount((c) => c + 1);
      setCapturedPreview(null);
      setCapturedBlob(null);
      fetchEmployees();
      alert(`Photo ${shotCount + 1} saved! You can take more or close the panel.`);
    } catch {
      alert('Failed to save photo.');
    } finally {
      setUploadLoading(false);
    }
  };

  const closeFaceModal = () => {
    stopCamera();
    setShowFaceModal(false);
    setCapturedPreview(null);
    setCapturedBlob(null);
  };

  const filtered = employees.filter(
    (e) =>
      e.emp_id.toLowerCase().includes(search.toLowerCase()) ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <UserPlus size={18} /> Add Employee
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search employees…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <span className="text-sm text-gray-500">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b text-sm text-gray-500">
              <th className="p-4 font-medium">Employee ID</th>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Department</th>
              <th className="p-4 font-medium">Joined</th>
              <th className="p-4 font-medium">Face Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id} className="border-b hover:bg-gray-50 transition">
                <td className="p-4 font-mono font-medium text-gray-900">{emp.emp_id}</td>
                <td className="p-4 font-medium text-gray-800">{emp.name}</td>
                <td className="p-4 text-gray-700">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    {emp.department}
                  </span>
                </td>
                <td className="p-4 text-gray-500 text-sm">{new Date(emp.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                  {emp.has_face ? (
                    <span className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
                      <CheckCircle size={16} /> Registered
                    </span>
                  ) : (
                    <span className="text-amber-500 text-sm font-medium">⚠ Not Registered</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openFaceModal(emp.emp_id)}
                      className="text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5"
                    >
                      <Camera size={14} /> {emp.has_face ? 'Add Photo' : 'Register Face'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingEmployee(emp);
                        setEditName(emp.name);
                        setEditDepartment(emp.department);
                      }}
                      className="text-amber-500 hover:text-amber-700 bg-amber-50 p-1.5 rounded transition"
                      title="Edit Employee"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.emp_id)}
                      className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition"
                      title="Delete Employee"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-400">
                  {employees.length === 0 ? 'No employees yet. Click "Add Employee" to get started.' : 'No results match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Employee Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Employee</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  required type="text" value={empId} onChange={(e) => setEmpId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. EMP001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  required type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  required type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portal Password</label>
                <input
                  required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Face Registration Modal ── */}
      {showFaceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Register Face Photo</h2>
                <p className="text-sm text-gray-500">Employee: <span className="font-semibold text-blue-600">{selectedEmpId}</span>
                  {shotCount > 0 && <span className="ml-2 text-green-600">✓ {shotCount} photo{shotCount > 1 ? 's' : ''} saved</span>}
                </p>
              </div>
              <button onClick={closeFaceModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setFaceMode('webcam')}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                  faceMode === 'webcam' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                }`}
              >
                <Camera size={15} /> Use Webcam
              </button>
              <button
                onClick={() => setFaceMode('file')}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                  faceMode === 'file' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                }`}
              >
                <Upload size={15} /> Upload File
              </button>
            </div>

            {/* Webcam mode */}
            {faceMode === 'webcam' && (
              <div>
                <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '4/3' }}>
                  {capturedPreview ? (
                    <img src={capturedPreview} className="w-full h-full object-cover" alt="Captured" />
                  ) : (
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                      autoPlay muted playsInline
                    />
                  )}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Oval guide */}
                  {!capturedPreview && cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-32 h-40 border-2 border-blue-400 rounded-full opacity-60"
                        style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }} />
                    </div>
                  )}

                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                      <div>
                        <p className="text-red-300 text-sm">{cameraError}</p>
                        <button onClick={startCamera} className="mt-2 bg-blue-600 text-white text-xs px-4 py-1.5 rounded-lg">
                          Retry
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 text-center mb-3">
                  💡 Tip: Take 3-5 photos from slightly different angles for best accuracy.
                </p>

                <div className="flex gap-2">
                  {capturedPreview ? (
                    <>
                      <button
                        onClick={() => { setCapturedPreview(null); setCapturedBlob(null); }}
                        className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                      >
                        <SwitchCamera size={16} /> Retake
                      </button>
                      <button
                        onClick={handleWebcamUpload}
                        disabled={uploadLoading}
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <CheckCircle size={16} />
                        {uploadLoading ? 'Saving…' : 'Save Photo'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={captureSnapshot}
                      disabled={!cameraReady}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Camera size={18} /> Capture Photo
                    </button>
                  )}
                </div>

                {shotCount > 0 && (
                  <button
                    onClick={closeFaceModal}
                    className="w-full mt-2 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Done ({shotCount} photo{shotCount > 1 ? 's' : ''} saved)
                  </button>
                )}
              </div>
            )}

            {/* File upload mode */}
            {faceMode === 'file' && (
              <div className="text-center py-6">
                <input
                  type="file" accept="image/*" ref={fileInputRef}
                  className="hidden" onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className="bg-blue-50 text-blue-600 rounded-full w-24 h-24 flex flex-col items-center justify-center mx-auto mb-4 hover:bg-blue-100 transition disabled:opacity-50"
                >
                  <Upload size={32} className="mb-1" />
                </button>
                <p className="font-medium text-gray-900 mb-1">
                  {uploadLoading ? 'Uploading…' : `Upload photo for ${selectedEmpId}`}
                </p>
                <p className="text-sm text-gray-500">Choose a clear frontal face photo</p>
                <p className="text-xs text-gray-400 mt-2">Recommended: 5-10 photos for better accuracy</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Edit Employee Modal ── */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Employee</h2>
              <button onClick={() => setEditingEmployee(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  disabled type="text" value={editingEmployee.emp_id}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-4 py-2.5 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  required type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  required type="text" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="Engineering"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingEmployee(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
