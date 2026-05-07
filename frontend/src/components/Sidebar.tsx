import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Camera, ClipboardList, LogOut, ScanFace, Calendar } from 'lucide-react';

interface SidebarProps {
  setIsAuthenticated: (auth: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/employees', icon: <Users size={20} />, label: 'Employees' },
    { to: '/webcam-attendance', icon: <ScanFace size={20} />, label: 'Mark Attendance' },
    { to: '/cameras', icon: <Camera size={20} />, label: 'CCTV Cameras' },
    { to: '/attendance', icon: <ClipboardList size={20} />, label: 'Attendance Logs' },
    { to: '/holidays', icon: <Calendar size={20} />, label: 'Holidays' },
  ];

  return (
    <div className="w-full md:w-64 bg-white shadow-lg flex flex-row md:flex-col fixed bottom-0 md:static md:h-screen z-50 border-t md:border-t-0 md:border-r">
      <div className="hidden md:block p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <Camera className="text-blue-600" /> SmartTrack
        </h1>
      </div>

      <nav className="flex-1 flex md:block p-2 md:p-4 justify-around md:space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col md:flex-row items-center gap-1 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-bold scale-110 md:scale-100'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] md:text-sm font-medium">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-2 md:p-4 border-l md:border-l-0 md:border-t flex items-center justify-center">
        <button
          onClick={handleLogout}
          className="flex flex-col md:flex-row items-center gap-1 md:gap-3 px-2 md:px-4 py-2 md:py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          <span className="text-[10px] md:text-sm font-medium">Exit</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
