import { useEffect, useMemo, useState } from 'react';
import { Activity, BriefcaseBusiness, ChevronLeft, ChevronRight, ClipboardList, Search, ShieldCheck, UserCog, UserRound, X } from 'lucide-react';
import { getAdminActivityLogs } from '../../services/adminService';

const eventPresentation = {
  role_selection: { label: 'Role selected', Icon: UserCog, color: 'bg-blue-100 text-blue-800' },
  profile_update: { label: 'Profile updated', Icon: UserRound, color: 'bg-emerald-100 text-emerald-800' },
  job_application: { label: 'Job application', Icon: BriefcaseBusiness, color: 'bg-violet-100 text-violet-800' },
  admin_action: { label: 'Admin action', Icon: ShieldCheck, color: 'bg-amber-100 text-amber-900' },
  other: { label: 'Activity', Icon: Activity, color: 'bg-slate-100 text-slate-700' },
};
const eventOptions = [
  ['all', 'All event types'],
  ['role_selection', 'Role Selection'],
  ['profile_updates', 'Profile Updates'],
  ['job_applications', 'Job Applications'],
  ['admin_actions', 'Admin Actions'],
];
const dateOptions = [['all', 'All time'], ['today', 'Today'], ['7d', 'Last 7 days']];
const roleLabels = { admin: 'Admin', super_admin: 'Super Admin', job_seeker: 'Job Seeker', seeker: 'Job Seeker', employee: 'Employee', employer: 'Employer' };
const initials = (name) => String(name || 'User').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function parseDetails(details) {
  if (!details) return {};
  if (typeof details === 'object') return details;
  try { return JSON.parse(details); } catch { return { raw: String(details) }; }
}

function eventFor(log) {
  if (log.event_type === 'admin_action') return { ...eventPresentation.admin_action, label: 'Status changed' };
  return eventPresentation[log.event_type] || eventPresentation.other;
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Time unavailable';
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const units = [['year', 31_536_000], ['month', 2_592_000], ['day', 86_400], ['hour', 3_600], ['minute', 60], ['second', 1]];
  const [unit, secondsPerUnit] = units.find(([, size]) => Math.abs(seconds) >= size) || units[units.length - 1];
  return formatter.format(Math.round(seconds / secondsPerUnit), unit);
}

function absoluteTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function MetadataValue({ value }) {
  if (value == null || value === '') return <span className="text-slate-400">Not recorded</span>;
  if (typeof value === 'object') return <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{JSON.stringify(value, null, 2)}</pre>;
  return <span className="break-all text-sm text-slate-700">{String(value)}</span>;
}

