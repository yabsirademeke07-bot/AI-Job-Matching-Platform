import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Target, Search, Bookmark, ClipboardList, MessageSquare, Bell, Settings, Menu, X } from 'lucide-react';

const navItems = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['My Resume', '/resume', FileText],
  ['Find Jobs', '/explore-jobs', Search],
  ['AI Job Matches', '/ai-matches', Target],
  ['Saved Jobs', '/saved-jobs', Bookmark],
  ['My Applications', '/applications', ClipboardList],
  ['Messages', '/chat', MessageSquare],
  ['Notifications', '/notifications', Bell],
  ['Settings', '/settings', Settings],
];

export default function SeekerPageLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderNavigation = () => navItems.map(([label, path, Icon]) => {
    const active = path && (location.pathname === path || (path === '/dashboard' && ['/seeker-dashboard', '/seeker/dashboard', '/seekerDashboard'].includes(location.pathname)));
    const action = () => {
      navigate(path === '/explore-jobs' ? '/explore-jobs?from=dashboard' : path);
      setSidebarOpen(false);
    };
    return <button key={label} type="button" onClick={action} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]'}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>;
  });

  return (
    <div className="information-page min-h-screen min-w-0 overflow-x-hidden bg-slate-50 lg:flex">
      {sidebarOpen && <button type="button" aria-label="Close seeker navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
      <aside id="seeker-sidebar" className={`fixed left-0 top-20 z-50 flex h-[calc(100dvh-5rem)] w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white p-5 shadow-xl transition-transform sm:top-24 sm:h-[calc(100dvh-6rem)] lg:sticky lg:top-24 lg:z-auto lg:h-[calc(100dvh-6rem)] lg:w-64 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex shrink-0 items-start justify-between border-b border-slate-100 pb-5">
          <div>
            <p className="text-lg font-black lowercase text-slate-900">job <span className="text-[var(--brand-deep)]">matching</span></p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Platform</p>
          </div>
          <button type="button" aria-label="Close seeker navigation" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav className="seeker-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Seeker navigation">
          {renderNavigation()}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <span className="text-sm font-bold text-slate-700">Seeker workspace</span>
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open seeker navigation" aria-expanded={sidebarOpen} aria-controls="seeker-sidebar" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Menu className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
