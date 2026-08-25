import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  RefreshCw,
  LayoutDashboard,
  User,
  FileText,
  Target,
  Search,
  Bookmark,
  ClipboardList,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getDashboardSummary,
  getJobMatches,
  getRecentApplications,
  getRecommendedJobs,
  getUpcomingInterviews,
} from "../services/dashboardApi";
import AIJobMatches from "../components/dashboard/AIJobMatches";
import RecentApplications from "../components/dashboard/RecentApplications";
import UpcomingInterview from "../components/dashboard/UpcomingInterview";
import RecommendedJobs from "../components/dashboard/RecommendedJobs";

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
  const { user, logout } = useAuth();
  const location = useLocation();
  const summary = useResource(useCallback(() => getDashboardSummary(), []));
  const matches = useResource(useCallback(() => getJobMatches(), []));
  const applications = useResource(
    useCallback(() => getRecentApplications(), []),
  );
  const interviews = useResource(
    useCallback(() => getUpcomingInterviews(), []),
  );
  const recommended = useResource(useCallback(() => getRecommendedJobs(), []));
  const [savedJobs, setSavedJobs] = useState(() =>
    JSON.parse(localStorage.getItem("savedJobs") || "[]"),
  );
  const profile = summary.data?.profile || {
    name: user?.name || user?.full_name || "User",
    profileCompletion: 0,
    cvReviewScore: 0,
  };
  const toggleSave = (id) =>
    setSavedJobs((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      localStorage.setItem("savedJobs", JSON.stringify(next));
      return next;
    });
  const refreshAll = () =>
    [summary, matches, applications, interviews, recommended].forEach(
      (resource) => resource.retry(),
    );
  const joinInterview = (url) =>
    window.open(url, "_blank", "noopener,noreferrer");
  const applicationItems = applications.data || [];
  const applicationSummary = {
    total: applicationItems.length,
    pending: applicationItems.filter((item) =>
      ["Pending", "Submitted", "Applied", "Under Review", "In Review"].includes(
        item.status,
      ),
    ).length,
    shortlisted: applicationItems.filter(
      (item) => item.status === "Shortlisted",
    ).length,
    interview: applicationItems.filter((item) =>
      ["Interview", "Interview Scheduled"].includes(item.status),
    ).length,
    hired: applicationItems.filter((item) =>
      ["Hired", "Offer"].includes(item.status),
    ).length,
  };
  const upcomingInterview =
    interviews.data?.find((item) => item.status === "Scheduled") || null;
  const recentApplications = applicationItems.slice(0, 5);
  const matchPreview = (matches.data || []).slice(0, 3);
  const recommendationPreview = (recommended.data || []).slice(0, 3);
  const nextAction =
    profile.profileCompletion < 80
      ? {
          label: "Complete Your Profile",
          description: "Complete your profile to improve job matching.",
          path: "/profile",
        }
      : !localStorage.getItem("seekerResume")
        ? {
            label: "Upload Your Resume",
            description: "Upload your resume to start applying for jobs.",
            path: "/resume",
          }
        : upcomingInterview
          ? {
              label: "View Interview",
              description: "You have an upcoming interview to review.",
              path: `/interviews/${upcomingInterview.id}`,
            }
          : null;
  const navItems = [
    ["Dashboard", "/dashboard", LayoutDashboard],
    ["My Profile", "/profile", User],
    ["My Resume", "/resume", FileText],
    ["Explore Jobs", "/explore-jobs", Search],
    ["AI Job Matches", "/ai-matches", Target],
    ["Saved Jobs", "/saved-jobs", Bookmark],
    ["My Applications", "/applications", ClipboardList],
    ["Messages", "/chat", MessageSquare],
    ["Notifications", "/notifications", Bell],
  ];
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <div className="information-page min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <div className="mb-8 border-b border-slate-100 pb-5">
            <p className="text-lg font-black lowercase text-slate-900">
              job <span className="text-[var(--brand-deep)]">matching</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              AI Platform
            </p>
          </div>
          <nav
            className="flex-1 space-y-1"
            aria-label="Seeker dashboard navigation"
          >
            {navItems.map(([label, path, Icon]) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${location.pathname === path || (path === "/dashboard" && location.pathname === "/seeker-dashboard") ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-[var(--brand-soft)]"
            >
              <Settings className="h-4 w-4" /> Settings
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-500 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-7">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
              <p className="mt-2 text-base font-semibold text-slate-700">
                Welcome back,{" "}
                {profile.name || user?.name || user?.full_name || "Job Seeker"}.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Here is an overview of your job search activity.
              </p>
            </div>
            <div className="flex flex-col gap-3 self-start sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate("/explore-jobs")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--brand-primary)] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
              >
                Find Jobs
              </button>
              <button
                type="button"
                onClick={refreshAll}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </header>
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
            <h2
              id="application-overview-heading"
              className="mb-3 text-lg font-black text-slate-900"
            >
              Application Overview
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ["Total Applications", applicationSummary.total, ""],
                ["Pending", applicationSummary.pending, "pending"],
                ["Shortlisted", applicationSummary.shortlisted, "shortlisted"],
                ["Interview", applicationSummary.interview, "interview"],
                ["Hired", applicationSummary.hired, "hired"],
              ].map(([label, value, filter]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/applications${filter ? `?status=${filter}` : ""}`,
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[var(--brand-primary)]"
                >
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {value}
                  </p>
                </button>
              ))}
            </div>
          </section>
          {interviews.isLoading ? (
            <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ) : upcomingInterview ? (
            <UpcomingInterview
              interview={upcomingInterview}
              onViewDetails={(id) => navigate(`/interviews/${id}`, { state: { sourcePath: "/dashboard" } })}
              onJoin={joinInterview}
              isLoading={false}
              error={interviews.error}
              onRetry={interviews.retry}
            />
          ) : (
            <section
              className="rounded-xl border border-slate-200 bg-white p-5"
              aria-labelledby="upcoming-interview-heading"
            >
              <h2
                id="upcoming-interview-heading"
                className="text-lg font-black text-slate-900"
              >
                Upcoming Interview
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                No upcoming interviews.
              </p>
            </section>
          )}
          <RecentApplications
            applications={recentApplications}
            onViewDetails={(id) => navigate(`/applications/${id}`)}
            onViewAll={() => navigate("/applications")}
            isLoading={applications.isLoading}
            error={applications.error}
            onRetry={applications.retry}
          />
          {!matches.isLoading && (
            <AIJobMatches
              jobs={matchPreview}
              savedJobs={savedJobs}
              onSave={toggleSave}
              onViewDetails={(id) => navigate(`/jobs/${id}`)}
              onViewAll={() => navigate("/ai-matches")}
              isLoading={false}
              error={matches.error}
              onRetry={matches.retry}
            />
          )}
          <RecommendedJobs
            jobs={recommendationPreview}
            onViewDetails={(id) => navigate(`/jobs/${id}`)}
            onViewAll={() => navigate("/explore-jobs")}
            isLoading={recommended.isLoading}
            error={recommended.error}
            onRetry={recommended.retry}
          />
        </div>
      </main>
    </div>
  );
}
