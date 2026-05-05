import React, { useState, useEffect } from 'react';
import { User, Building, Shield, BadgeCheck, Camera, Calendar, XCircle, Upload, Key, X } from 'lucide-react';
import api, { API_URL } from '../api';

interface EmployeeProfileData {
  emp_id: string;
  name: string;
  department: string;
  has_face: boolean;
  created_at: string;
}

const EmployeeProfile: React.FC = () => {
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [faceMode, setFaceMode] = useState<'file' | 'webcam'>('webcam');

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Webcam state
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [, setCameraError] = useState('');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [shotCount, setShotCount] = useState(0);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/employee/me');
      setProfile(res.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      await api.put('/employee/change-password', { new_password: newPassword });
      alert('Password updated successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error updating password');
    }
  };

  const startCamera = React.useCallback(async () => {
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
      setCameraError('Camera access denied.');
      setCameraReady(false);
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  React.useEffect(() => {
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
    if (!capturedBlob || !profile) return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, 'face_capture.jpg');
      await api.post(`/employees/${encodeURIComponent(profile.emp_id)}/faces`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShotCount((c) => c + 1);
      setCapturedPreview(null);
      setCapturedBlob(null);
      fetchProfile();
    } catch {
      alert('Failed to save photo.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return;
    const file = e.target.files[0];
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/employees/${encodeURIComponent(profile.emp_id)}/faces`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Face registered successfully!');
      setShowFaceModal(false);
      setShotCount((c) => c + 1);
      fetchProfile();
    } catch {
      alert('Failed to register face.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleResetFaces = async () => {
    if (!profile || !window.confirm('Are you sure you want to delete all your registered face photos?')) return;
    try {
      await api.delete(`/employees/${encodeURIComponent(profile.emp_id)}/faces`);
      alert('Identity reset successfully.');
      fetchProfile();
    } catch {
      alert('Failed to reset identity.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account and view your registration details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Status */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-2xl overflow-hidden">
                {profile?.has_face ? (
                  <img 
                    src={`${API_URL}/employees/${profile.emp_id}/face?v=${shotCount}`} 
                    alt={profile.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={64} />
                )}
              </div>
              {profile?.has_face && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-xl shadow-lg">
                  <BadgeCheck size={20} />
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{profile?.name}</h2>
            <p className="text-sm text-gray-500 font-medium">{profile?.emp_id}</p>

            <div className="mt-6 pt-6 border-t border-gray-50">
              <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-sm">
                <Shield size={16} /> Verified Employee
              </div>
            </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-200">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Camera size={18} /> Face Identity
            </h4>
            <p className="text-blue-100 text-sm leading-relaxed mb-4">
              Your facial features are registered. This allows you to mark attendance securely using any office camera.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => { setShotCount(0); setShowFaceModal(true); }}
                className="w-full bg-white/20 hover:bg-white/30 py-2 rounded-xl text-sm font-bold transition"
              >
                Update Photos
              </button>
              {profile?.has_face && (
                <button 
                  onClick={handleResetFaces}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 text-white py-2 rounded-xl text-xs font-bold transition border border-white/10"
                >
                  Reset Identity
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Basic Information</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                <div className="flex items-center gap-3 text-gray-900">
                  <User size={18} className="text-blue-500" />
                  <span className="font-semibold">{profile?.name}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Employee ID</label>
                <div className="flex items-center gap-3 text-gray-900">
                  <BadgeCheck size={18} className="text-blue-500" />
                  <span className="font-mono font-bold text-blue-600">{profile?.emp_id}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Department</label>
                <div className="flex items-center gap-3 text-gray-900">
                  <Building size={18} className="text-blue-500" />
                  <span className="font-semibold">{profile?.department}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Joining Date</label>
                <div className="flex items-center gap-3 text-gray-900">
                  <Calendar size={18} className="text-blue-500" />
                  <span className="font-semibold">{profile ? new Date(profile.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Account Security</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                You can change your portal password here. We recommend a strong password to protect your records.
              </p>
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition flex items-center gap-2"
              >
                <Key size={16} /> Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Face Registration Modal */}
      {showFaceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Update Identity Photo</h2>
                <p className="text-sm text-gray-500">Registered shots: <span className="font-bold text-blue-600">{shotCount}</span></p>
              </div>
              <button onClick={() => setShowFaceModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setFaceMode('webcam')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                  faceMode === 'webcam' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                <Camera size={18} /> Webcam
              </button>
              <button
                onClick={() => setFaceMode('file')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                  faceMode === 'file' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                <Upload size={18} /> Upload
              </button>
            </div>

            {faceMode === 'webcam' && (
              <div className="space-y-4">
                <div className="relative bg-gray-900 rounded-3xl overflow-hidden aspect-[4/3] shadow-inner">
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
                  {!capturedPreview && cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-52 border-2 border-white/40 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  {capturedPreview ? (
                    <>
                      <button onClick={() => setCapturedPreview(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Retake</button>
                      <button onClick={handleWebcamUpload} disabled={uploadLoading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">
                        {uploadLoading ? 'Saving...' : 'Save Photo'}
                      </button>
                    </>
                  ) : (
                    <button onClick={captureSnapshot} disabled={!cameraReady} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                      <Camera size={20} /> Capture Face
                    </button>
                  )}
                </div>
              </div>
            )}

            {faceMode === 'file' && (
              <div className="py-12 border-2 border-dashed border-gray-200 rounded-3xl text-center">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="face-upload" />
                <label htmlFor="face-upload" className="cursor-pointer">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload size={32} />
                  </div>
                  <p className="font-bold text-gray-900">Click to upload photo</p>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Password Change Modal ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-white/80 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                <input
                  required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Password</label>
                <input
                  required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
