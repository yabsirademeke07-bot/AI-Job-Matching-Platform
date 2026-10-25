import {
  Bell,
  BriefcaseBusiness,
  Building2,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';

const menuSections = [
  {
    label: 'Recruitment & Jobs',
    items: [
      ['overview', 'Dashboard', LayoutDashboard],
      ['jobs', 'My Jobs', BriefcaseBusiness],
      ['applications', 'Applications', Users],
      ['matching', 'AI Match', Sparkles],
    ],
  },
  {
    label: 'Communication',
    items: [
      ['messages', 'Messages', MessageSquare],
      ['notifications', 'Notifications', Bell],
    ],
  },
  {
    label: 'Organization',
    items: [
      ['profile', 'Company Profile', Building2],
      ['reviews', 'Company Reviews', Star],
      ['settings', 'Settings', Settings],
    ],
  },
];

const menuItems = menuSections.flatMap((section) => section.items);

export default function EmployerSidebar({ active, onSelect, onReportIssue, applicationsCount = 0, unreadMessages = 0, unreadNotifications = 0, isOpen = false, onClose, stages = menuItems }) {
  const stageMap = new Map(stages.map((item) => [item[0], item]));
  const visibleSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter(([id]) => stageMap.has(id)),
    }))
    .filter((section) => section.items.length > 0);

  return <>
    {isOpen && <button type="button" aria-label="Close employer navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    <aside className={`employer-sidebar fixed left-0 top-20 z-40 flex h-[calc(100vh-5rem)] w-64 max-w-[85vw] flex-col border-r border-slate-200/90 bg-white p-4 pb-6 shadow-xl transition-transform sm:top-24 sm:h-[calc(100vh-6rem)] lg:static lg:z-auto lg:h-auto lg:min-h-[calc(100dvh-11rem)] lg:w-64 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <button type="button" aria-label="Close employer navigation" onClick={onClose} className="absolute right-4 top-5 text-slate-500 lg:hidden"><X className="h-5 w-5" /></button>

      <div className="mb-5 flex shrink-0 items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/25">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">Employer Workspace</p>
        </div>
      </div>

      <nav aria-label="Employer dashboard navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 lg:h-auto lg:flex-none lg:overflow-visible">
        {visibleSections.map((section, sectionIndex) => (
          <section key={section.label} aria-label={section.label} className={sectionIndex > 0 ? 'mt-5' : ''}>
            <h2 className="mb-2 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 first:mt-0">
              {section.label}
            </h2>
            <div className="space-y-1">
              {section.items.map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { onSelect(id); onClose?.(); }}
                  aria-current={active === id ? 'page' : undefined}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs transition-all ${active === id ? 'border border-sky-100 bg-sky-50 font-bold text-sky-700 shadow-xs' : 'font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0 flex-1">{label}</span>
                  {id === 'applications' && applicationsCount > 0 && <Badge value={applicationsCount} active={active === id} />}
                  {id === 'messages' && unreadMessages > 0 && <Badge value={unreadMessages} active={active === id} />}
                  {id === 'notifications' && unreadNotifications > 0 && <Badge value={unreadNotifications} active={active === id} />}
                </button>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="mt-4 shrink-0 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => { onReportIssue?.(); onClose?.(); }}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span className="min-w-0 flex-1">Help &amp; Report Issue</span>
        </button>
      </div>
    </aside>
  </>;
}

function Badge({ value, active }) { return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>{value}</span>; }
