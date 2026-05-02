import React, { useState, useEffect } from 'react';
import { Camera as CameraIcon, Plus, Trash2, Video } from 'lucide-react';
import api, { API_URL } from '../api';

const Cameras: React.FC = () => {
  const [cameras, setCameras] = useState<string[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCameras = async () => {
    try {
      const res = await api.get('/cameras/active');
      setCameras(res.data.cameras);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('camera_id', cameraId);
      formData.append('stream_url', streamUrl);
      
      await api.post('/cameras/', formData);
      setCameraId('');
      setStreamUrl('');
      fetchCameras();
    } catch (error) {
      console.error(error);
      alert('Failed to add camera');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCamera = async (id: string) => {
    try {
      await api.delete(`/cameras/${id}`);
      fetchCameras();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Live Cameras</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New Camera</h2>
        <form onSubmit={handleAddCamera} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Camera ID / Name</label>
            <input
              type="text"
              required
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Entrance-Cam-1"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Stream URL</label>
            <input
              type="text"
              required
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. rtsp://user:pass@ip/stream or 0 for local webcam"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 h-[42px]"
            >
              <Plus size={18} /> Add
            </button>
            <button
              type="button"
              onClick={() => { setCameraId('Laptop-Cam'); setStreamUrl('0'); }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition h-[42px] text-sm"
            >
              Laptop Camera
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cameras.map((cam) => (
          <div key={cam} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2 font-medium">
                <Video size={18} className="text-blue-600" /> {cam}
              </div>
              <button
                onClick={() => handleRemoveCamera(cam)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Remove Camera"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="aspect-video bg-gray-900 relative">
              {/* Load stream directly from API */}
              <img
                src={`${API_URL}/cameras/${cam}/stream`}
                alt={`Live feed from ${cam}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIgMmwyMCAyMCIvPjxwYXRoIGQ9Ik0xNSAxNWw1LTJ2LTZsLTUgMnY2eiIvPjxwb2x5Z29uIHBvaW50cz0iMiA4IDIgMTYgMTUgMTYgMTUgOCAyIDgiLz48L3N2Zz4=';
                }}
              />
            </div>
          </div>
        ))}
        {cameras.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <CameraIcon size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No active cameras.</p>
            <p className="text-sm mt-1">Add a stream URL above to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cameras;
