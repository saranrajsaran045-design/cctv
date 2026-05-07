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
    <div className="w-full md:w-64 bg-white shadow-lg flex flex-row md:flex-col fixed bottom-0 md:static md:h-screen z-50 border-t md:border-t-0 md:border-r">
      <div className="hidden md:block p-6">
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

      {/* Mobile Nav */}
      <nav className="md:hidden flex-1 flex p-2 justify-around items-center">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isActive ? 'text-blue-600 bg-blue-50 font-bold' : 'text-gray-500'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px]">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 p-2 text-red-500 rounded-xl"
        >
          <LogOut size={20} />
          <span className="text-[10px]">Exit</span>
        </button>
      </nav>

      <div className="hidden md:flex mt-auto p-6 border-t border-gray-50 flex-col">
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
