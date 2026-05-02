import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Camera, History, User, LogOut, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  setIsAuthenticated: (auth: boolean) => void;
}

const EmployeeSidebar: React.FC<SidebarProps> = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Camera size={20} />, label: 'Mark Attendance', path: '/webcam-attendance' },
    { icon: <History size={20} />, label: 'My Report', path: '/my-report' },
    { icon: <User size={20} />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="w-64 bg-white h-full border-r border-gray-100 flex flex-col shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2 text-blue-600 mb-8">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Camera size={24} />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">SmartTrack</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                }`
              }
            >
              <span className="transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
              <span className="font-semibold text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-gray-50">
        <div className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100">
          <div className="flex items-center gap-2 text-blue-700 mb-1">
            <ShieldCheck size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Employee Portal</span>
          </div>
          <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
            Your attendance is being monitored securely via Face ID.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 group"
        >
          <LogOut size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default EmployeeSidebar;
