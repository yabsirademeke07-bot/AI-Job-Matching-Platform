import { useMemo, useState } from "react";
import {
  Archive,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Globe2,
  Link2,
  MapPin,
  MoreHorizontal,
  Pause,
  Play,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { normalizePipelineStatus } from "../../utils/pipelineStatus";

const EMPTY_LIST = [];

const jobFilters = [
  { id: "all", label: "All", title: "TOTAL POSTINGS", badge: "All jobs", icon: BriefcaseBusiness, iconTone: "bg-blue-50 text-blue-600" },
  { id: "active", label: "Live", title: "LIVE ON SITE", badge: "Accepting applicants", icon: Globe2, iconTone: "bg-emerald-50 text-emerald-600" },
  { id: "pending", label: "Pending", title: "PENDING REVIEW", badge: "Under admin review", icon: Clock3, iconTone: "bg-amber-50 text-amber-600" },
  { id: "closed", label: "Closed", title: "CLOSED & DRAFTS", badge: "Hiring finished", icon: Archive, iconTone: "bg-slate-100 text-slate-600" },
];

const PENDING_STATUSES = new Set(["pending", "pending_approval", "pending_review", "under_review", "in_review", "review"]);
const LIVE_STATUSES = new Set(["active", "published", "open"]);
const APPROVED_VALUES = new Set(["approved", "true", "1"]);
const REJECTED_VALUES = new Set(["rejected", "declined"]);

const getJobCategory = (job, normalizeJobStatus) => {
  const rawStatus = String(job.status || "draft").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const status = normalizeJobStatus ? normalizeJobStatus(rawStatus) : rawStatus;
  const approvalValue = String(
    job.approval_status ?? job.approvalStatus ?? job.moderation_status ?? "",
  ).trim().toLowerCase().replace(/[\s-]+/g, "_");
  const approvedFlag = job.is_approved ?? job.isApproved;
  const isExplicitlyUnapproved = approvedFlag === false || approvedFlag === 0 || approvedFlag === "0" || approvedFlag === "false";

  if (PENDING_STATUSES.has(status) || PENDING_STATUSES.has(rawStatus) || PENDING_STATUSES.has(approvalValue)) {
    return "pending";
  }
  if (LIVE_STATUSES.has(status)) {
    if (APPROVED_VALUES.has(approvalValue)) return "active";
    if (approvalValue || REJECTED_VALUES.has(approvalValue)) return "closed";
    if (isExplicitlyUnapproved) return "pending";
    return "active";
  }
  return "closed";
};

const getDeadlineDate = (value) => {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDeadline = (value) => {
  const date = getDeadlineDate(value);
  if (!date) return { label: "No deadline", tone: "text-slate-600" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDay = new Date(date);
  deadlineDay.setHours(0, 0, 0, 0);
  const daysRemaining = Math.round((deadlineDay - today) / 86400000);
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const relativeLabel = daysRemaining < 0
    ? `Expired ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? "day" : "days"} ago`
    : daysRemaining === 0
      ? "Due today"
      : `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`;

  return {
    label: `${dateLabel} • ${relativeLabel}`,
    tone: daysRemaining < 0 ? "text-rose-700" : "text-amber-700",
  };
};

const formatLabel = (value, fallback) => {
  const label = String(value || fallback).replace(/[_-]+/g, " ").trim();
  return label.replace(/\b\w/g, (character) => character.toUpperCase());
};

const getCount = (...values) => {
  const value = values.find((candidate) => candidate !== null && candidate !== undefined && candidate !== "");
  const count = Number(value ?? 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
};

const getApplicantCount = (job, applications) => {
  const count = job.total_applicants ?? job.applicantsCount ?? job.applicants_count ?? job.application_count;
  if (count !== null && count !== undefined && count !== "") return getCount(count);
  return applications.filter(
    (application) => String(application.job_id ?? application.jobId ?? application.job?.id ?? "") === String(job.id),
  ).length;
};

const getStatusDetails = (job, category, normalizedStatus) => {
  if (category === "pending") return { label: "Pending Admin Review", tone: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" };
  if (normalizedStatus === "scheduled") return { label: "Scheduled", tone: "border-indigo-200 bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" };
  if (category === "active") return { label: "Active & Live", tone: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  if (REJECTED_VALUES.has(String(job.approval_status ?? job.approvalStatus ?? "").toLowerCase()) || normalizedStatus === "rejected") {
    return { label: "Needs Revision", tone: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" };
  }
  if (normalizedStatus === "paused") return { label: "Paused", tone: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  if (normalizedStatus === "draft") return { label: "Draft", tone: "border-slate-200 bg-slate-100 text-slate-700", dot: "bg-slate-400" };
  return { label: normalizedStatus === "expired" ? "Expired" : "Closed", tone: "border-slate-200 bg-slate-100 text-slate-700", dot: "bg-slate-400" };
};

export default function EmployerJobsManagement({
  jobs,
  applications,
  normalizeJobStatus,
  jobStatusFilter,
  setJobStatusFilter,
  jobSearchQuery,
  setJobSearchQuery,
  editJob,
  publishJobNow,
  toggleJob,
  closeJob,
  deleteJob,
  duplicateJob,
  navigate,
  notify,
  jobsLoading,
  jobsLoadError,
  onRetry,
}) {
  const [openMenuJobId, setOpenMenuJobId] = useState(null);
  const safeJobs = Array.isArray(jobs) ? jobs : EMPTY_LIST;
  const safeApplications = Array.isArray(applications) ? applications : EMPTY_LIST;

  const jobCounts = useMemo(() => {
    const counts = { all: safeJobs.length, active: 0, pending: 0, closed: 0 };
    safeJobs.forEach((job) => {
      counts[getJobCategory(job, normalizeJobStatus)] += 1;
    });
    return counts;
  }, [safeJobs, normalizeJobStatus]);

  const filteredJobs = useMemo(() => {
    const query = jobSearchQuery.trim().toLowerCase();
    return safeJobs.filter((job) => {
      const category = getJobCategory(job, normalizeJobStatus);
      const searchableText = `${job.title || ""} ${job.location || job.city || ""} ${job.sector || job.department || job.category || ""}`.toLowerCase();
      return (jobStatusFilter === "all" || category === jobStatusFilter)
        && (!query || searchableText.includes(query));
    });
  }, [safeJobs, jobSearchQuery, jobStatusFilter, normalizeJobStatus]);

  const shareJob = async (jobId) => {
    if (!navigator.clipboard?.writeText) {
      notify("Clipboard access is unavailable. Open the public post to copy its address.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${encodeURIComponent(String(jobId))}`);
      notify("Job link copied to clipboard.");
    } catch {
      notify("Unable to copy the job link. Check your browser clipboard permissions.", "error");
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">My Jobs</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage your roles, review applicant activity, and keep hiring moving.
          </p>
        </div>
      </header>

      <section aria-label="Job posting status summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {jobFilters.map((filter) => {
          const Icon = filter.icon;
          const isSelected = jobStatusFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setJobStatusFilter(filter.id)}
              className={`flex min-h-[155px] flex-col justify-between rounded-3xl bg-white p-6 text-left shadow-[0_10px_30px_-5px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_25px_50px_-10px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 ${
                isSelected ? "border-2 border-blue-600 ring-4 ring-blue-500/15" : "border border-slate-200/90"
              }`}
            >
              <span className="flex w-full items-start justify-between gap-3">
                <span className="text-[11px] font-bold tracking-[0.12em] text-slate-500">{filter.title}</span>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${filter.iconTone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </span>
              <span>
                <span className="block text-3xl font-black tracking-tight text-slate-900">{jobCounts[filter.id]}</span>
                <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  {filter.badge}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-wrap gap-2" role="tablist" aria-label="Filter jobs by status">
            {jobFilters.map((filter) => {
              const isSelected = jobStatusFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setJobStatusFilter(filter.id)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                  <span className={`ml-1.5 inline-flex min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
                    isSelected ? "bg-blue-500 text-white" : "bg-white text-slate-500"
                  }`}>
                    {jobCounts[filter.id]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={jobSearchQuery}
              onChange={(event) => setJobSearchQuery(event.target.value)}
              placeholder="Search by title, location, or sector..."
              aria-label="Search by title, location, or sector"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      <section aria-label="Your job listings" aria-busy={jobsLoading} className="space-y-5">
        {jobsLoading && (
          <div className="space-y-5" role="status" aria-label="Loading job listings">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse space-y-4 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7">
                <div className="h-6 w-2/5 rounded-lg bg-slate-200" />
                <div className="h-4 w-3/5 rounded-lg bg-slate-100" />
                <div className="flex gap-2">
                  <div className="h-7 w-24 rounded-lg bg-slate-100" />
                  <div className="h-7 w-28 rounded-lg bg-slate-100" />
                  <div className="h-7 w-36 rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
            <span className="sr-only">Loading your job listings…</span>
          </div>
        )}
        {!jobsLoading && jobsLoadError && (
          <div role="alert" className="rounded-3xl border border-rose-200 bg-white px-5 py-10 text-center">
            <p className="text-sm font-bold text-slate-800">{jobsLoadError}</p>
            <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700">
              Try again
            </button>
          </div>
        )}
        {!jobsLoading && !jobsLoadError && filteredJobs.map((job) => {
          const hasFutureSchedule = Boolean(job.scheduled_date && new Date(job.scheduled_date).getTime() > Date.now());
          const normalizedStatus = hasFutureSchedule ? "scheduled" : normalizeJobStatus(job.status);
          const category = getJobCategory(job, normalizeJobStatus);
          const statusDetails = getStatusDetails(job, category, normalizedStatus);
          const rawStatus = String(job.status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
          const isPublishable = rawStatus === "draft"
            || (PENDING_STATUSES.has(rawStatus) && !REJECTED_VALUES.has(String(job.approval_status ?? job.approvalStatus ?? "").toLowerCase()));
          const jobApplications = safeApplications.filter(
            (application) => String(application.job_id ?? application.jobId ?? application.job?.id ?? "") === String(job.id),
          );
          const applicantCount = getApplicantCount(job, jobApplications);
          const newApplicants = getCount(
            job.pending_count,
            job.pendingCount,
            jobApplications.filter((application) => ["pending", "applied", "new"].includes(normalizePipelineStatus(application.status))).length,
          );
          const viewCount = getCount(job.view_count);
          const deadline = formatDeadline(job.application_deadline || job.deadline || job.applicationDeadline);
          const salary = job.is_negotiable || job.is_salary_negotiable
            ? "Negotiable"
            : job.salary_min || job.salary_max
              ? `${job.currency || "ETB"} ${job.salary_min || ""}${job.salary_min && job.salary_max ? " - " : ""}${job.salary_max || ""}`
              : "Not specified";
          const jobType = formatLabel(job.job_type || job.jobType, "Full-Time");
          const workMode = formatLabel(job.work_mode || job.workMode, "On-Site");
          const isOpen = category === "active" && normalizedStatus !== "scheduled";
          const isPaused = normalizedStatus === "paused";
          const companyName = job.company_name || job.companyName || job.company || "Company";

          return (
            <article
              key={job.id}
              className="mb-5 space-y-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.06)] transition-all duration-200 hover:shadow-md sm:p-7"
            >
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-black capitalize tracking-tight text-slate-900 sm:text-2xl">
                    {job.title || "Untitled job"}
                  </h2>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-slate-500">
                    <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="break-words">{companyName}</span>
                    <span aria-hidden="true">•</span>
                    <span>{job.sector || job.department || job.category || "General"}</span>
                    <span aria-hidden="true">•</span>
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="break-words">{job.location || job.city || "Location not specified"}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold ${statusDetails.tone}`}>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${statusDetails.dot}`} />
                    {statusDetails.label}
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuJobId(openMenuJobId === job.id ? null : job.id)}
                      aria-label={`More options for ${job.title || "job"}`}
                      aria-expanded={openMenuJobId === job.id}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {openMenuJobId === job.id && (
                      <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        <button type="button" role="menuitem" onClick={() => { setOpenMenuJobId(null); duplicateJob(job); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setOpenMenuJobId(null); navigate(`/jobs/${encodeURIComponent(String(job.id))}`, { state: { job } }); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <ExternalLink className="h-3.5 w-3.5" /> View Public Post
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setOpenMenuJobId(null); closeJob(job); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <Archive className="h-3.5 w-3.5" /> Close Listing
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuJobId(null);
                            if (window.confirm(`Delete "${job.title || "this job"}"? This action cannot be undone.`)) deleteJob(job.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {category === "pending" && (
                <p className="-mt-2 text-xs font-medium text-amber-800">Publish this job now to make it live on Explore Jobs.</p>
              )}
              {statusDetails.label === "Needs Revision" && (
                <p className="-mt-2 text-xs font-medium text-rose-700">This listing needs revision before it can appear on Explore Jobs.</p>
              )}

              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{jobType}</span>
                <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">{workMode}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">💰 Salary: {salary}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold ${deadline.tone}`}>
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  <span>Deadline: {deadline.label}</span>
                </span>
              </div>

              <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  {isPublishable ? (
                    <button type="button" onClick={() => publishJobNow(job)} className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto">
                      <Globe2 className="h-4 w-4 shrink-0" /> Publish Now
                    </button>
                  ) : (
                    <a
                      href={`/employer/applications?job_id=${encodeURIComponent(String(job.id))}`}
                      className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:w-auto"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <span>View Applicants ({applicantCount})</span>
                    </a>
                  )}
                  <span className="inline-flex items-center justify-center gap-1 text-xs text-slate-500 sm:justify-start">
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                    {viewCount} Views
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row sm:flex-wrap sm:justify-end">
                  <button type="button" onClick={() => shareJob(job.id)} className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:w-auto">
                    <Link2 className="h-3.5 w-3.5" /> Share Link
                  </button>
                  <button type="button" onClick={() => editJob(job)} className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:w-auto">
                    <Edit3 className="h-3.5 w-3.5 text-slate-400" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleJob(job)}
                    disabled={!isOpen && !isPaused}
                    title={!isOpen && !isPaused ? "Only live or paused jobs can be paused or resumed." : undefined}
                    className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isPaused ? <Play className="h-3.5 w-3.5 text-slate-400" /> : <Pause className="h-3.5 w-3.5 text-slate-400" />}
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {!jobsLoading && !jobsLoadError && !filteredJobs.length && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">
              {jobSearchQuery ? "No jobs match your search" : `No ${jobFilters.find((filter) => filter.id === jobStatusFilter)?.label.toLowerCase() || "jobs"} yet`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {jobSearchQuery ? "Try a different title, location, or sector." : "Jobs with this status will appear here."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
