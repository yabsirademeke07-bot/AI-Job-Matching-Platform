import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ExternalLink, MessageSquareText, Search, Send, ShieldAlert, UserRound } from 'lucide-react';
import { getAdminReportMessages, getAdminReports, resolveAdminReport } from '../../services/adminService';

const statusLabels = { pending: 'Pending', 'under-review': 'Investigating', investigating: 'Investigating', resolved: 'Resolved', dismissed: 'Resolved' };
const statusStyles = {
  pending: 'bg-amber-100 text-amber-800',
  'under-review': 'bg-blue-100 text-blue-800',
  investigating: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  dismissed: 'bg-slate-100 text-slate-700',
};
const issueLabels = {
  fraud: 'Scam alert',
  'scam-alert': 'Scam alert',
  scam_fraud: 'Scam or fraud',
  upfront_fee: 'Unlawful upfront fee',
  misleading_description: 'Misleading job description',
  fake_credentials: 'Fake credentials / CV fraud',
  unprofessional_conduct: 'Unprofessional conduct',
  interview_no_show: 'Interview no-show',
  spam_applications: 'Spam applications',
  system_bug: 'System bug',
  spam: 'Spam',
  'payment-issue': 'Payment issue',
  'fake-profile': 'Fake profile',
  'inappropriate-content': 'Inappropriate content',
  'offensive-language': 'Offensive language',
  other: 'Other issue',
};

const normalizeStatus = (status) => status === 'under-review' ? 'investigating' : status === 'dismissed' ? 'resolved' : status || 'pending';
const formatDate = (value, options = {}) => value
  ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', ...options })
  : 'Date unavailable';
const safeEvidenceUrl = (value) => {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) || url.startsWith('/uploads/') ? url : '';
};

function targetDetails(report) {
  if (report.reported_job_id) {
    return {
      label: `Job #${report.reported_job_id}`,
      title: report.reported_job_title || 'Job listing unavailable',
      subtitle: [report.reported_company_name, report.reported_job_location].filter(Boolean).join(' · '),
      icon: BriefcaseBusiness,
    };
  }
  if (report.reported_user_id) {
    return {
      label: `User #${report.reported_user_id}`,
      title: report.reported_user_name || 'User account unavailable',
      subtitle: report.reported_user_email || '',
      icon: UserRound,
    };
  }
  return { label: 'Target unavailable', title: 'No target attached', subtitle: '', icon: AlertTriangle };
}

