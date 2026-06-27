// Build Force: 23-03-2026
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  UserPlus,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useStore } from '../store';
import Logo from './Logo';
import AlexPanel from './AlexPanel';
import {
  listCollaborateurs,
  Collaborateur,
} from '../services/collaborateursAirtable';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useStore(state => state.logout);
  const user = useStore(state => state.user);
  const currentCollaborateur = useStore(state => state.currentCollaborateur);
  const setCurrentCollaborateur = useStore(state => state.setCurrentCollaborateur);

  const [collabs, setCollabs] = useState<Collaborateur[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [alexOpen, setAlexOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listCollaborateurs()
      .then(setCollabs)
      .catch((err) => console.error('[Collaborateurs] Échec chargement:', err));
  }, []);

  useEffect(() => {
    if (!selectorOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [selectorOpen]);

  const menuItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard', match: '/dashboard?tab=overview' },
    { name: 'Projets en cours', icon: UserPlus, path: '/dashboard?tab=prospects', match: '/dashboard?tab=prospects' },
    { name: 'Clients', icon: Users, path: '/dashboard?tab=clients', match: '/dashboard?tab=clients' },
    { name: 'Documents', icon: FileText, path: '/dashboard?tab=docs', match: '/dashboard?tab=docs' },
    { name: 'Conformité', icon: ShieldCheck, path: '/conformite', match: '/conformite' },
    { name: 'Paramètres', icon: Settings, path: '/dashboard?tab=settings', match: '/dashboard?tab=settings' },
  ];

  const currentPath = location.pathname + location.search;

  const displayName = currentCollaborateur?.nom || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '—';

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
          {/* Sélecteur de profil collaborateur (V1) */}
          <div ref={selectorRef} className="relative mb-4">
            <button
              type="button"
              onClick={() => setSelectorOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-1 md:px-2 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              title="Changer de profil"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-black text-slate-700 shrink-0">
                {initials}
              </div>
              <div className="hidden md:block overflow-hidden flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{displayName || 'Choisir un profil'}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {currentCollaborateur ? currentCollaborateur.role : 'Collaborateur OS'}
                </p>
              </div>
              <ChevronDown size={14} className={`hidden md:block text-slate-400 shrink-0 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {selectorOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                <p className="px-4 pt-3 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Je travaille en tant que…
                </p>
                <ul className="max-h-64 overflow-y-auto pb-2">
                  {collabs.length === 0 && (
                    <li className="px-4 py-3 text-xs font-bold text-slate-300">Chargement…</li>
                  )}
                  {collabs.map((c) => {
                    const selected = currentCollaborateur?.id === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => { setCurrentCollaborateur(c); setSelectorOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{c.nom}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              {c.role}
                              {c.statutActivite === 'Absent' && (
                                <span className="ml-1.5 text-orange-500">· Absent</span>
                              )}
                            </p>
                          </div>
                          {selected && <Check size={14} className="text-[#4F7CFF] shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
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

      {/* Bouton flottant Alex */}
      <button
        onClick={() => setAlexOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center transition-all z-40 ${alexOpen ? 'scale-0' : 'scale-100'}`}
        title="Ouvrir Alex Assistant"
      >
        <MessageSquare size={24} />
      </button>

      {/* Panneau Alex */}
      <AlexPanel isOpen={alexOpen} onClose={() => setAlexOpen(false)} />
    </div>
  );
};

export default Layout;