function AuditDetailModal({ log, onClose }) {
  const details = parseDetails(log.details);
  const EventIcon = eventFor(log).Icon;
  const recordId = details.recordId ?? details.applicationId ?? details.targetJobId ?? details.targetUserId ?? log.id;
  const ipAddress = log.ip_address || details.ipAddress || details.ip_address;
  const userAgent = log.user_agent || details.userAgent || details.user_agent;
  const device = details.device || details.browser || userAgent;

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex min-w-0 items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${eventFor(log).color}`}><EventIcon className="h-5 w-5" /></span><div className="min-w-0"><h2 id="audit-detail-title" className="text-lg font-black text-slate-950">Audit event details</h2><p className="mt-1 truncate text-sm text-slate-500">{log.description || eventFor(log).label}</p></div></div>
          <button type="button" aria-label="Close audit details" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-5 p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actor</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{log.full_name || 'Unknown user'}{log.email ? <span className="block break-all text-xs font-normal text-slate-500">{log.email}</span> : null}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Event</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{eventFor(log).label} <span className="ml-1 font-mono text-xs font-normal text-slate-500">{log.action}</span></dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Record ID</dt><dd className="mt-1 font-mono text-sm text-slate-800">{recordId}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Occurred</dt><dd className="mt-1 text-sm text-slate-800">{absoluteTime(log.created_at)}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IP address</dt><dd className="mt-1 font-mono text-sm text-slate-700">{ipAddress || 'Not recorded'}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Browser / user agent</dt><dd className="mt-1 break-all text-xs leading-5 text-slate-700">{device || 'Not recorded'}</dd></div>
          </dl>
          <section className="border-t border-slate-100 pt-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Old values</h3><div className="mt-2 rounded-lg bg-slate-50 p-3"><MetadataValue value={details.oldValues ?? details.old_values} /></div></section>
          <section><h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">New values</h3><div className="mt-2 rounded-lg bg-slate-50 p-3"><MetadataValue value={details.newValues ?? details.new_values} /></div></section>
          <details className="rounded-lg border border-slate-200">
            <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold text-slate-700">View complete metadata JSON</summary>
            <pre className="max-h-64 overflow-auto border-t border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">{JSON.stringify(details, null, 2)}</pre>
          </details>
        </div>
      </section>
    </div>
  );
}

export default function AdminActivityLog() {
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      getAdminActivityLogs({ search, type: eventType, date: dateRange, page, limit: pagination.limit })
        .then(({ data }) => {
          if (!current) return;
          setLogs(Array.isArray(data.logs) ? data.logs : []);
          setPagination(data.pagination || { page, limit: 25, total: 0, totalPages: 0 });
        })
        .catch((requestError) => {
          if (current) setError(requestError.response?.data?.message || 'Unable to load audit events.');
        })
        .finally(() => current && setLoading(false));
    }, 200);
    return () => { current = false; window.clearTimeout(timer); };
  }, [search, eventType, dateRange, page, pagination.limit, retry]);

  const pageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages;
    if (!totalPages) return [];
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  }, [page, pagination.totalPages]);

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <section className="mt-6 pb-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Governance</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Audit log</h1><p className="mt-1 text-sm text-slate-500">Review account, application, profile, and administrative events.</p></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"><ClipboardList className="h-4 w-4 text-blue-700" />{pagination.total.toLocaleString()} events</span>
      </header>

      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[minmax(220px,1fr)_220px_170px]">
        <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={updateFilter(setSearch)} placeholder="Search user, email, or action" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100" /></label>
        <label className="flex items-center gap-2"><span className="whitespace-nowrap text-xs font-semibold text-slate-500">Event type</span><select value={eventType} onChange={updateFilter(setEventType)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{eventOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2"><span className="whitespace-nowrap text-xs font-semibold text-slate-500">Date range</span><select value={dateRange} onChange={updateFilter(setDateRange)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{dateOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>

      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => setRetry((value) => value + 1)} className="font-bold underline">Retry</button></div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3.5">Actor / user</th><th className="px-4 py-3.5">Event / action</th><th className="px-4 py-3.5">Description</th><th className="px-4 py-3.5">Timestamp</th><th className="px-4 py-3.5 text-right"> </th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 6 }, (_, index) => <tr key={`loading-${index}`} className="animate-pulse"><td colSpan={5} className="px-4 py-4"><div className="h-4 rounded bg-slate-100" /></td></tr>) : logs.length ? logs.map((log) => {
                const event = eventFor(log);
                const EventIcon = event.Icon;
                return <tr key={log.id} className="transition hover:bg-slate-50/70"><td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">{initials(log.full_name)}</span><div className="min-w-0"><p className="max-w-48 truncate text-xs font-bold text-slate-800">{log.full_name || 'Unknown user'}</p><p className="max-w-48 truncate text-[11px] text-slate-500">{log.email || 'Account unavailable'}</p><span className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{roleLabels[log.role] || log.role || 'Unknown role'}</span></div></div></td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-bold ${event.color}`}><EventIcon className="h-3.5 w-3.5" />{event.label}</span></td><td className="max-w-[320px] px-4 py-3 text-xs leading-5 text-slate-600">{log.description || event.label}</td><td className="whitespace-nowrap px-4 py-3"><p className="text-xs font-semibold text-slate-700">{relativeTime(log.created_at)}</p><time className="mt-1 block text-[10px] text-slate-400">{absoluteTime(log.created_at)}</time></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelectedLog(log)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50">View</button></td></tr>;
              }) : <tr><td colSpan={5} className="px-5 py-16 text-center"><Activity className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No audit events found</p><p className="mt-1 text-xs text-slate-500">Try widening the date range or changing your search.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">{pagination.total ? `Showing ${(page - 1) * pagination.limit + 1}–${Math.min(page * pagination.limit, pagination.total)} of ${pagination.total.toLocaleString()} events` : 'No events to display'}</p>
          <nav className="flex items-center gap-1" aria-label="Audit log pages">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} aria-label="Previous page" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            {pageNumbers.map((number) => <button key={number} type="button" aria-current={number === page ? 'page' : undefined} onClick={() => setPage(number)} className={`h-8 min-w-8 rounded-md px-2 text-xs font-bold ${number === page ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{number}</button>)}
            <button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} aria-label="Next page" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </nav>
        </footer>
      </section>
      {selectedLog && <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </section>
  );
}
