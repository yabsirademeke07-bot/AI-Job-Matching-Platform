import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, FileText, Target, Search, Bookmark, ClipboardList, MessageSquare, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['My Profile', '/profile', User],
  ['My Resume', '/resume', FileText],
  ['Explore Jobs', '/explore-jobs', Search],
  ['AI Job Matches', '/ai-matches', Target],
  ['Saved Jobs', '/saved-jobs', Bookmark],
  ['My Applications', '/applications', ClipboardList],
  ['Messages', '/chat', MessageSquare],
  ['Notifications', '/notifications', Bell],
  ['Settings', '/settings', Settings],
  ['Logout', null, LogOut],
];

export default function SeekerPageLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const handleLogout = () => setLogoutOpen(true);
  const confirmLogout = () => { logout(); setLogoutOpen(false); navigate('/login', { replace: true }); };

  useEffect(() => {
    if (!logoutOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setLogoutOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [logoutOpen]);

  return <div className="information-page min-h-screen bg-slate-50 lg:flex"><aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block"><div className="sticky top-0 flex h-screen flex-col p-5"><div className="mb-8 shrink-0 border-b border-slate-100 pb-5"><p className="text-lg font-black lowercase text-slate-900">job <span className="text-[var(--brand-deep)]">matching</span></p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Platform</p></div><nav className="seeker-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Seeker navigation">{navItems.map(([label, path, Icon]) => { const active = path && (location.pathname === path || (path === '/dashboard' && ['/seeker-dashboard', '/seekerDashboard'].includes(location.pathname))); const action = label === 'Logout' ? handleLogout : () => navigate(path); return <button key={label} type="button" onClick={action} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${label === 'Logout' ? 'text-red-500 hover:bg-red-50' : active ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]'}`}><Icon className="h-4 w-4" />{label}</button>; })}</nav></div></aside><div className="min-w-0 flex-1">{children}</div>{logoutOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setLogoutOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="logout-title" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="logout-title" className="text-xl font-black text-slate-900">Log out?</h2><p className="mt-3 text-sm leading-6 text-slate-600">Are you sure you want to log out of your account?</p></div><button type="button" aria-label="Close" onClick={() => setLogoutOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><LogOut className="h-5 w-5" /></button></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setLogoutOpen(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button type="button" onClick={confirmLogout} className="min-h-11 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">Log out</button></div></div></div>}</div>;
}
