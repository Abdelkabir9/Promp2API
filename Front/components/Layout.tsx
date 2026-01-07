
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Code2, 
  Database, 
  Globe, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Cpu,
  DatabaseZap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Functions', icon: Code2, path: '/functions' },
    { name: 'Databases', icon: DatabaseZap, path: '/models' },
    { name: 'External APIs', icon: Cpu, path: '/external-apis' },
    { name: 'APIs Explorer', icon: Globe, path: '/apis' },
    { name: 'Settings', icon: SettingsIcon, path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } transition-all duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col h-full sticky top-0 z-30 shadow-sm`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-50">
          {isSidebarOpen ? (
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                <ShieldCheck className="text-white" size={20} />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
              Prompt2API
              </span>
            </div>
          ) : (
            <div className="mx-auto bg-blue-600 p-2 rounded-lg shadow-sm">
              <ShieldCheck className="text-white" size={20} />
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hidden md:block"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center w-full p-3 rounded-xl transition-all group ${
                isActive(item.path) 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`${isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} size={20} />
              {isSidebarOpen && <span className="ml-3 font-medium text-sm">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 mt-auto border-t border-slate-100 bg-slate-50/50">
          <div className="mb-4 px-3 flex items-center justify-between">
             {isSidebarOpen && (
               <div className="flex flex-col">
                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Load</span>
                 <span className="text-xs text-emerald-600 font-bold">Stable</span>
               </div>
             )}
             <Zap size={14} className="text-amber-500" />
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors group"
          >
            <LogOut size={20} className="text-slate-400 group-hover:text-red-600" />
            {isSidebarOpen && <span className="ml-3 font-semibold text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <h1 className="text-md font-bold text-slate-700">
              {navItems.find(n => isActive(n.path))?.name || 'Home'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
             <div className="hidden sm:flex flex-col items-end mr-2">
               <span className="text-xs font-bold text-slate-800">{user?.first_name} {user?.last_name}</span>
               <span className="text-[10px] text-slate-400">{user?.email}</span>
             </div>
             <img className="h-9 w-9 rounded-full ring-2 ring-blue-50 bg-slate-200 p-0.5" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Felix'}`} alt="" />
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