function StatusBadge({ status }) {
  const normalized = status || 'pending';
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[normalized] || statusStyles.pending}`}>{statusLabels[normalized] || normalized}</span>;
}

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [draft, setDraft] = useState('');
  const [warningDraft, setWarningDraft] = useState('');
  const [reportTab, setReportTab] = useState('candidate');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState('');
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [notice, setNotice] = useState('');
  const selectedReportId = selectedReport?.id;

  useEffect(() => {
    let mounted = true;
    getAdminReports()
      .then(({ data }) => {
        if (!mounted) return;
        const rows = Array.isArray(data.reports) ? data.reports : [];
        setReports(rows);
        setSelectedReport(rows[0] || null);
        setLoadingMessages(Boolean(rows[0]));
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.response?.data?.message || 'Unable to load reports. Please try again.');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedReportId) return undefined;
    let current = true;
    getAdminReportMessages(selectedReportId)
      .then(({ data }) => {
        if (current) setMessages(Array.isArray(data.messages) ? data.messages : []);
      })
      .catch((requestError) => {
        if (current) setMessageError(requestError.response?.data?.message || 'Unable to load this conversation.');
      })
      .finally(() => current && setLoadingMessages(false));
    return () => { current = false; };
  }, [selectedReportId]);

  const filteredReports = useMemo(() => reports.filter((report) => {
    const normalized = normalizeStatus(report.status);
    if (reportTab === 'candidate' && report.reporter_role !== 'seeker') return false;
    if (reportTab === 'employer' && report.reporter_role !== 'employer') return false;
    if (reportTab === 'resolved' && !['resolved', 'dismissed'].includes(report.status)) return false;
    if (reportTab !== 'resolved' && statusFilter !== 'all' && normalized !== statusFilter) return false;
    const target = targetDetails(report);
    const needle = search.trim().toLowerCase();
    return !needle || [report.reporter_name, report.reporter_email, target.label, target.title, report.description, issueLabels[report.issue_type] || report.issue_type]
      .some((value) => String(value || '').toLowerCase().includes(needle));
  }), [reports, search, statusFilter, reportTab]);

  const selectReport = (report) => {
    if (String(selectedReport?.id) === String(report.id)) return;
    setSelectedReport(report);
    setMessages([]);
    setMessageError('');
    setLoadingMessages(true);
    setDraft('');
    setWarningDraft('');
    setNotice('');
  };

  const refreshSelectedReport = async (reportId) => {
    const [{ data: reportData }, { data: messageData }] = await Promise.all([
      getAdminReports(),
      getAdminReportMessages(reportId),
    ]);
    const rows = Array.isArray(reportData.reports) ? reportData.reports : [];
    setReports(rows);
    setSelectedReport(rows.find((report) => String(report.id) === String(reportId)) || null);
    setMessages(Array.isArray(messageData.messages) ? messageData.messages : []);
    setMessageError('');
  };

  const sendReply = async (newStatus, targetPenalty = 'none') => {
    if (!selectedReport || sending) return;
    if ((targetPenalty === 'take_down_job' || targetPenalty === 'suspend_user') && !window.confirm(targetPenalty === 'take_down_job' ? 'Take this reported job offline?' : 'Suspend the accused account?')) return;
    const resolutionMessage = draft.trim();
    const warningToTarget = warningDraft.trim();
    if (!resolutionMessage && !warningToTarget && targetPenalty === 'none' && !['dismissed', 'under_review'].includes(newStatus)) {
      setMessageError('Add a resolution message or choose a moderation action.');
      return;
    }
    setSending(targetPenalty !== 'none' ? targetPenalty : newStatus);
    setMessageError('');
    setNotice('');
    try {
      const { data } = await resolveAdminReport(selectedReport.id, { resolutionMessage, warningToTarget, newStatus, targetPenalty });
      setDraft('');
      setWarningDraft('');
      setNotice(data.message || 'Report updated and relevant parties notified.');
      await refreshSelectedReport(selectedReport.id);
    } catch (requestError) {
      setMessageError(requestError.response?.data?.message || 'Unable to send your reply. Please try again.');
    } finally {
      setSending('');
    }
  };

  const filters = [
    ['candidate', 'Candidate Reports', reports.filter((report) => report.reporter_role === 'seeker' && !['resolved', 'dismissed'].includes(report.status)).length],
    ['employer', 'Employer Reports', reports.filter((report) => report.reporter_role === 'employer' && !['resolved', 'dismissed'].includes(report.status)).length],
    ['resolved', 'Resolved & Archived', reports.filter((report) => ['resolved', 'dismissed'].includes(report.status)).length],
  ];

  return (
    <section className="mt-6 pb-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Trust &amp; safety</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Reports &amp; resolution</h1>
          <p className="mt-1 text-sm text-slate-500">Review concerns, contact the reporter, and document each resolution.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"><ShieldAlert className="h-4 w-4 text-blue-700" />{reports.length} total reports</span>
      </header>

      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => window.location.reload()} className="font-bold underline">Retry</button></div>}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(300px,0.4fr)_minmax(0,0.6fr)]">
        <aside className="flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reporter, target, or issue" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100" />
            </label>
            <div className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-100" role="tablist" aria-label="Filter reports by reporter and resolution">
              {filters.map(([value, label, count]) => <button key={value} type="button" role="tab" aria-selected={reportTab === value} onClick={() => { setReportTab(value); setStatusFilter('all'); }} className={`shrink-0 border-b-2 px-2.5 py-2 text-xs font-bold transition ${reportTab === value ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}<span className="ml-1.5 text-[10px] opacity-70">{count}</span></button>)}
            </div>
            {reportTab !== 'resolved' && <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by report status" className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><option value="all">All open statuses</option><option value="pending">Pending</option><option value="investigating">Investigating</option></select>}
          </div>

          <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {loading ? <div className="space-y-3 p-4" aria-label="Loading reports">{[0, 1, 2, 3].map((item) => <div key={item} className="animate-pulse rounded-xl border border-slate-100 p-4"><div className="h-3 w-24 rounded bg-slate-200" /><div className="mt-3 h-4 w-3/4 rounded bg-slate-200" /><div className="mt-2 h-3 w-1/2 rounded bg-slate-100" /></div>)}</div>
              : filteredReports.length ? filteredReports.map((report) => {
                const target = targetDetails(report);
                const normalized = normalizeStatus(report.status);
                const selected = String(selectedReport?.id) === String(report.id);
                return <button key={report.id} type="button" onClick={() => selectReport(report)} aria-pressed={selected} className={`block w-full border-l-4 p-4 text-left transition ${selected ? 'border-blue-700 bg-blue-50/70' : 'border-transparent hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-3"><span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">{issueLabels[report.issue_type] || report.issue_type || 'Other issue'}</span><StatusBadge status={normalized} /></div>
                    <span className="mt-2 inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{report.reporter_role === 'employer' ? 'Employer report' : 'Candidate report'} · {report.target_type || (report.reported_job_id ? 'job' : 'candidate')}</span>
                  <p className="mt-3 truncate text-sm font-bold text-slate-900">{report.reporter_name || 'Reporter'} <span className="font-normal text-slate-400">reported</span> {target.label}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-600">{target.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-xs text-slate-500">{String(report.description || '').replaceAll(/\s+/g, ' ')}</span><time className="shrink-0 text-[10px] text-slate-400">{formatDate(report.created_at, { dateStyle: 'short', timeStyle: 'short' })}</time></div>
                </button>;
              }) : <div className="px-5 py-12 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No reports found</p><p className="mt-1 text-xs text-slate-500">Try another filter or search term.</p></div>}
          </div>
        </aside>

        <main className="flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!selectedReport ? <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"><MessageSquareText className="h-10 w-10 text-slate-300" /><h2 className="mt-4 text-lg font-black text-slate-800">Select a report to review</h2><p className="mt-1 max-w-sm text-sm text-slate-500">The reporter’s message, evidence, and conversation will appear here.</p></div> : (() => {
            const target = targetDetails(selectedReport);
            const TargetIcon = target.icon;
            const evidence = safeEvidenceUrl(selectedReport.evidence_url);
            const status = normalizeStatus(selectedReport.status);
            return <>
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{target.label}</p><h2 className="mt-1 truncate text-lg font-black text-slate-950">{target.title}</h2><p className="mt-1 truncate text-sm text-slate-500">{target.subtitle || 'No additional target details'}</p></div><StatusBadge status={status} /></div>
                <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                  <div className="flex min-w-0 items-center gap-2"><UserRound className="h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Reported by</p><p className="truncate text-sm font-semibold text-slate-800">{selectedReport.reporter_name || 'Unknown reporter'}</p></div></div>
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Contact</p><p className="truncate text-sm text-slate-700">{selectedReport.reporter_email || 'No email'}{selectedReport.reporter_phone ? ` · ${selectedReport.reporter_phone}` : ''}</p></div>
                </div>
                {selectedReport.accused_name && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Accused target</p><p className="mt-1 text-sm font-semibold text-slate-800">{selectedReport.accused_name} · {selectedReport.accused_role}</p><p className="text-xs text-slate-600">{selectedReport.accused_email}</p></div>}
              </div>

              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2"><TargetIcon className="h-4 w-4 text-blue-700" /><h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Original complaint</h3><span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">{issueLabels[selectedReport.issue_type] || selectedReport.issue_type || 'Other issue'}</span></div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{selectedReport.description || 'No complaint description was provided.'}</p>
                {evidence ? <a href={evidence} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"><ExternalLink className="h-3.5 w-3.5" />Open submitted evidence</a> : <p className="mt-3 text-xs text-slate-400">No evidence attached.</p>}
              </div>

              <section className="flex min-h-52 flex-1 flex-col overflow-hidden" aria-label="Conversation thread">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-800">Conversation</h3></div><span className="text-xs text-slate-400">{messages.length} messages</span></div>
                <div className="min-h-40 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
                  <article className="max-w-[90%] rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-slate-800">{selectedReport.reporter_name || 'Reporter'}</span><time className="text-[10px] text-slate-400">{formatDate(selectedReport.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">{selectedReport.description}</p></article>
                  {loadingMessages ? <div className="space-y-3" aria-label="Loading conversation"><div className="ml-auto h-16 w-3/4 animate-pulse rounded-xl bg-blue-100" /><div className="h-16 w-3/4 animate-pulse rounded-xl bg-slate-200" /></div>
                    : messageError ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{messageError}</p>
                      : messages.map((message) => {
                        const fromAdmin = message.sender_type === 'admin';
                        return <article key={message.id} className={`max-w-[90%] rounded-xl border p-3 shadow-sm ${fromAdmin ? 'ml-auto border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className={`text-xs font-bold ${fromAdmin ? 'text-blue-900' : 'text-slate-800'}`}>{fromAdmin ? message.sender_name || 'Admin' : message.sender_name || selectedReport.reporter_name || 'Reporter'}</span><time className="text-[10px] text-slate-400">{formatDate(message.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">{message.message}</p></article>;
                      })}
                </div>
              </section>

              <div className="border-t border-slate-200 p-4 sm:p-5">
                {notice && <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{notice}</p>}
                {messageError && !loadingMessages && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{messageError}</p>}
                <label htmlFor="report-reply" className="text-xs font-bold uppercase tracking-wide text-slate-600">Reply to reporter</label>
                <textarea id="report-reply" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={3} placeholder="Write a clear update for the reporter..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <div className="mb-3 flex justify-between text-[10px] text-slate-400"><span>Reporter will receive an in-app notification.</span><span>{draft.length}/5000</span></div>
                {selectedReport.accused_user_id && <><label htmlFor="target-warning" className="text-xs font-bold uppercase tracking-wide text-slate-600">Warning notice to accused</label><textarea id="target-warning" value={warningDraft} onChange={(event) => setWarningDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Optional notice explaining the policy concern..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /></>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!draft.trim() || Boolean(sending)} onClick={() => sendReply('resolved')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{sending === 'resolved' ? 'Sending…' : 'Send message & resolve'}</button>
                  <button type="button" disabled={!draft.trim() || Boolean(sending)} onClick={() => sendReply('under_review')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{sending === 'under_review' ? 'Sending…' : 'Send reply (keep open)'}</button>
                  <button type="button" disabled={!warningDraft.trim() || Boolean(sending)} onClick={() => sendReply('under_review')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">Send warning</button>
                  {selectedReport.accused_user_id && <button type="button" disabled={Boolean(sending)} onClick={() => sendReply('resolved', 'suspend_user')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"><AlertTriangle className="h-4 w-4" />{sending === 'suspend_user' ? 'Suspending…' : 'Suspend user'}</button>}
                  {(selectedReport.reported_job_id || selectedReport.target_type === 'job') && <button type="button" disabled={Boolean(sending)} onClick={() => sendReply('resolved', 'take_down_job')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-800 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"><AlertTriangle className="h-4 w-4" />{sending === 'take_down_job' ? 'Taking down…' : 'Take down job'}</button>}
                  {status !== 'resolved' && <button type="button" disabled={Boolean(sending)} onClick={() => sendReply('dismissed')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Dismiss</button>}
                </div>
              </div>
            </>;
          })()}
        </main>
      </div>
    </section>
  );
}