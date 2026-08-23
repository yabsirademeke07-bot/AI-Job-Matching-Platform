import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, FileText, Target, Search, Bookmark, ClipboardList, Brain, Mic, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['My Profile', '/profile', User],
  ['My Resume', '/resume', FileText],
  ['My CV & Analysis', '/cv-analysis', FileText],
  ['AI Job Matches', '/ai-matches', Target],
  ['Explore Jobs', '/explore-jobs', Search],
  ['Saved Jobs', '/saved-jobs', Bookmark],
  ['My Applications', '/applications', ClipboardList],
  ['Skill Gap Analysis', '/skill-gap', Brain],
  ['AI Interview Prep', '/interview-prep', Mic],
  ['Notifications', '/notifications', Bell],
];

export default function SeekerPageLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
  return <div className="information-page min-h-screen bg-slate-50 lg:flex"><aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block"><div className="sticky top-0 flex h-screen flex-col p-5"><div className="mb-8 border-b border-slate-100 pb-5"><p className="text-lg font-black lowercase text-slate-900">job <span className="text-[var(--brand-deep)]">matching</span></p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Platform</p></div><nav className="flex-1 space-y-1" aria-label="Seeker navigation">{navItems.map(([label, path, Icon]) => { const active = location.pathname === path || (path === '/dashboard' && ['/seeker-dashboard', '/seekerDashboard'].includes(location.pathname)); return <button key={path} type="button" onClick={() => navigate(path)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]'}`}><Icon className="h-4 w-4" />{label}</button>; })}</nav><div className="border-t border-slate-100 pt-4"><button type="button" onClick={() => navigate('/settings')} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-[var(--brand-soft)]"><Settings className="h-4 w-4" />Settings</button><button type="button" onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-500 hover:bg-red-50"><LogOut className="h-4 w-4" />Logout</button></div></div></aside><div className="min-w-0 flex-1">{children}</div></div>;
}
