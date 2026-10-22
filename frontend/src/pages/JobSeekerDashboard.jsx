import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import MatchedJobsPanel from "../components/dashboard/MatchedJobsPanel";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getDashboardSummary,
  getJobMatches,
  getRecentApplications,
  getTalentPoolShortlists,
  getRecommendedJobs,
  getMatchedJobs,
  getUpcomingInterviews,
} from "../services/dashboardApi";
import RecentApplications from "../components/dashboard/RecentApplications";
import UpcomingInterview from "../components/dashboard/UpcomingInterview";
import RecommendedJobs from "../components/dashboard/RecommendedJobs";
import RecommendedJobsFeed from "../components/candidate/RecommendedJobsFeed";
import seekerImage from "./images/seeker.jpg";

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
  const summary = useResource(useCallback(() => getDashboardSummary(), []));
  const matches = useResource(useCallback(() => getJobMatches(), []));
  const applications = useResource(
    useCallback(() => getRecentApplications(), []),
  );
  const talentPoolShortlists = useResource(
    useCallback(() => getTalentPoolShortlists(), []),
  );
  const interviews = useResource(
    useCallback(() => getUpcomingInterviews(), []),
  );
  const recommended = useResource(useCallback(() => getRecommendedJobs(), []));
  const matchedJobs = useResource(useCallback(() => getMatchedJobs(), []));
  useEffect(() => {
    const refreshMatches = () => matchedJobs.retry();
    window.addEventListener("profileUpdated", refreshMatches);
    return () => window.removeEventListener("profileUpdated", refreshMatches);
  }, [matchedJobs.retry]);
  const [activeTab, setActiveTab] = useState("matched");
  const profile = summary.data?.profile || {
    name: user?.name || user?.full_name || "User",
    profileCompletion: 0,
    cvReviewScore: 0,
  };
  const displayName = user?.name || user?.full_name || user?.email || profile.name || "User";
  const refreshAll = () =>
    [summary, matches, applications, talentPoolShortlists, interviews, recommended, matchedJobs].forEach(
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
    ).length + (talentPoolShortlists.data || []).length,
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
  return (
    <main className="seeker-dashboard-main min-w-0 flex-1 bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-7">
          <section
            className="relative isolate min-h-80 overflow-hidden rounded-2xl bg-slate-900 px-6 py-10 shadow-sm sm:min-h-96 sm:px-10 sm:py-14"
            style={{ backgroundImage: `url(${seekerImage})`, backgroundPosition: "center" }}
            aria-labelledby="seeker-dashboard-title"
          >
            <div className="absolute inset-0 -z-10 bg-slate-950/65" aria-hidden="true" />
            <div className="relative max-w-2xl text-white">
              <p className="text-base font-bold uppercase tracking-[0.2em] text-cyan-200">
                Job seeker dashboard
              </p>
              <h1 id="seeker-dashboard-title" className="mt-3 text-3xl font-black sm:text-4xl">
                Find the right opportunity for your next chapter
              </h1>
              <p className="mt-4 whitespace-nowrap text-base font-semibold leading-7 text-slate-100 sm:text-lg">
                Welcome back, {profile.name || user?.name || user?.full_name || "Job Seeker"}.
              </p>
            </div>
            <div className="relative mt-7 flex flex-col gap-3 sm:absolute sm:right-8 sm:top-8 sm:mt-0 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={refreshAll}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
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
            <h2
              id="application-overview-heading"
              className="mb-4 text-2xl font-black text-slate-900"
            >
              Application Overview
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Active Applications", applicationSummary.pending, "pending"],
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
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[var(--brand-primary)]"
                >
                  <p className="text-sm font-bold text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {value}
                  </p>
                </button>
              ))}
            </div>
          </section>
          <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-2" aria-label="Seeker dashboard sections">
            {[["matched", "Matched Jobs (AI)"], ["explore", "Explore Jobs"], ["applications", "My Applications"]].map(([tab, label]) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-5 py-3 text-base font-black transition ${activeTab === tab ? "bg-[var(--brand-primary)] text-white shadow-sm" : "bg-white text-slate-600 hover:bg-[var(--brand-soft)]"}`}>
                {label}{tab === "applications" && ` (${applicationSummary.total})`}
              </button>
            ))}
          </nav>
          {activeTab === "matched" && <MatchedJobsPanel jobs={matchedJobs.data || []} onApplicationSubmitted={() => { applications.retry(); matchedJobs.retry(); }} />}
          {activeTab === "explore" && <>
            <RecommendedJobsFeed onViewDetails={(id) => navigate(`/jobs/${id}`)} />
            <RecommendedJobs jobs={recommendationPreview} onViewDetails={(id) => navigate(`/jobs/${id}`)} onViewAll={() => navigate("/explore-jobs?from=dashboard")} isLoading={recommended.isLoading} error={recommended.error} onRetry={recommended.retry} />
          </>}
          {activeTab === "applications" && <RecentApplications applications={recentApplications} onViewDetails={(id) => navigate(`/applications/${id}`)} onViewAll={() => navigate("/applications")} isLoading={applications.isLoading} error={applications.error} onRetry={applications.retry} />}
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
        </div>
    </main>
  );
}
