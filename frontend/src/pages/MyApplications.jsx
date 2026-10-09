import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const tabs = [
  "All",
  "Pending",
  "Shortlisted",
  "Interview",
  "Hired",
  "Rejected",
];
const applicationStages = ["Applied", "Shortlisted", "Interview", "Final Decision"];

const getApplicationStage = (status) => {
  if (status === "Shortlisted") return 1;
  if (status === "Interview") return 2;
  if (["Hired", "Rejected"].includes(status)) return 3;
  return 0;
};

const normalizeStatus = (value) => {
  const status = String(value || "Pending")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();

  if (["submitted", "applied", "pending", "in review", "new"].includes(status))
    return "Pending";
  if (["under review", "under-review", "review"].includes(status))
    return "Under Review";
  if (["shortlisted", "shortlist"].includes(status)) return "Shortlisted";
  if (["interview", "interviewed", "interview scheduled", "interview-scheduled"].includes(status))
    return "Interview";
  if (["hired", "offer", "accepted"].includes(status)) return "Hired";
  if (["rejected", "declined", "withdrawn"].includes(status)) return "Rejected";

  return status
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const statusStyles = {
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  "Under Review": "bg-amber-50 text-amber-800 ring-amber-200",
  Shortlisted: "bg-blue-50 text-blue-800 ring-blue-200",
  Interview: "bg-violet-50 text-violet-800 ring-violet-200",
  Hired: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Rejected: "bg-red-50 text-red-800 ring-red-200",
  Withdrawn: "bg-slate-100 text-slate-700 ring-slate-200",
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

export default function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [talentPoolShortlists, setTalentPoolShortlists] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadApplications = async (isRefresh = false) => {
      try {
        const { data } = await api.get("/seeker/applications");
        const items = (data?.applications || []).map((item) => ({
          ...item,
          id: item.id ?? item.applicationId ?? item.jobId,
          title: item.jobTitle || item.title || item.role || "Untitled application",
          company:
            item.company || item.company_name || item.companyName || "Company unavailable",
          status: normalizeStatus(item.status),
          appliedDate: formatDate(item.appliedAt || item.applied_at || item.createdAt),
          matchScore: item.aiMatchScore ?? item.matchScore ?? item.match_breakdown?.overall,
          interview: item.interview || null,
        }));

        if (active) setApplications(items);
        try {
          const { data: shortlistData } = await api.get('/seeker/talent-pool-shortlists');
          const shortlistItems = (shortlistData?.shortlists || []).map((item) => ({
            ...item,
            id: `talent-pool-shortlist-${item.employerId}-${item.id}`,
            title: 'Profile shortlisted for future opportunities',
            company: item.employerName || 'Employer',
            status: 'Shortlisted',
            appliedDate: formatDate(item.notificationDate || item.savedAt),
            message: item.notificationMessage || `${item.employerName || 'An employer'} saved your profile for future opportunities. This is not a job application.`,
            isTalentPoolShortlist: true,
          }));
          if (active) setTalentPoolShortlists(shortlistItems);
        } catch {
          if (active) setTalentPoolShortlists([]);
        }
      } catch {
        if (!isRefresh && active) setError("Unable to load your real application records. Please retry.");
      } finally {
        if (active && !isRefresh) setLoading(false);
      }
    };

    loadApplications();
    const handleApplicationSync = () => loadApplications(true);
    window.addEventListener('job-matching:updated', handleApplicationSync);
    const intervalId = window.setInterval(() => loadApplications(true), 10000);
    return () => {
      active = false;
      window.removeEventListener('job-matching:updated', handleApplicationSync);
      window.clearInterval(intervalId);
    };
  }, []);

  const summary = useMemo(
    () => ({
      All: applications.length,
      Pending: applications.filter(({ status }) => ["Pending", "Under Review"].includes(status)).length,
      Shortlisted: applications.filter(({ status }) => status === "Shortlisted").length + talentPoolShortlists.length,
      Interview: applications.filter(({ status }) => status === "Interview")
        .length,
      Hired: applications.filter(({ status }) => status === "Hired").length,
      Rejected: applications.filter(({ status }) => status === "Rejected")
        .length,
    }),
    [applications, talentPoolShortlists],
  );

  const filteredApplications = activeTab === "All"
    ? applications
    : activeTab === "Shortlisted"
      ? [...applications.filter(({ status }) => status === "Shortlisted"), ...talentPoolShortlists]
      : applications.filter(({ status }) => activeTab === "Pending" ? ["Pending", "Under Review"].includes(status) : status === activeTab);

  return (
    <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <header>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">My Applications</h1>
              <p className="mt-2 text-sm text-slate-500">Track and manage your job applications in one place.</p>
            </div>
          </div>
        </header>

        <section className="mt-6" aria-labelledby="summary-title">
          <h2 id="summary-title" className="sr-only">
            Application summary
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {tabs.map((tab) => (
              <div
                key={tab}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-xs font-bold text-slate-500">{tab}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {summary[tab]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div
          className="mt-7 overflow-x-auto border-b border-slate-200"
          role="tablist"
          aria-label="Filter applications"
        >
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`min-h-11 border-b-2 px-4 text-sm font-bold transition ${activeTab === tab ? "border-[var(--brand-primary)] text-[var(--brand-deep)]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-5" aria-live="polite">
          {loading && (
            <div className="space-y-3">
              <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
            </div>
          )}
          {!loading && error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          {!loading && !error && activeTab === "All" && applications.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="text-lg font-black text-slate-900">
                No Applications Yet
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {talentPoolShortlists.length > 0
                  ? "An employer saved your profile to their Talent Pool. That is not a job application; apply to a job to track it here."
                  : "You have not applied for any jobs yet."}
              </p>
              <button
                type="button"
                onClick={() => navigate("/explore-jobs")}
                className="mt-5 rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)]"
              >
                Find Jobs
              </button>
            </div>
          )}
          {!loading &&
            !error &&
            (applications.length > 0 || talentPoolShortlists.length > 0) &&
            filteredApplications.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <h2 className="text-lg font-black text-slate-900">
                  No {activeTab} Applications
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  You currently do not have any applications in the {activeTab}{" "}
                  stage.
                </p>
              </div>
            )}
          {!loading && !error && filteredApplications.length > 0 && (
            <div className="space-y-3">
              {filteredApplications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black text-slate-900">
                        {application.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {application.company}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        {!application.isTalentPoolShortlist && <span className="font-semibold text-slate-700">
                          AI Match:{" "}
                          <strong className="text-[var(--brand-deep)]">
                            {application.matchScore != null
                              ? `${application.matchScore}%`
                              : "Not available"}
                          </strong>
                        </span>}
                        <span className="text-slate-500">
                          {application.isTalentPoolShortlist ? application.notificationSent ? "Talent-pool shortlist · Notified:" : "Talent-pool shortlist · Notification pending:" : "Applied:"} {application.appliedDate}
                        </span>
                        {!application.isTalentPoolShortlist && <span className="sr-only">
                          Applied: {application.appliedDate}
                        </span>}
                        {application.interview && (
                          <span className="font-semibold text-violet-700">
                            Interview status: {application.interview.status}
                          </span>
                        )}
                      </div>
                    </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[application.status] || statusStyles.Pending}`}
                      >
                        Status: {application.status}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {!application.isTalentPoolShortlist && <button
                          type="button"
                          disabled={!application.id}
                          onClick={() => {
                            if (application.id)
                              navigate(
                                `/applications/${encodeURIComponent(String(application.id))}`,
                                { state: { application } },
                              );
                          }}
                          className="min-h-11 rounded-xl border border-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          View Application
                        </button>}
                        {application.interview && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/interviews/${encodeURIComponent(String(application.interview.id))}`,
                                { state: { sourcePath: "/applications" } },
                              )
                            }
                            className="min-h-11 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white"
                          >
                            View Interview
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                    {application.isTalentPoolShortlist ? (
                    <p className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                      {application.message} Apply to an open job separately to create an application and track its hiring stages here.
                    </p>
                  ) : <ol
                    className="mt-5 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4"
                    aria-label={`${application.title} application progress`}
                  >
                    {applicationStages.map((stage, index) => {
                      const activeStage = getApplicationStage(application.status);
                      const isTerminal = ["Hired", "Rejected"].includes(application.status);
                      const completed = index < activeStage || (isTerminal && index === activeStage);
                      const current = index === activeStage && !isTerminal;
                      const label = index === 3 && isTerminal ? application.status : stage;
                      return (
                        <li key={stage} className="min-w-0 text-center">
                          <span
                            className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${completed ? "bg-blue-600 text-white" : current ? "border-2 border-blue-600 bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`}
                          >
                            {completed ? "✓" : index + 1}
                          </span>
                          <span className={`mt-1 block truncate text-[10px] font-semibold ${completed || current ? "text-slate-700" : "text-slate-400"}`}>
                            {label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
