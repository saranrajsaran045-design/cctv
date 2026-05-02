import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, RefreshCw, Wifi, AlertTriangle, User } from 'lucide-react';
import api from '../api';

type RecognitionStatus = 'idle' | 'scanning' | 'success' | 'failed' | 'duplicate';

interface AttendanceResult {
  emp_id: string;
  name: string;
  department: string;                                                                                                                                                                        
  timestamp: string;
  message: string;
}

const WebcamAttendance: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [, setCountdown] = useState(0);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const autoScanRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === 'employee') {
      api.get('/employee/me').then(res => setCurrentUser(res.data)).catch(() => {});
    }
  }, []);

  // Start webcam
  const startCamera = useCallback(async () => {
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
    } catch (err) {
      setErrorMsg('Camera access denied. Please allow camera permissions and refresh.');
      setCameraReady(false);
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (autoScanRef.current) clearInterval(autoScanRef.current);
    };
  }, [startCamera, stopCamera]);

  // Capture frame as JPEG blob
  const captureFrame = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) return resolve(null);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  };

  // Send frame to backend for recognition + attendance marking
  const markAttendance = useCallback(async (type: 'in' | 'out' = 'in') => {
    if (status === 'scanning' || !cameraReady) return;
    setStatus('scanning');
    setResult(null);
    setErrorMsg('');

    try {
      const blob = await captureFrame();
      if (!blob) throw new Error('Failed to capture frame');

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      if (currentUser?.emp_id) {
        formData.append('expected_id', currentUser.emp_id);
      }
      formData.append('type', type);

      const res = await api.post('/attendance/webcam', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const data = res.data;
      if (data.status === 'success') {
        setStatus('success');
        data.message = type === 'in' ? 'In-Time marked successfully!' : 'Out-Time marked successfully!';
        setResult(data);
        // Auto-reset after 5 seconds
        setTimeout(() => setStatus('idle'), 5000);
      } else if (data.status === 'duplicate') {
        setStatus('duplicate');
        setResult(data);
        setTimeout(() => setStatus('idle'), 4000);
      } else {
        setStatus('failed');
        setErrorMsg(data.message || 'Face not recognized. Please try again.');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err: any) {
      setStatus('failed');
      setErrorMsg(err.response?.data?.detail || 'Recognition failed. Please try again.');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [status, cameraReady]);

  // Auto-scan toggle
  const toggleAutoScan = () => {
    if (autoScanEnabled) {
      if (autoScanRef.current) clearInterval(autoScanRef.current);
      autoScanRef.current = null;
      setAutoScanEnabled(false);
    } else {
      setAutoScanEnabled(true);
      autoScanRef.current = setInterval(() => {
        markAttendance('in');
      }, 5000);
    }
  };

  // Countdown for scanning state
  useEffect(() => {
    if (status === 'scanning') {
      setCountdown(3);
      const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
      return () => clearInterval(t);
    }
  }, [status]);

  const statusConfig = {
    idle: {
      border: 'border-blue-400',
      overlay: null,
      label: 'Position your face in the frame and click "Mark Attendance"',
    },
    scanning: {
      border: 'border-yellow-400',
      overlay: (
        <div className="absolute inset-0 bg-yellow-400/10 flex items-center justify-center pointer-events-none">
          <div className="text-yellow-300 text-center">
            <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-bold text-lg">Scanning…</p>
          </div>
        </div>
      ),
      label: 'Analyzing your face…',
    },
    success: {
      border: 'border-green-400',
      overlay: (
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none">
          <CheckCircle size={80} className="text-green-400 drop-shadow-lg" />
        </div>
      ),
      label: 'Attendance marked successfully!',
    },
    failed: {
      border: 'border-red-400',
      overlay: (
        <div className="absolute inset-0 bg-red-500/15 flex items-center justify-center pointer-events-none">
          <XCircle size={80} className="text-red-400 drop-shadow-lg" />
        </div>
      ),
      label: errorMsg || 'Face not recognized. Try again.',
    },
    duplicate: {
      border: 'border-orange-400',
      overlay: (
        <div className="absolute inset-0 bg-orange-400/15 flex items-center justify-center pointer-events-none">
          <AlertTriangle size={80} className="text-orange-400 drop-shadow-lg" />
        </div>
      ),
      label: 'Attendance already marked for today!',
    },
  };

  const cfg = statusConfig[status];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Webcam Attendance</h1>
          <p className="text-gray-500 mt-1">Look at the camera and click the button to mark your attendance.</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
          <Wifi size={16} className="text-green-500" />
          <span className="text-green-700 text-sm font-medium">Connected to office network</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div
                className={`w-48 h-56 rounded-[50%] border-4 ${cfg.border} opacity-70 transition-colors duration-500`}
                style={{ boxShadow: `0 0 0 9999px rgba(0,0,0,0.25)` }}
              />
            </div>

            {/* Status overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none">{cfg.overlay}</div>

            <video
              ref={videoRef}
              className="w-full h-auto"
              style={{ transform: 'scaleX(-1)', maxHeight: '420px', objectFit: 'cover' }}
              autoPlay
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera status */}
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-30">
                {errorMsg ? (
                  <div className="text-center px-6">
                    <XCircle size={48} className="text-red-400 mx-auto mb-3" />
                    <p className="text-red-300 font-medium">{errorMsg}</p>
                    <button
                      onClick={() => { setErrorMsg(''); startCamera(); }}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw size={16} /> Retry Camera
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-300">Starting camera…</p>
                  </div>
                )}
              </div>
            )}

            {/* Status bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 py-3 px-4 text-center text-sm font-medium z-30 transition-colors duration-300 ${
                status === 'success'
                  ? 'bg-green-600 text-white'
                  : status === 'failed'
                  ? 'bg-red-600 text-white'
                  : status === 'duplicate'
                  ? 'bg-orange-500 text-white'
                  : status === 'scanning'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-800/80 text-gray-300'
              }`}
            >
              {cfg.label}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => markAttendance('in')}
              disabled={!cameraReady || status === 'scanning'}
              className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                !cameraReady || status === 'scanning'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
              }`}
            >
              <Camera size={24} />
              {status === 'scanning' ? 'Scanning…' : 'Mark In-Time'}
            </button>
            <button
              onClick={() => markAttendance('out')}
              disabled={!cameraReady || status === 'scanning'}
              className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                !cameraReady || status === 'scanning'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 active:scale-95 text-white'
              }`}
            >
              <Camera size={24} />
              {status === 'scanning' ? 'Scanning…' : 'Mark Out-Time'}
            </button>
            <button
              onClick={toggleAutoScan}
              disabled={!cameraReady}
              title="Auto-scan every 5 seconds"
              className={`px-5 py-4 rounded-xl font-medium flex items-center gap-2 transition-all border-2 ${
                autoScanEnabled
                  ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600'
              }`}
            >
              <RefreshCw size={18} className={autoScanEnabled ? 'animate-spin' : ''} />
              Auto
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="space-y-4">
          {/* Last recognition result */}
          <div
            className={`rounded-2xl p-5 border-2 transition-all duration-500 ${
              status === 'success'
                ? 'border-green-400 bg-green-50'
                : status === 'duplicate'
                ? 'border-orange-400 bg-orange-50'
                : status === 'failed'
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User size={18} /> Recognition Result
            </h3>

            {result ? (
              <div className="space-y-3">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    status === 'success' ? 'bg-green-100' : 'bg-orange-100'
                  }`}
                >
                  {status === 'success' ? (
                    <CheckCircle size={36} className="text-green-600" />
                  ) : (
                    <AlertTriangle size={36} className="text-orange-600" />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-xl text-gray-900">{result.name}</p>
                  <p className="text-gray-500 text-sm">{result.emp_id}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Department</span>
                    <span className="font-medium text-gray-800">{result.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium text-gray-800">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-800">
                      {new Date(result.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div
                  className={`text-center text-sm font-semibold py-2 px-4 rounded-lg ${
                    status === 'success'
                      ? 'bg-green-600 text-white'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {result.message}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Camera size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No recognition result yet.</p>
                <p className="text-xs mt-1">Position your face and click "Mark Attendance"</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 text-sm">📋 Tips for best results</h4>
            <ul className="text-xs text-blue-700 space-y-1.5">
              <li>✅ Face the camera directly</li>
              <li>✅ Ensure good lighting</li>
              <li>✅ Remove sunglasses/masks</li>
              <li>✅ Keep camera at eye level</li>
              <li>⚠️ Avoid very bright backgrounds</li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">🔒 How it works</h4>
            <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
              <li>Your face is captured from webcam</li>
              <li>Sent securely to the office server</li>
              <li>Matched against registered faces</li>
              <li>Attendance logged with timestamp</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamAttendance;
