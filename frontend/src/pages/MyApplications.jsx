import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  FileDown,
  MapPin,
  MoreHorizontal,
  NotebookPen,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getMetricCardClassName, metricCardIconClassName } from "../components/dashboard/metricCardStyles";

const statusTabs = [
  { key: "all", label: "All", icon: BriefcaseBusiness, tone: "bg-blue-50 text-blue-600 border-blue-100", badge: "Total submitted", badgeTone: "bg-blue-50 text-blue-700" },
  { key: "pending", label: "In-review", icon: Clock3, tone: "bg-amber-50 text-amber-600 border-amber-100", badge: "Awaiting review", badgeTone: "bg-amber-50 text-amber-700" },
  { key: "shortlisted", label: "Shortlisted", icon: Star, tone: "bg-indigo-50 text-indigo-600 border-indigo-100", badge: "Passed stage", badgeTone: "bg-indigo-50 text-indigo-700" },
  { key: "interview", label: "Interview", icon: CalendarDays, tone: "bg-purple-50 text-purple-600 border-purple-100", badge: "Scheduled calls", badgeTone: "bg-purple-50 text-purple-700" },
  { key: "hired", label: "Hired", icon: Trophy, tone: "bg-emerald-50 text-emerald-600 border-emerald-100", badge: "Offers received", badgeTone: "bg-emerald-50 text-emerald-700" },
  { key: "rejected", label: "Rejected", icon: XCircle, tone: "bg-rose-50 text-rose-600 border-rose-100", badge: "Not selected", badgeTone: "bg-rose-50 text-rose-700" },
  { key: "withdrawn", label: "Withdrawn", icon: RotateCcw, tone: "bg-slate-100 text-slate-600 border-slate-200", badge: "Cancelled by you", badgeTone: "bg-slate-100 text-slate-700" },
];

const applicationStages = ["Applied", "Under Review", "Interview", "Final Decision"];

