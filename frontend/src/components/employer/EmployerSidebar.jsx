import { useState } from 'react';
import { Bell, BriefcaseBusiness, Building2, CalendarDays, ClipboardList, LayoutDashboard, LogOut, MessageCircle, Plus, Settings, Sparkles, Star, Target, UserCheck, Users, X } from 'lucide-react';

const defaultSections = [
  { title: 'Workspace', items: [['overview', 'Dashboard', LayoutDashboard], ['profile', 'Company & Legal', Building2], ['post', 'Post Job', Plus], ['jobs', 'My Jobs', BriefcaseBusiness], ['applications', 'Applications', ClipboardList]] },
  { title: 'Talent', items: [['matching', 'AI Candidate Matching', Target], ['shortlist', 'Shortlist', Star], ['interviews', 'Interviews', CalendarDays], ['hired', 'Hire & Onboarding', UserCheck], ['talent-pool', 'Talent Pool / General Applicants', Users]] },
  { title: 'Engagement', items: [['reviews', 'Reviews Management', MessageCircle], ['messages', 'Messages', MessageCircle], ['notifications', 'Notifications', Bell], ['settings', 'Settings', Settings]] },
];

export default function EmployerSidebar({ active, onSelect, onLogout, applicationsCount = 0, unreadMessages = 0, unreadNotifications = 0, isOpen = false, onClose, stages = defaultSections.flatMap((section) => section.items) }) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const stageMap = new Map(stages.map((item) => [item[0], item]));
  const sections = defaultSections.map((section) => ({ ...section, items: section.items.filter(([id]) => stageMap.has(id)) }));

  return <>
    {isOpen && <button type="button" aria-label="Close employer navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    {logoutOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="logout-title"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600"><LogOut className="h-5 w-5" /></div><h2 id="logout-title" className="mt-4 text-xl font-black text-slate-900">Log out of your workspace?</h2><p className="mt-2 text-sm leading-6 text-slate-500">You will need to sign in again to continue managing your hiring workspace.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setLogoutOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => { setLogoutOpen(false); onLogout?.(); }} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">Logout</button></div></div></div>}
    <aside className={`employer-sidebar fixed left-0 top-16 z-50 flex h-[calc(100vh-4rem)] w-72 flex-col border-r border-slate-200 bg-white p-5 pt-8 shadow-xl transition-transform lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <button type="button" aria-label="Close employer navigation" onClick={onClose} className="absolute right-4 top-5 text-slate-500 lg:hidden"><X className="h-5 w-5" /></button>
      <div className="mb-5 shrink-0 border-b border-slate-100 pb-5"><p className="flex items-center gap-2 text-lg font-black text-slate-900"><Sparkles className="h-5 w-5 text-blue-600" /> Employer workspace</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Recruitment pipeline</p></div>
      <nav aria-label="Employer dashboard navigation" className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {sections.map((section) => <div key={section.title}><p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{section.title}</p><div className="space-y-1">{section.items.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => { onSelect(id); onClose?.(); }} aria-current={active === id ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${active === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{label}</span>{id === 'applications' && applicationsCount > 0 && <Badge value={applicationsCount} active={active === id} />}{id === 'messages' && unreadMessages > 0 && <Badge value={unreadMessages} active={active === id} />}{id === 'notifications' && unreadNotifications > 0 && <Badge value={unreadNotifications} active={active === id} />}</button>)}</div></div>)}
      </nav>
      <div className="mt-5 shrink-0 rounded-2xl bg-blue-50 p-4"><p className="text-xs font-black text-blue-800">AI matching engine</p><p className="mt-1 text-xs leading-5 text-blue-700">Rank candidates using skills, experience, education, and fit.</p></div>
      <button type="button" onClick={() => setLogoutOpen(true)} className="mt-3 flex w-full shrink-0 items-center gap-3 rounded-xl border border-red-100 px-3 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"><LogOut className="h-4 w-4" /> Logout</button>
    </aside>
  </>;
}

function Badge({ value, active }) { return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>{value}</span>; }
