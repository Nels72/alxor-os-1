// Build Force: 23-03-2026
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  UserPlus,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../store';
import Logo from './Logo';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useStore(state => state.logout);
  const user = useStore(state => state.user);

  const menuItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard', match: '/dashboard?tab=overview' },
    { name: 'Prospects', icon: UserPlus, path: '/dashboard?tab=prospects', match: '/dashboard?tab=prospects' },
    { name: 'Clients', icon: Users, path: '/dashboard?tab=clients', match: '/dashboard?tab=clients' },
    { name: 'Documents', icon: FileText, path: '/dashboard?tab=docs', match: '/dashboard?tab=docs' },
    { name: 'Conformité', icon: ShieldCheck, path: '/conformite', match: '/conformite' },
    { name: 'Paramètres', icon: Settings, path: '/dashboard?tab=settings', match: '/dashboard?tab=settings' },
  ];

  const currentPath = location.pathname + location.search;

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-20 md:w-72 border-r border-slate-200 bg-white flex flex-col transition-all duration-300 shadow-sm z-40">
        <div className="p-6">
          <Link to="/" className="flex items-center">
            <Logo className="h-8 md:h-10 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {menuItems.map((item) => {
            const isActive = currentPath.includes(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative ${
                  isActive
                    ? 'bg-blue-50 text-[#4F7CFF] shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={22} className={`shrink-0 ${isActive ? 'text-[#4F7CFF]' : 'group-hover:text-slate-900'}`} />
                <span className="font-bold hidden md:inline text-sm">{item.name}</span>
                {isActive && <div className="absolute right-3 hidden md:block"><ChevronRight size={14}/></div>}
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity md:hidden pointer-events-none whitespace-nowrap z-50 shadow-xl font-bold">
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-1 md:px-2 py-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-black text-slate-700 shrink-0">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collaborateur OS</p>
            </div>
          </div>
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all group"
          >
            <LogOut size={20} className="shrink-0 group-hover:rotate-12 transition-transform" />
            <span className="font-bold hidden md:inline text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
