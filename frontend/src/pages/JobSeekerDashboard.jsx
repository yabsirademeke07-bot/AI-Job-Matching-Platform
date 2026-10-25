import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  LayoutDashboard,
  FileText,
  Search,
  Bookmark,
  ClipboardList,
  MessageSquare,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Settings,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import SeekerTelegramIntegrationCard from "../components/candidate/SeekerTelegramIntegrationCard";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getDashboardSummary,
  getRecentApplications,
  getMatchedJobs,
  getUpcomingInterviews,
} from "../services/dashboardApi";
import RecentApplications from "../components/dashboard/RecentApplications";
import { metricCardIconClassName } from "../components/dashboard/metricCardStyles";
import { beginApplication } from "../utils/applicationFlow";

function useResource(loader) {
  const [state, setState] = useState({
    data: null,
    isLoading: true,
    error: null,
  });
  const load = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    loader()
      .then((data) => setState({ data, isLoading: false, error: null }))
      .catch((error) =>
        setState({
          data: null,
          isLoading: false,
          error: error?.message || "Unable to load this section.",
        }),
      );
  }, [loader]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, retry: load };
}

export default function JobSeekerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const summary = useResource(useCallback(() => getDashboardSummary(), []));
  const applications = useResource(
    useCallback(() => getRecentApplications(user?.id), [user?.id]),
  );
  const interviews = useResource(
    useCallback(() => getUpcomingInterviews(user?.id), [user?.id]),
  );
  const exploreJobs = useResource(useCallback(() => getMatchedJobs(), []));
  const profile = summary.data?.profile || {};
  const candidateSkills = (summary.data?.skills || profile.skills || [])
    .map((skill) => typeof skill === "string" ? skill : skill?.skill_name || skill?.name || skill?.skill || "")
    .map((skill) => String(skill).trim().toLowerCase())
    .filter(Boolean);
  const candidateSector = String(profile.preferredSector || profile.preferred_sector || profile.job_category || profile.jobCategory || "")
    .trim()
    .toLowerCase();
  const displayName = user?.name || user?.full_name || user?.email || profile.name || "User";
  const avatarUrl = user?.avatarUrl || user?.avatar_url || profile.avatarUrl;
  const applicationItems = applications.data || [];
  const normalizedApplicationStatuses = applicationItems.map((item) =>
    String(item.status || "").trim().toLowerCase().replace(/[_-]+/g, " "),
  );
  const pendingStatuses = new Set(["pending", "submitted", "applied", "under review", "in review"]);
  const activeStatuses = new Set([
    ...pendingStatuses,
    "shortlisted",
    "interview",
    "interview scheduled",
    "interviewed",
  ]);
  const applicationSummary = {
    total: applicationItems.length,
    active: normalizedApplicationStatuses.filter((status) => activeStatuses.has(status)).length,
    pending: normalizedApplicationStatuses.filter((status) => pendingStatuses.has(status)).length,
    shortlisted: normalizedApplicationStatuses.filter((status) => status === "shortlisted").length,
    interview: normalizedApplicationStatuses.filter((status) =>
      ["interview", "interview scheduled", "interviewed"].includes(status),
    ).length,
    hired: normalizedApplicationStatuses.filter((status) => ["hired", "offer"].includes(status)).length,
  };
  const rankedJobs = [...(exploreJobs.data || [])]
    .map((job) => {
      const rawRequiredSkills = job.requiredSkills || job.required_skills || job.skills || [];
      const requiredSkills = (Array.isArray(rawRequiredSkills)
        ? rawRequiredSkills
        : String(rawRequiredSkills || "").split(/[,;|]/))
        .map((skill) => typeof skill === "string" ? skill : skill?.skill_name || skill?.name || skill?.skill || "")
        .map((skill) => String(skill).trim().toLowerCase())
        .filter(Boolean);
      const matchingSkills = requiredSkills.filter((skill) => candidateSkills.includes(skill)).length;
      const jobSector = String(job.sector || job.job_category || job.category || "").trim().toLowerCase();
      const sectorMatch = Boolean(candidateSector && jobSector && candidateSector === jobSector);
      const postedAt = new Date(job.created_at || job.createdAt || 0).getTime();
      const matchScore = Number(job.matchScore ?? job.match_score);
      return {
        job,
        matchingSkills,
        sectorMatch,
        matchScore: Number.isFinite(matchScore) ? matchScore : -1,
        postedAt: Number.isFinite(postedAt) ? postedAt : 0,
      };
    });
  const hasSkillMatches = rankedJobs.some(({ matchingSkills }) => matchingSkills > 0);
  const recommendedJobs = rankedJobs
    .sort((left, right) => hasSkillMatches
      ? right.matchingSkills - left.matchingSkills
        || Number(right.sectorMatch) - Number(left.sectorMatch)
        || right.matchScore - left.matchScore
        || right.postedAt - left.postedAt
      : right.postedAt - left.postedAt)
    .slice(0, 6)
    .map(({ job }) => job);
  const upcomingInterview =
    interviews.data?.find((item) => item.status === "Scheduled") || null;
  const nextAction = upcomingInterview
    ? {
        label: "View Interview",
        description: "You have an upcoming interview to review.",
        path: `/interviews/${upcomingInterview.id}`,
      }
    : null;
  const navItems = [
    ["Dashboard", "/dashboard", LayoutDashboard],
    ["View Resume", "/resume", FileText],
    ["Find Jobs", "/explore-jobs", Search],
    ["Saved Jobs", "/saved-jobs", Bookmark],
    ["My Applications", "/applications", ClipboardList],
    ["Messages", "/chat", MessageSquare],
    ["Notifications", "/notifications", Bell],
  ];
  return (
    <div className="information-page dashboard-canvas min-h-screen bg-[#f8fafc] lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200/90 bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <div className="mb-7 shrink-0 border-b border-slate-100 px-2 pb-6 pt-2">
            <p className="text-lg font-black lowercase tracking-tight text-slate-900">
              job <span className="text-[var(--brand-deep)]">matching</span>
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              AI Platform
            </p>
          </div>
          <nav
            className="seeker-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto"
            aria-label="Seeker dashboard navigation"
          >
            {navItems.map(([label, path, Icon]) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                aria-current={location.pathname === path || (path === "/dashboard" && ["/seeker-dashboard", "/seekerDashboard"].includes(location.pathname)) ? "page" : undefined}
                className={`relative flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs transition-all ${location.pathname === path || (path === "/dashboard" && ["/seeker-dashboard", "/seekerDashboard"].includes(location.pathname)) ? path === "/dashboard" ? "bg-blue-600 font-bold text-white shadow-md shadow-blue-500/25" : "border border-sky-100 bg-sky-50 font-bold text-sky-700 shadow-xs" : "font-semibold text-slate-700 hover:bg-blue-50/60 hover:text-blue-600"}`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} /> {label}
                {path === "/applications" && applicationSummary.total > 0 && (
                  <span className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${location.pathname === path ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700"}`}>
                    {applicationSummary.total}
                  </span>
                )}
                {path === "/chat" && (
                  <span className="relative ml-auto flex h-2 w-2" aria-label="Messages">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-100/80 hover:text-slate-900"
            >
              <Settings className="h-4 w-4" strokeWidth={1.8} /> Settings
            </button>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50 p-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-slate-800">{displayName}</span>
                <span className="mt-0.5 block truncate text-[10px] font-medium capitalize text-slate-500">
                  {String(user?.role || user?.userType || "Job Seeker").replace(/[_-]+/g, " ")}
                </span>
              </span>
            </div>
          </nav>
        </div>
      </aside>
      <main className="seeker-dashboard-main min-w-0 flex-1 bg-[#f8fafc] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <section
            className="dashboard-header-enter rounded-3xl border border-blue-100/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-6 shadow-sm sm:p-8"
            aria-labelledby="seeker-dashboard-title"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <h1 id="seeker-dashboard-title" className="text-xl font-black italic leading-snug tracking-tight text-slate-900 sm:text-2xl">
                  Find Your Next Career Move &amp; Track Applications
                </h1>
                <p className="mt-1.5 max-w-2xl text-xs font-medium italic leading-relaxed text-slate-500 sm:text-sm">
                  Welcome back, <span className="not-italic font-semibold text-slate-700">{profile.name || user?.name || user?.full_name || "Candidate"}</span> • Review real-time status of your applied jobs and discover new matched opportunities.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <SeekerTelegramIntegrationCard />
              </div>
            </div>
          </section>
          {summary.error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {summary.error}
            </div>
          )}
          {nextAction && (
            <section className="flex flex-col gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {nextAction.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(nextAction.path)}
                className="min-h-10 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-white"
              >
                {nextAction.label}
              </button>
            </section>
          )}
          <section aria-labelledby="application-overview-heading">
            <div className="mb-5">
              <h2
                id="application-overview-heading"
                className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
              >
                <ClipboardList className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                Application Overview
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Track your progress and see where each application stands.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {[
                {
                  label: "Active Applications",
                  value: applicationSummary.active,
                  filter: "",
                  Icon: Clock3,
                  note: "Currently active",
                  iconStyle: "bg-blue-50 text-blue-600 border-blue-100",
                  badge: "● Active Now",
                  badgeStyle: "bg-blue-100 text-blue-700",
                  cardStyle: "border-t-4 border-t-blue-500 bg-gradient-to-b from-blue-50/40 to-white",
                },
                {
                  label: "Total Applications",
                  value: applicationSummary.total,
                  filter: "",
                  Icon: BriefcaseBusiness,
                  note: "Lifetime total",
                  iconStyle: "bg-indigo-50 text-indigo-600 border-indigo-100",
                  badge: "Lifetime",
                  badgeStyle: "bg-indigo-100 text-indigo-700",
                  cardStyle: "border-t-4 border-t-indigo-500 bg-gradient-to-b from-indigo-50/40 to-white",
                },
                {
                  label: "Pending Applications",
                  value: applicationSummary.pending,
                  filter: "pending",
                  Icon: Clock3,
                  note: "Awaiting recruiter review",
                  iconStyle: "bg-amber-50 text-amber-600 border-amber-100",
                  badge: "⏳ In Review",
                  badgeStyle: "bg-amber-100 text-amber-800",
                  cardStyle: "border-t-4 border-t-amber-500 bg-gradient-to-b from-amber-50/50 to-white",
                },
                {
                  label: "Shortlisted",
                  value: applicationSummary.shortlisted,
                  filter: "shortlisted",
                  Icon: Star,
                  note: "Passed initial review",
                  iconStyle: "bg-emerald-50 text-emerald-600 border-emerald-100",
                  badge: "★ Selected!",
                  badgeStyle: "bg-emerald-100 text-emerald-700",
                  cardStyle: "border-t-4 border-t-emerald-500 bg-gradient-to-b from-emerald-50/50 to-white shadow-emerald-200/70",
                },
                {
                  label: "Interview Scheduled",
                  value: applicationSummary.interview,
                  filter: "interview",
                  Icon: CalendarDays,
                  note: "Interview stage",
                  iconStyle: "bg-cyan-50 text-cyan-600 border-cyan-100",
                  badge: "Next Step",
                  badgeStyle: "bg-cyan-100 text-cyan-700",
                  cardStyle: "border-t-4 border-t-cyan-500 bg-gradient-to-b from-cyan-50/45 to-white",
                },
                {
                  label: "Hired / Offers",
                  value: applicationSummary.hired,
                  filter: "hired",
                  Icon: Trophy,
                  note: "Offers and hires",
                  iconStyle: "bg-rose-50 text-rose-600 border-rose-100",
                  badge: "🎉 Final Goal",
                  badgeStyle: "bg-rose-100 text-rose-700",
                  cardStyle: "border-t-4 border-t-rose-500 bg-gradient-to-b from-rose-50/45 to-white",
                },
              ].map(({ label, value, filter, Icon, note, iconStyle, badge, badgeStyle, cardStyle }, index) => (
                <button
                  key={label}
                  type="button"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  onClick={() =>
                    navigate(
                      `/applications${filter ? `?status=${filter}` : ""}`,
                    )
                  }
                  className={`application-overview-card-enter group relative flex min-h-[160px] transform flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-[0_16px_36px_-8px_rgba(15,23,42,0.12),0_6px_16px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/10 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_22px_45px_-10px_rgba(0,0,0,0.14),0_8px_18px_-4px_rgba(0,0,0,0.06)] ${cardStyle} ${label === "Shortlisted" ? "shadow-[0_12px_28px_-6px_rgba(16,185,129,0.2),0_4px_12px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_22px_45px_-10px_rgba(16,185,129,0.28),0_8px_18px_-4px_rgba(0,0,0,0.06)]" : ""}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-xs font-semibold tracking-wide text-slate-600 sm:text-sm">{label}</span>
                      <span className="mt-3 block text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{value}</span>
                    </span>
                    <span className={`flex shrink-0 items-center justify-center rounded-xl border p-2.5 shadow-sm ${iconStyle} ${metricCardIconClassName}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">{note}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm ${badgeStyle}`}>{badge}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section aria-labelledby="explore-opportunities-heading" className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="explore-opportunities-heading" className="flex items-center gap-2.5 text-2xl font-black italic tracking-tight text-slate-900 sm:text-3xl">
                  <span className="bg-gradient-to-r from-slate-900 via-blue-600 to-indigo-900 bg-clip-text text-transparent animate-pulse">
                    Recommended for You
                  </span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm animate-pulse" aria-label="AI recommendations">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                </h2>
                <p className="recommendation-subtitle-enter mt-1 text-xs italic text-slate-500 sm:text-sm">
                  AI-curated opportunities prioritized by your verified skills, experience, and CV profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/explore-jobs")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-sky-600/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-sky-500"
              >
                Browse all jobs
              </button>
            </div>
            {exploreJobs.isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading jobs">
                {[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-slate-200" />)}
              </div>
            ) : exploreJobs.error ? (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {exploreJobs.error}
                <button type="button" onClick={exploreJobs.retry} className="ml-3 font-bold underline">Retry</button>
              </div>
            ) : recommendedJobs.length ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recommendedJobs.map((job, index) => (
                  <article
                    key={job.id}
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                    className="recommendation-card-enter flex flex-col rounded-2xl border border-slate-200 border-t border-t-white/90 bg-white p-5 shadow-[0_18px_38px_-8px_rgba(15,23,42,0.12),0_8px_16px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/10 transition-all duration-300 ease-out hover:-translate-y-3 hover:scale-[1.01] hover:border-sky-200 hover:shadow-[0_28px_60px_-12px_rgba(15,23,42,0.22)]"
                  >
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-900">{job.title || job.job_title}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{job.company_name || job.company || "Employer"}</p>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        {job.location && <span>{job.location}</span>}
                        {job.work_mode && <span>{job.work_mode}</span>}
                        {job.job_type && <span>{job.job_type}</span>}
                      </div>
                      {job.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{job.description}</p>}
                    </div>
                    <div className="mt-6 flex w-full items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-100"
                      >
                        View opportunity
                      </button>
                      <button
                        type="button"
                        disabled={job.isApplied}
                        onClick={() => beginApplication(job.id, navigate, {
                          selectedJob: job,
                          sourcePage: "/dashboard",
                          returnPath: "/dashboard",
                        })}
                        className={job.isApplied
                          ? "cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-400"
                          : "inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-600/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/40 active:translate-y-0"}
                      >
                        {job.isApplied ? "Already Applied" : "Apply Now"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                ምንም ክፍት ስራዎች አልተገኙም (No active jobs posted yet)
              </p>
            )}
          </section>
          <RecentApplications
            className="pt-4 space-y-6"
            title="My Applications"
            subtitle="Track the real-time progress, employer reviews, and interview schedules for all your submitted applications in one unified place."
            applications={applicationItems}
            onViewDetails={(id) => navigate(`/applications/${id}`)}
            onViewAll={() => navigate("/applications")}
            onExploreJobs={() => navigate("/explore-jobs")}
            isLoading={applications.isLoading}
            error={applications.error}
            onRetry={applications.retry}
          />
        </div>
      </main>
    </div>
  );
}
