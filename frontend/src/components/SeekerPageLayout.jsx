import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Search, Bookmark, ClipboardList, MessageSquare, Bell, Settings } from 'lucide-react';

const navItems = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['My Resume', '/resume', FileText],
  ['Find Jobs', '/explore-jobs', Search],
  ['Saved Jobs', '/saved-jobs', Bookmark],
  ['My Applications', '/applications', ClipboardList],
  ['Messages', '/chat', MessageSquare],
  ['Notifications', '/notifications', Bell],
  ['Settings', '/settings', Settings],
];

export default function SeekerPageLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const renderNavigation = (mobile = false) => navItems.map(([label, path, Icon]) => {
    const active = path && (location.pathname === path || (path === '/dashboard' && ['/seeker-dashboard', '/seekerDashboard'].includes(location.pathname)));
    const action = () => navigate(path === '/explore-jobs' ? '/explore-jobs?from=dashboard' : path);
    return <button key={label} type="button" onClick={action} aria-current={active ? 'page' : undefined} className={`relative flex min-h-10 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs transition-all ${mobile ? 'shrink-0 whitespace-nowrap' : 'w-full'} ${active ? 'border border-sky-100 bg-sky-50 font-bold text-sky-700 shadow-xs' : 'font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`}><Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />{label}</button>;
  });

  return <div className="information-page min-h-screen min-w-0 overflow-x-hidden bg-[#f8fafc] lg:flex"><aside className="hidden w-64 shrink-0 border-r border-slate-200/90 bg-white lg:block"><div className="sticky top-0 flex h-screen flex-col p-5"><div className="mb-8 shrink-0 border-b border-slate-100 px-2 pb-6 pt-2"><p className="text-lg font-black lowercase tracking-tight text-slate-900">job <span className="text-[var(--brand-deep)]">matching</span></p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">AI Platform</p></div><nav className="seeker-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Seeker navigation">{renderNavigation()}</nav></div></aside><div className="min-w-0 flex-1"><nav className="seeker-mobile-nav flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden" aria-label="Seeker mobile navigation">{renderNavigation(true)}</nav>{children}</div></div>;
}