const normalizeStatus = (value) => {
  const status = String(value || "pending").toLowerCase().replace(/[_-]/g, " ").trim();
  if (["submitted", "applied", "pending", "new"].includes(status)) return "Pending";
  if (["review", "in review", "under review", "employer reviewed"].includes(status)) return "Under Review";
  if (["shortlisted", "shortlist"].includes(status)) return "Shortlisted";
  if (["interview", "interviewed", "interview scheduled"].includes(status)) return "Interview";
  if (["hired", "offer", "accepted"].includes(status)) return "Hired";
  if (["rejected", "declined"].includes(status)) return "Rejected";
  if (status === "withdrawn") return "Withdrawn";
  return status.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

const statusStyles = {
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  "Under Review": "bg-blue-50 text-blue-800 ring-blue-200",
  Shortlisted: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  Interview: "bg-violet-50 text-violet-800 ring-violet-200",
  Hired: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Rejected: "bg-red-50 text-red-800 ring-red-200",
  Withdrawn: "bg-slate-100 text-slate-700 ring-slate-200",
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatWorkMode = (value) => {
  if (!value) return "Work arrangement not listed";
  const formatted = String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
  return formatted === "On Site" ? "On-Site" : formatted;
};

const formatRelativeTime = (value) => {
  if (!value) return "No recent activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent activity";
  const elapsed = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
};

const getCurrentStage = (status) => {
  if (["Hired", "Rejected", "Withdrawn"].includes(status)) return 3;
  if (status === "Interview") return 2;
  if (["Under Review", "Shortlisted"].includes(status)) return 1;
  return 0;
};

const stageDate = (application, stageIndex) => {
  const events = application.timeline || [];
  const stageNames = [
    ["applied", "application submitted"],
    ["under review", "review", "shortlisted", "screening"],
    ["interview", "interview scheduled", "interviewed"],
    ["hired", "rejected", "withdrawn", "final decision"],
  ];
  const event = [...events].reverse().find(({ stageName }) =>
    stageNames[stageIndex].includes(String(stageName || "").toLowerCase().replace(/[_-]/g, " ")),
  );
  if (event?.createdAt) return formatDate(event.createdAt);
  if (stageIndex === 0) return formatDate(application.appliedAt || application.applied_at);
  return "";
};

function StatusMetricCard({ tab, selected, count, onSelect }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={getMetricCardClassName(selected)}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:text-sm">
          {tab.label}
        </span>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${metricCardIconClassName} ${tab.tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </span>
      <span className="my-2 text-4xl font-black text-slate-900 sm:text-5xl">{count}</span>
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${tab.badgeTone}`}>{tab.badge}</span>
    </button>
  );
}

function CompanyAvatar({ name, logo }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-600">
      {logo && !failed ? (
        <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        String(name || "Company").slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

function ApplicationStepper({ application }) {
  const stage = getCurrentStage(application.status);
  const terminal = ["Hired", "Rejected", "Withdrawn"].includes(application.status);
  return (
    <ol className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-4" aria-label={`${application.title} application progress`}>
      {applicationStages.map((name, index) => {
        const complete = index < stage || (terminal && index === stage);
        const current = index === stage && !terminal;
        const finalLabel = index === 3 && terminal ? application.status : name;
        return (
          <li key={name} className="min-w-0 text-center">
            <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-emerald-600 text-white" : current ? "border-2 border-blue-600 bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
              {complete ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className={`mt-1 block truncate text-[10px] font-semibold sm:text-xs ${complete || current ? "text-slate-700" : "text-slate-400"}`}>{finalLabel}</span>
            <span className="mt-0.5 block truncate text-[10px] text-slate-400">{stageDate(application, index)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function formatInterviewTime(value) {
  if (!value) return "Time not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not available";
  return `${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Addis_Ababa",
  }).format(date)} EAT`;
}

const isInPersonInterview = (type) => ["in-person", "in_person"].includes(String(type || "").toLowerCase());

function ApplicationCard({ application, navigate, onWithdraw, onOpenNote, onRequestReschedule, onCopyJobLink, onDownloadCv }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const company = application.company || "Company unavailable";
  const skillsMatched = application.matchingSkills?.length || 0;
  const skillsMissing = application.missingSkills?.length || 0;
  const latestEvent = application.timeline?.[application.timeline.length - 1];
  const activityDescription = latestEvent?.statusNote
    || (application.evaluatedAt ? "Your application match was reviewed" : "Application submitted");
  const jobLink = application.jobId
    ? `/job-details/${encodeURIComponent(String(application.jobId))}`
    : null;
  const interviewLocation = application.interview?.meetingUrl || application.location;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start gap-4">
        <CompanyAvatar name={company} logo={application.companyLogo} />
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-slate-900 sm:text-lg">{application.title}</h2>
              <p className="mt-1 truncate text-sm font-semibold text-slate-600">{company}</p>
            </div>
            <div className="relative">
              <button type="button" aria-label={`More actions for ${application.title}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <button type="button" onClick={() => { setMenuOpen(false); onWithdraw(application); }} disabled={["Hired", "Rejected", "Withdrawn"].includes(application.status)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                    Withdraw Application
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); onOpenNote(application); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <NotebookPen className="h-4 w-4" />{application.privateNote ? "View Private Note" : "Add Private Note"}
                  </button>
                  {application.submittedResumeUrl ? (
                    <button type="button" onClick={() => { setMenuOpen(false); onDownloadCv(application); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <FileDown className="h-4 w-4" />
                      Download Submitted CV
                    </button>
                  ) : (
                    <span className="block px-3 py-2 text-sm text-slate-400">Submitted CV unavailable</span>
                  )}
                  <button type="button" onClick={() => { setMenuOpen(false); onCopyJobLink(application); }} disabled={!jobLink} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <Copy className="h-4 w-4" />Copy Job Link
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-3 text-xs text-slate-600 sm:text-sm">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{application.location || "Location not listed"}</span>
            <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5" />{formatWorkMode(application.workMode)}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Applied {formatDate(application.appliedAt)}</span>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-slate-600">{activityDescription}</span>
            <span>· {formatRelativeTime(application.lastActivityAt || application.updatedAt)}</span>
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[application.status] || statusStyles.Pending}`}>{application.status}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
              <Sparkles className="h-3.5 w-3.5" />{application.matchScore != null ? `${Number(application.matchScore).toFixed(2)}% Match` : "Match unavailable"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {skillsMatched} matched skill{skillsMatched === 1 ? "" : "s"} · {skillsMissing} gap{skillsMissing === 1 ? "" : "s"}
            </span>
            <span className="ml-auto text-sm font-semibold text-slate-700">{application.salary || "Salary not listed"}</span>
          </div>

          <div>
            <ApplicationStepper application={application} />
          </div>
          {application.timeline?.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Application activity timeline">
              {application.timeline.slice(-3).reverse().map((event) => (
                <li key={event.id || `${event.stageName}-${event.createdAt}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">{event.stageName}</span>
                  {event.createdAt && <span> · {formatRelativeTime(event.createdAt)}</span>}
                  {event.statusNote && <span className="block mt-0.5">{event.statusNote}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button type="button" disabled={!application.id} onClick={() => navigate(`/applications/${encodeURIComponent(String(application.id))}`)} className="min-h-10 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50">
              Open Details
            </button>
            {jobLink ? (
              <button type="button" onClick={() => navigate(jobLink)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                View Job Post <ExternalLink className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" disabled className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-400">Job post unavailable</button>
            )}
            </div>
            {(application.status === "Interview" || application.interview?.scheduledAt) && (
              <section className="rounded-xl border border-violet-200 bg-violet-50 p-5" aria-label="Scheduled interview">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-violet-950">{application.interview?.scheduledAt ? "Interview scheduled" : "Interview update"}</h3>
                    {application.interview?.scheduledAt ? (
                      <>
                        <p className="mt-1 text-sm font-semibold text-violet-900">{formatInterviewTime(application.interview.scheduledAt)}</p>
                        <p className="mt-1 text-sm text-violet-800">
                          {isInPersonInterview(application.interview.type)
                            ? `In person${interviewLocation ? ` · ${interviewLocation}` : ""}`
                            : `${application.interview.type === "phone" ? "Phone interview" : "Online interview"}${application.interview.meetingUrl ? ` · ${application.interview.meetingUrl}` : ""}`}
                        </p>
                        {application.interview.candidateResponse === "reschedule_requested" && <p className="mt-2 text-sm font-bold text-violet-900">Reschedule request sent to the employer.</p>}
                        {application.interview.notes && <p className="mt-2 text-sm text-violet-800">{application.interview.notes}</p>}
                      </>
                    ) : <p className="mt-1 text-sm text-violet-800">The employer has not shared the interview date and time yet.</p>}
                  </div>
                  {application.interview?.scheduledAt && <div className="flex shrink-0 flex-wrap gap-2">
                    {isInPersonInterview(application.interview.type) ? (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(interviewLocation || "")}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white hover:bg-violet-800">
                        <MapPin className="h-4 w-4" />View Map
                      </a>
                    ) : application.interview.meetingUrl ? (
                      <a href={application.interview.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white hover:bg-violet-800">
                        <ExternalLink className="h-4 w-4" />Join Meeting
                      </a>
                    ) : null}
                    <button type="button" onClick={() => onRequestReschedule(application)} className="min-h-10 rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-100">
                      Request Reschedule
                    </button>
                  </div>}
                </div>
              </section>
            )}
        </div>
      </div>
    </article>
  );
}

export default function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, shortlisted: 0, interview: 0, hired: 0, rejected: 0, withdrawn: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [noteApplication, setNoteApplication] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [rescheduleApplication, setRescheduleApplication] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [requestingReschedule, setRequestingReschedule] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const requestSequence = useRef(0);
  const listRef = useRef(null);

  const handleCardClick = (status) => {
    setActiveTab(status);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadApplications = useCallback(async () => {
    const requestId = ++requestSequence.current;
    try {
      const { data } = await api.get("/my-applications", {
        params: { search: query, status: activeTab, sort },
      });
      if (requestId !== requestSequence.current) return;
      const nextApplications = (data?.applications || []).map((item) => ({
        ...item,
        id: item.id ?? item.applicationId ?? null,
        jobId: item.jobId ?? item.job_id,
        title: item.jobTitle || item.title || item.role || "Untitled application",
        company: item.company || item.company_name || item.companyName || "Company",
        status: normalizeStatus(item.status),
        matchScore: item.aiMatchScore ?? item.matchScore ?? item.match_breakdown?.overall,
        matchingSkills: item.matchingSkills || [],
        missingSkills: item.missingSkills || [],
        workMode: String(item.work_mode || item.workMode || "").replace(/[-_]/g, " ") || null,
        salary: item.salary || "Salary not listed",
        interview: item.interview || null,
        privateNote: item.privateNote || "",
        timeline: item.timeline || [],
      }));
      if (sort === "match_desc") {
        nextApplications.sort((first, second) =>
          Number(second.matchScore || 0) - Number(first.matchScore || 0)
          || new Date(second.appliedAt || second.applied_at || 0) - new Date(first.appliedAt || first.applied_at || 0),
        );
      }
      setApplications(nextApplications);
      setCounts(data?.metrics || data?.counts || { all: 0, pending: 0, shortlisted: 0, interview: 0, hired: 0, rejected: 0, withdrawn: 0 });
      setError("");
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(requestError.response?.data?.message || "Unable to load your applications.");
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [activeTab, query, sort]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => loadApplications(), 0);
    const handleApplicationSync = () => loadApplications();
    window.addEventListener("job-matching:updated", handleApplicationSync);
    const intervalId = window.setInterval(handleApplicationSync, 15000);
    return () => {
      window.clearTimeout(initialLoadTimer);
      requestSequence.current += 1;
      window.removeEventListener("job-matching:updated", handleApplicationSync);
      window.clearInterval(intervalId);
    };
  }, [loadApplications]);

  const handleWithdraw = async () => {
    if (!selectedApplication?.id) return;
    setWithdrawing(true);
    setActionError("");
    try {
      await api.post(`/applications/${encodeURIComponent(String(selectedApplication.id))}/withdraw`, { reason: withdrawReason.trim() });
      setSelectedApplication(null);
      setWithdrawReason("");
      setActiveTab("withdrawn");
      await loadApplications();
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Unable to withdraw this application. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSaveNote = async (noteValue = noteDraft) => {
    if (!noteApplication?.id) return;
    setSavingNote(true);
    setActionError("");
    try {
      await api.post(`/applications/${encodeURIComponent(String(noteApplication.id))}/notes`, { note: noteValue });
      setNoteApplication(null);
      setNoteDraft("");
      await loadApplications();
      setToast("Private note saved.");
      window.setTimeout(() => setToast(""), 2500);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Unable to save your private note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleRequestReschedule = async () => {
    if (!rescheduleApplication?.id || !rescheduleReason.trim()) return;
    setRequestingReschedule(true);
    setActionError("");
    try {
      await api.post(`/applications/${encodeURIComponent(String(rescheduleApplication.id))}/interview/reschedule`, { reason: rescheduleReason.trim() });
      setRescheduleApplication(null);
      setRescheduleReason("");
      await loadApplications();
      setToast("Reschedule request sent to the employer.");
      window.setTimeout(() => setToast(""), 2500);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Unable to send your reschedule request.");
    } finally {
      setRequestingReschedule(false);
    }
  };

  const handleCopyJobLink = async (application) => {
    if (!application.jobId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/job-details/${encodeURIComponent(String(application.jobId))}`);
      setToast("Job link copied.");
      window.setTimeout(() => setToast(""), 2500);
    } catch (copyError) {
      console.error("Unable to copy job link:", copyError);
      setToast("Unable to copy the job link. Check browser clipboard permissions.");
      window.setTimeout(() => setToast(""), 4000);
    }
  };

  const handleDownloadCv = async (application) => {
    try {
      const apiOrigin = new URL(api.defaults.baseURL, window.location.origin).origin;
      const fileUrl = new URL(application.submittedResumeUrl, `${apiOrigin}/`);
      if (!["http:", "https:"].includes(fileUrl.protocol)) throw new Error("Unsupported CV URL protocol.");
      const response = await fetch(fileUrl.href);
      if (!response.ok) throw new Error(`CV download failed with status ${response.status}`);
      const data = await response.blob();
      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = application.submittedResumeName || "submitted-resume";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) {
      console.error("Unable to download submitted CV:", downloadError);
      setToast("Unable to download the submitted CV. Please try again.");
      window.setTimeout(() => setToast(""), 4000);
    }
  };

  const countLabel = useMemo(() => ({
    all: counts.all,
    pending: counts.pending,
    shortlisted: counts.shortlisted,
    interview: counts.interview,
    hired: counts.hired,
    rejected: counts.rejected,
    withdrawn: counts.withdrawn || 0,
  }), [counts]);

  const emptyStateContent = {
    all: ["No applications yet", "Your applications will appear here when you apply for jobs."],
    pending: ["No pending applications", "Applications awaiting an employer update will appear here."],
    shortlisted: ["No shortlisted applications yet", "Keep applying to roles that match your experience."],
    interview: ["No interviews scheduled yet", "Keep applying to active roles and check back for interview invitations."],
    hired: ["No hired applications yet", "Your accepted offers and hired applications will appear here."],
    rejected: ["No rejected applications", "There are no applications in this stage right now."],
    withdrawn: ["No withdrawn applications", "Applications you withdraw will be kept here for reference."],
  };

  return (
    <main className="information-page dashboard-canvas min-h-[70vh] bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <div>
            <h1 className="text-3xl font-black text-slate-900">My Applications</h1>
            <p className="mt-2 text-sm text-slate-500">Track each application, follow its progress, and manage your submissions.</p>
          </div>
        </header>

        <section className="mt-7 space-y-4 sm:space-y-5" aria-label="Application status totals">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3" aria-label="Application totals">
            {statusTabs.slice(0, 3).map((tab) => (
              <StatusMetricCard
                key={tab.key}
                tab={tab}
                selected={activeTab === tab.key}
                count={countLabel[tab.key]}
                onSelect={() => handleCardClick(tab.key)}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3" aria-label="Application progress and outcomes">
            {statusTabs.slice(3, 6).map((tab) => (
              <StatusMetricCard
                key={tab.key}
                tab={tab}
                selected={activeTab === tab.key}
                count={countLabel[tab.key]}
                onSelect={() => handleCardClick(tab.key)}
              />
            ))}
          </div>
          <div className="max-w-sm sm:max-w-md" aria-label="Withdrawn applications">
            <StatusMetricCard
              tab={statusTabs[6]}
              selected={activeTab === statusTabs[6].key}
              count={countLabel[statusTabs[6].key]}
              onSelect={() => handleCardClick(statusTabs[6].key)}
            />
          </div>
        </section>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search by job title or company name</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by job title or company name..." className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="relative flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600">
            <span className="sr-only">Sort applications</span>
            <span className="font-semibold">Sort:</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="max-w-44 appearance-none bg-transparent pr-5 font-semibold text-slate-800 outline-none">
              <option value="date_desc">Most Recent</option>
              <option value="match_desc">Highest AI Match</option>
              <option value="salary_desc">Salary</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4" />
          </label>
        </div>

        <div className="mt-6 overflow-x-auto border-b border-slate-200/80 no-scrollbar" role="tablist" aria-label="Filter applications by status">
          <div className="flex min-w-max items-center gap-7 sm:gap-9">
            {statusTabs.map((tab) => (
              <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={`flex min-h-14 items-center gap-2.5 whitespace-nowrap border-b-2 px-1 py-3.5 text-sm font-semibold transition-all duration-200 sm:text-base ${activeTab === tab.key ? "border-blue-600 font-bold text-blue-600" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
                {tab.label}
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${activeTab === tab.key ? "border-blue-200 bg-blue-100 text-blue-700" : "border-slate-200/60 bg-slate-100 text-slate-600"}`}>
                  {countLabel[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">Showing applications. Search filters update as you type.</p>

        <section ref={listRef} className="mt-7 space-y-5 scroll-mt-6" aria-live="polite">
          {loading && applications.length === 0 && (
            <div className="space-y-3" aria-label="Loading applications">
              {[1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl bg-slate-200" />)}
            </div>
          )}
          {!loading && error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              <p>{error}</p>
              <button type="button" onClick={() => loadApplications()} className="mt-3 font-bold underline">Try again</button>
            </div>
          )}
          {!loading && !error && applications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <svg aria-hidden="true" viewBox="0 0 96 96" className="mx-auto h-16 w-16 text-blue-600" fill="none">
                <rect x="14" y="21" width="68" height="58" rx="12" className="fill-blue-50 stroke-current" strokeWidth="3" />
                <path d="M31 21v-5a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v5M31 42h34M31 55h22" className="stroke-current" strokeLinecap="round" strokeWidth="4" />
                <circle cx="69" cy="66" r="11" className="fill-white stroke-current" strokeWidth="3" />
                <path d="m77 74 7 7" className="stroke-current" strokeLinecap="round" strokeWidth="4" />
              </svg>
              <h2 className="mt-4 text-lg font-black text-slate-900">{query ? "No matching applications" : emptyStateContent[activeTab]?.[0] || "No applications in this status"}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{query ? "Try a different job title or company name." : emptyStateContent[activeTab]?.[1] || "Your applications in this stage will appear here."}</p>
              <button type="button" onClick={() => navigate("/explore-jobs")} className="mt-5 rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)]">Explore Open Jobs</button>
            </div>
          )}
          {!loading && !error && applications.map((application) => (
            <ApplicationCard
              key={application.id || `${application.jobId}-${application.title}`}
              application={application}
              navigate={navigate}
              onWithdraw={(item) => { setSelectedApplication(item); setWithdrawReason(""); setActionError(""); }}
              onOpenNote={(item) => { setNoteApplication(item); setNoteDraft(item.privateNote || ""); setActionError(""); }}
              onRequestReschedule={(item) => { setRescheduleApplication(item); setRescheduleReason(""); setActionError(""); }}
              onCopyJobLink={handleCopyJobLink}
              onDownloadCv={handleDownloadCv}
            />
          ))}
        </section>
      </div>

      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !withdrawing) { setSelectedApplication(null); setActionError(""); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="withdraw-application-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="withdraw-application-title" className="text-lg font-black text-slate-900">Withdraw application?</h2>
                <p className="mt-2 text-sm text-slate-600">This will withdraw your application for <strong>{selectedApplication.title}</strong>. You cannot undo this action.</p>
              </div>
              <button type="button" disabled={withdrawing} onClick={() => { setSelectedApplication(null); setActionError(""); }} aria-label="Close confirmation" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="withdraw-reason">Reason</label>
            <textarea id="withdraw-reason" value={withdrawReason} onChange={(event) => setWithdrawReason(event.target.value)} maxLength={1000} rows={3} required placeholder="Tell us why you are withdrawing this application" className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            {actionError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={withdrawing} onClick={() => { setSelectedApplication(null); setActionError(""); }} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 disabled:opacity-50">Keep Application</button>
              <button type="button" disabled={withdrawing || !withdrawReason.trim()} onClick={handleWithdraw} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{withdrawing ? "Withdrawing…" : "Withdraw"}</button>
            </div>
          </section>
        </div>
      )}
      {noteApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingNote) { setNoteApplication(null); setActionError(""); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="private-note-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><h2 id="private-note-title" className="text-lg font-black text-slate-900">Private application note</h2><p className="mt-1 text-sm text-slate-600">Only you can see this reminder for {noteApplication.title}.</p></div>
              <button type="button" onClick={() => { setNoteApplication(null); setActionError(""); }} aria-label="Close private note" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} maxLength={5000} rows={6} placeholder="Add a reminder about this application..." className="mt-4 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            {actionError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
            <div className="mt-4 flex justify-between gap-2">
              <button type="button" disabled={savingNote || !noteApplication.privateNote} onClick={() => handleSaveNote("")} className="min-h-10 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 disabled:opacity-50">Delete Note</button>
              <div className="flex gap-2"><button type="button" disabled={savingNote} onClick={() => setNoteApplication(null)} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={savingNote} onClick={handleSaveNote} className="min-h-10 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-60">{savingNote ? "Saving..." : "Save Note"}</button></div>
            </div>
          </section>
        </div>
      )}
      {rescheduleApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !requestingReschedule) { setRescheduleApplication(null); setActionError(""); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="reschedule-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="reschedule-title" className="text-lg font-black text-slate-900">Request interview reschedule</h2>
            <p className="mt-2 text-sm text-slate-600">Tell the employer why you need another time for {rescheduleApplication.title}.</p>
            <textarea value={rescheduleReason} onChange={(event) => setRescheduleReason(event.target.value)} maxLength={1000} rows={4} placeholder="Reason for rescheduling..." className="mt-4 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            {actionError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={requestingReschedule} onClick={() => setRescheduleApplication(null)} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={requestingReschedule || !rescheduleReason.trim()} onClick={handleRequestReschedule} className="min-h-10 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-bold text-white disabled:opacity-60">{requestingReschedule ? "Sending..." : "Send Request"}</button></div>
          </section>
        </div>
      )}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg">{toast}</div>}
    </main>
  );
}
