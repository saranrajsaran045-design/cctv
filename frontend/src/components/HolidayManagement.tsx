import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import api from '../api';

interface Holiday {
  id: number;
  holiday_name: string;
  start_date: string;
  end_date: string;
  type: string;
  description: string;
}

const HolidayManagement: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [formData, setFormData] = useState({
    holiday_name: '',
    start_date: '',
    end_date: '',
    type: 'Public Holiday',
    description: ''
  });

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/holidays');
      setHolidays(res.data);
    } catch (err) {
      console.error('Failed to fetch holidays', err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await api.put(`/holidays/${editingHoliday.id}`, formData);
      } else {
        await api.post('/holidays', formData);
      }
      setIsModalOpen(false);
      setEditingHoliday(null);
      setFormData({ holiday_name: '', start_date: '', end_date: '', type: 'Public Holiday', description: '' });
      fetchHolidays();
    } catch (err) {
      alert('Failed to save holiday');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      fetchHolidays();
    } catch (err) {
      alert('Failed to delete holiday');
    }
  };

  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      holiday_name: holiday.holiday_name,
      start_date: holiday.start_date.split('T')[0],
      end_date: holiday.end_date.split('T')[0],
      type: holiday.type,
      description: holiday.description || ''
    });
    setIsModalOpen(true);
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  };

  const { firstDay, days } = getDaysInMonth(currentMonth);
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, (_, i) => null);

  const isDateHoliday = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    d.setHours(0, 0, 0, 0);
    return holidays.find(h => {
      const start = new Date(h.start_date);
      const end = new Date(h.end_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    });
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-4">
      {/* Compact Header */}
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">Holidays</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Company Schedule</p>
          </div>
          <div className="h-8 w-px bg-gray-100 mx-2" />
          <button
            onClick={() => { setEditingHoliday(null); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-50 active:scale-95"
          >
            <Plus size={14} /> Add Holiday
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            {currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
          </h3>
          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1.5 hover:bg-gray-100 rounded-md transition text-gray-500"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1.5 hover:bg-gray-100 rounded-md transition text-gray-500"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
        {/* Minimalist Calendar View */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={`${d}-${i}`} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest pb-2">{d}</div>
            ))}
            {padding.map((_, i) => <div key={`p-${i}`} className="h-8" />)}
            {daysArray.map(day => {
              const holiday = isDateHoliday(day);
              return (
                <div 
                  key={day} 
                  className={`h-9 w-full rounded-lg flex flex-col items-center justify-center relative group transition-all cursor-default border
                    ${holiday 
                      ? 'bg-blue-600 border-blue-500' 
                      : 'bg-white border-transparent hover:border-blue-100 hover:bg-blue-50/30'}`}
                >
                  <span className={`text-xs font-bold ${holiday ? 'text-white' : 'text-gray-600'}`}>{day}</span>
                  {holiday && (
                    <div className="absolute invisible group-hover:visible bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-gray-900 text-white text-[9px] p-1.5 rounded-lg shadow-xl z-10 text-center">
                      <p className="font-bold text-blue-300 mb-0.5">{holiday.type}</p>
                      <p className="font-medium truncate">{holiday.holiday_name}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Compact Holiday List Side Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-h-[420px]">
          <div className="p-3 border-b bg-gray-50/50">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Upcoming</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {holidays.length === 0 && (
              <div className="text-center py-6 opacity-40">
                <Info className="mx-auto mb-1" size={20} />
                <p className="text-[10px] font-bold">No holidays</p>
                <button 
                  onClick={() => { setEditingHoliday(null); setIsModalOpen(true); }}
                  className="mt-2 text-[9px] text-blue-600 font-black hover:underline"
                >
                  + Add One
                </button>
              </div>
            )}
            {holidays.map(holiday => (
              <div key={holiday.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-100 transition-all group relative">
                <div className="flex justify-between items-start">
                  <div className="max-w-[160px]">
                    <h4 className="font-bold text-gray-800 text-[11px] leading-tight truncate">{holiday.holiday_name}</h4>
                    <p className="text-[9px] text-gray-400 mt-0.5 font-bold flex items-center gap-1">
                      <CalendarIcon size={8} />
                      {new Date(holiday.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                    <button onClick={() => openEditModal(holiday)} className="p-1 text-blue-500 hover:bg-white rounded border border-transparent hover:border-blue-100 transition"><Edit2 size={10} /></button>
                    <button onClick={() => handleDelete(holiday.id)} className="p-1 text-red-500 hover:bg-white rounded border border-transparent hover:border-red-100 transition"><Trash2 size={10} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simplified Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900">{editingHoliday ? 'Edit' : 'New Holiday'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Name</label>
                  <input 
                    required type="text" value={formData.holiday_name}
                    onChange={e => setFormData({...formData, holiday_name: e.target.value})}
                    placeholder="e.g. Diwali"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">From</label>
                    <input 
                      required type="date" value={formData.start_date}
                      onChange={e => setFormData({...formData, start_date: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">To</label>
                    <input 
                      required type="date" value={formData.end_date}
                      onChange={e => setFormData({...formData, end_date: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none appearance-none cursor-pointer"
                  >
                    <option>Public Holiday</option>
                    <option>Company Holiday</option>
                    <option>Optional Holiday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Details</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Optional description"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-medium outline-none h-16 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">
                  {editingHoliday ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;
