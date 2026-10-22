import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleHelp,
  Download,
  FileText,
  LogOut,
  Maximize2,
  Settings,
  ShieldCheck,
  Target,
  UserCircle,
  UserRound,
  Users,
  ChevronDown,
  Menu,
  X,
  Clock3,
  Sparkles,
  ArrowUpRight,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  getAdminDashboardStats,
  getAdminOverview,
  moderateJob,
  updateCompanyVerification,
  updateReportStatus,
  updateUserStatus,
} from "../services/adminService";
import { useAuth } from "../context/AuthContext";
import AdminReports from "../components/admin/AdminReports";
import AdminActivityLog from "../components/admin/AdminActivityLog";

const tabs = [
  ["overview", "/admin/dashboard", "Dashboard", BarChart3],
  ["users", "/admin/users", "Users", Users],
  ["companies", "/admin/employers", "Employers", Building2],
  ["jobs", "/admin/jobs", "Jobs", BriefcaseBusiness],
  ["applications", "/admin/applications", "Applications", FileText],
  ["matching", "/admin/ai-matching", "AI Matching", Target],
  ["analytics", "/admin/analytics", "Analytics", BarChart3],
  ["activity", "/admin/activity-log", "Activity Log", Clock3],
  ["reports", "/admin/reports", "Reports", Bell],
  ["notifications", "/admin/notifications", "Notifications", Bell],
  ["settings", "/admin/settings", "Settings", Settings],
];
const fallback = {
  totalUsers: 0,
  jobSeekersCount: 0,
  employersCount: 0,
  activeJobs: 0,
  avgMatchScore: 0,
  moderationQueueCount: 0,
  pipeline: {
    pending: 0,
    shortlisted: 0,
    interviewing: 0,
    hired: 0,
    rejected: 0,
  },
};
const statusClass = {
  hired: "bg-emerald-50 text-emerald-700",
  shortlisted: "bg-blue-50 text-blue-700",
  "under-review": "bg-amber-50 text-amber-700",
  rejected: "bg-slate-100 text-slate-600",
};
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "Not provided";
const hasCompanyVerificationDocuments = (company) =>
  String(company?.employer_type || 'company').toLowerCase() === 'individual' ||
  Boolean(String(company?.tin_number || '').trim() && (
    String(company?.trade_license_number || '').trim() ||
    String(company?.trade_license_url || '').trim()
  ));
const hasJobApprovalDocuments = (job) =>
  Boolean(String(job?.employer_tin_number || '').trim() && (
    String(job?.employer_trade_license_number || '').trim() ||
    String(job?.employer_trade_license_url || '').trim()
  ));
const getSafeLicenseDocumentUrl = (value) => {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) || url.startsWith('/uploads/') ? url : '';
};

function AdminDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab =
    tabs.find(([id, path]) => path === location.pathname)?.[0] || "overview";
  const [stats, setStats] = useState(fallback);
  const [overview, setOverview] = useState({
    applications: [],
    companies: [],
    users: [],
    jobs: [],
    reports: [],
    notifications: [],
    logs: [],
    stats: fallback,
  });
  const [loading, setLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([getAdminDashboardStats(), getAdminOverview()])
      .then(([statsResult, overviewResult]) => {
        if (!mounted) return;
        const liveStats =
          statsResult.status === "fulfilled" ? statsResult.value : null;
        const data =
          overviewResult.status === "fulfilled"
            ? overviewResult.value
            : { applications: [], companies: [] };
        setStats({
          ...fallback,
          ...(liveStats || {}),
          pipeline: { ...fallback.pipeline, ...(liveStats?.pipeline || {}) },
        });
        setOverview({
          applications: data.applications || [],
          companies: data.companies || [],
          users: data.users || [],
          jobs: data.jobs || [],
          reports: data.reports || [],
          notifications: data.notifications || [],
          logs: data.logs || [],
          performance: data.performance || [],
          categories: data.categories || [],
          candidateCategories: data.candidateCategories || [],
          offline: data.offline === true,
          stats: liveStats || fallback,
        });
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const go = (path) => navigate(path);
  const cards = [
    [
      "01",
      stats.totalUsers.toLocaleString(),
      "Registered Accounts",
      `${stats.jobSeekersCount.toLocaleString()} Employees / Job Seekers and ${stats.employersCount.toLocaleString()} Employers currently registered in the database.`,
      "/admin/users",
    ],
    [
      "02",
      `${stats.activeJobs} Live`,
      "Open Job Listings",
      "Currently receiving verified candidate applications and AI skill screenings.",
      "/admin/jobs?status=published",
    ],
    [
      "03",
      `${stats.avgMatchScore}%`,
      "Average Fit Ratio",
      "Calculated from automated resume parsings and qualification signals.",
      "/admin/ai-matching",
    ],
    [
      "04",
      `${stats.moderationQueueCount} Pending`,
      "Moderation Queue",
      "Pending jobs, company verifications, and reports awaiting admin decision.",
      "/admin/jobs?status=pending",
    ],
  ];
  const pipeline = [
    [
      "pending",
      "Pending / New",
      "Initial applicant submissions",
      "text-slate-800",
      "bg-amber-400",
      "/admin/applications?status=applied",
    ],
    [
      "shortlisted",
      "Shortlisted",
      "Qualified for interviews",
      "text-blue-600",
      "bg-blue-500",
      "/admin/applications?status=shortlisted",
    ],
    [
      "interviewing",
      "Interviewing",
      "Active discussion rounds",
      "text-purple-600",
      "bg-purple-500",
      "/admin/applications?status=interview-scheduled",
    ],
    [
      "hired",
      "Hired",
      "Formal offers accepted",
      "text-emerald-600",
      "bg-emerald-500",
      "/admin/applications?status=hired",
    ],
    [
      "rejected",
      "Rejected",
      "Qualification mismatch",
      "text-slate-400",
      "bg-slate-300",
      "/admin/applications?status=rejected",
    ],
  ];
  const applications = overview.applications.slice(0, 5);
  const pendingCompanies = overview.companies.filter(
    (company) => company.verification_status === "pending",
  );
  const companies = {
    length: String(pendingCompanies.length),
    map: (renderCompany) => pendingCompanies.slice(0, 4).map(renderCompany),
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
        Loading admin workspace...
      </div>
    );
  return (
    <div className="admin-shell min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <aside className={`admin-sidebar w-full shrink-0 border-r border-[var(--brand-deep)] bg-[var(--brand-deep)] text-white lg:min-h-screen lg:w-64 ${sidebarOpen ? "block" : "hidden lg:block"}`}>
        <div className="sticky top-0 p-5 lg:h-screen">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-white">SmartRecruit AI</p>
              <p className="text-xs text-white/75">Admin workspace</p>
            </div>
          </div>
          <nav
            className="admin-nav mt-8 grid grid-cols-2 gap-1 lg:grid-cols-1"
            aria-label="Admin sections"
          >
            {tabs.map(([id, path, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => { setSidebarOpen(false); go(path); }}
                className={`flex items-center gap-3 border-l-4 px-3 py-2.5 text-left text-sm font-medium transition-colors ${activeTab === id ? "border-white bg-[var(--brand-primary)] text-white font-semibold" : "border-transparent text-white/85 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <button
            type="button"
            aria-label="Logout"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="mt-8 inline-flex w-full items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-main min-w-0 grow px-4 pb-8 sm:px-6 lg:px-10">
        <header className="-mx-4 mb-8 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div className="flex items-center gap-4">
            <button type="button" aria-label={sidebarOpen ? "Close admin navigation" : "Open admin navigation"} onClick={() => setSidebarOpen((open) => !open)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 lg:hidden">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => go("/admin/notifications")}
              className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                {overview.notifications.filter((item) => !item.is_read)
                  .length || 0}
              </span>
            </button>
            <button
              type="button"
              aria-label="Fullscreen"
              onClick={() => document.documentElement.requestFullscreen?.()}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <UserCircle className="h-6 w-6" />
                </span>
                <span className="hidden sm:block">
                  <span className="block text-sm font-black text-slate-900">
                    {user?.full_name || user?.name || "Admin User"}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {String(user?.role || "").toLowerCase() === "super_admin"
                      ? "Super Admin"
                      : "Admin"}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <UserCircle className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="font-black text-slate-900">
                          {user?.full_name || user?.name || "Admin User"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {String(user?.role || "").toLowerCase() ===
                          "super_admin"
                            ? "Super Admin"
                            : "Admin"}{" "}
                          · {user?.email || "admin@smartrecruit.ai"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        go("/admin/settings");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <UserRound className="h-4 w-4 text-slate-500" />
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        go("/admin/settings");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        go("/admin/activity-log");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Clock3 className="h-4 w-4 text-slate-500" />
                      Activity Log
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        go("/contact");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <CircleHelp className="h-4 w-4 text-slate-500" />
                      Help &amp; Support
                    </button>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                        navigate("/login", { replace: true });
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <span className="flex items-center gap-3">
                        <LogOut className="h-4 w-4" />
                        Logout
                      </span>
                      <span className="text-xs">Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        {activeTab !== "overview" && activeTab !== "reports" && activeTab !== "activity" && (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              {tabs.find(([id]) => id === activeTab)?.[2]}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{tabs.find(([id]) => id === activeTab)?.[2]}</h1>
            <p className="mt-2 text-sm text-slate-500">Manage and monitor this area of the SmartRecruit platform.</p>
          </>
        )}
        {activeTab === "reports" && <AdminReports />}
        {activeTab === "activity" && <AdminActivityLog />}
        {activeTab !== "overview" && activeTab !== "reports" && activeTab !== "activity" && (
          <AdminModule tab={activeTab} overview={overview} go={go} />
        )}
        {activeTab === "overview" && (
          <AdminOverview stats={stats} overview={overview} go={go} adminName={user?.full_name || user?.name || "Admin"} />
        )}
        {activeTab === "__legacy_disabled__" && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(([index, value, title, subtitle, path]) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => go(path)}
                  className="group cursor-pointer rounded-2xl border border-slate-100/90 bg-white p-7 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                    {index}
                  </p>
                  <p className="my-2.5 text-3xl font-black tracking-tight text-slate-900 lg:text-4xl">
                    {value}
                  </p>
                  <h2 className="text-base font-bold text-slate-800">
                    {title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {subtitle}
                  </p>
                  <span className="mt-4 block text-right text-sm font-semibold text-blue-600 transition-transform group-hover:translate-x-1">
                    -&gt;
                  </span>
                </button>
              ))}
            </div>
            <section className="mt-10 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Pipeline overview
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Platform Recruitment Lifecycle
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Real-time candidate distribution from application to placement.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3 lg:grid-cols-5">
                {pipeline.map(([key, label, note, text, dot, path]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => go(path)}
                    className="group rounded-xl p-2 text-left transition hover:bg-slate-50"
                  >
                    <p className={`text-2xl font-bold ${text}`}>
                      {stats.pipeline[key]}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      <span
                        className={`mr-1.5 inline-block h-2 w-2 rounded-full ${dot}`}
                      />
                      {label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{note}</p>
                    <span className="mt-2 block text-xs font-bold text-blue-600 opacity-0 transition group-hover:opacity-100">
                      Inspect -&gt;
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black">
                    Recent Candidate Applications
                  </h2>
                  <button
                    type="button"
                    onClick={() => go("/admin/applications")}
                    className="text-xs font-semibold text-blue-600"
                  >
                    View All Applications -&gt;
                  </button>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="py-3">Candidate</th>
                        <th className="py-3">Role &amp; Company</th>
                        <th className="py-3">AI Match</th>
                        <th className="py-3">Status</th>
                        <th className="py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-3.5">
                            <p className="font-bold">{item.candidate_name}</p>
                            <p className="text-xs text-slate-500">
                              {item.candidate_email || "Candidate profile"}
                            </p>
                          </td>
                          <td className="py-3.5">
                            <p className="font-semibold">{item.job_title}</p>
                            <p className="text-xs text-slate-500">
                              {item.employer_name}
                            </p>
                          </td>
                          <td className="py-3.5">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {item.ai_match_score || 0}% Fit
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[item.status] || "bg-slate-100 text-slate-600"}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-xs text-slate-500">
                            {formatDate(item.applied_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black">Pending Verification</h2>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {companies.length || 5}
                  </span>
                </div>
                <div className="mt-5 divide-y divide-slate-100">
                  {companies.map((company) => (
                    <div key={company.id} className="py-4 first:pt-0">
                      <p className="font-bold">{company.company_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {company.industry || "Company verification"}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        TIN: {company.tin_number || "Pending document"}
                      </p>
                      <button
                        type="button"
                        onClick={() => go("/admin/employers")}
                        className="mt-2 text-xs font-semibold text-blue-600"
                      >
                        Review Registration Document -&gt;
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function AdminOverview({ stats, overview, go, adminName }) {
  const [range, setRange] = useState("7d");
  const [now, setNow] = useState(() => new Date());
  const performance = overview.performance || [];
  const pendingJobs = (overview.jobs || []).filter((job) =>
    ["pending", "pending_approval", "draft"].includes(String(job.status || "").toLowerCase()),
  );
  const candidateCategories = (overview.candidateCategories || []).filter((item) => {
    const category = String(item.category || "").trim().toLowerCase();
    return category && !["select sector", "select category", "not specified", "n/a"].includes(category);
  });
  const categoryTotal = candidateCategories.reduce((total, item) => total + Number(item.total || 0), 0);
  const recentJobs = [...(overview.jobs || [])]
    .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
    .slice(0, 5);
  const activeJobs = Number(stats.activeJobs || 0);
  const candidateCount = Number(stats.jobSeekersCount || 0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const exportAnalytics = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total candidates", candidateCount],
      ["Active jobs", activeJobs],
      ["AI match rate", `${Number(stats.avgMatchScore || 0)}%`],
      ["Registered companies", Number(stats.employersCount || 0)],
      ["Candidate growth vs last month", `${Number(stats.candidateGrowthPercent || 0)}%`],
      ["Jobs posted this week", Number(stats.newJobsThisWeek || 0)],
      [],
      ["Date", "Applications", "Matches"],
      ...performance.map((item) => [item.day, item.applications, item.matches]),
      [],
      ["Candidate sector", "Candidates", "Share"],
      ...candidateCategories.map((item) => [item.category, item.total, `${categoryTotal ? Math.round((Number(item.total || 0) / categoryTotal) * 100) : 0}%`]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `smartrecruit-analytics-${now.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const metricByDay = new Map(performance.map((item) => [String(item.day).slice(0, 10), {
    applications: Number(item.applications || 0),
    matches: Number(item.matches || 0),
  }]));
  let chartRows;
  if (range === "all") {
    const monthly = new Map();
    metricByDay.forEach((metrics, day) => {
      const month = day.slice(0, 7);
      const current = monthly.get(month) || { applications: 0, matches: 0 };
      monthly.set(month, {
        applications: current.applications + metrics.applications,
        matches: current.matches + metrics.matches,
      });
    });
    chartRows = [...monthly.entries()].map(([day, metrics]) => ({ day, ...metrics, label: new Date(`${day}-15T12:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" }) }));
  } else {
    const days = range === "7d" ? 7 : 30;
    chartRows = Array.from({ length: days }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - index - 1));
      const key = dayKey(date);
      return {
        day: key,
        label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        ...(metricByDay.get(key) || { applications: 0, matches: 0 }),
      };
    });
  }
  const chartMax = Math.max(1, ...chartRows.map((item) => Math.max(item.applications, item.matches)));

  const activity = [
    ...(overview.users || []).filter((user) => ["job_seeker", "seeker", "employee", "user"].includes(String(user.role || "").toLowerCase())).map((user) => ({
      id: `user-${user.id}`,
      label: `Candidate ${user.full_name || "account"} registered`,
      detail: user.email,
      created_at: user.created_at,
      icon: Users,
      tone: "bg-blue-100 text-blue-700",
    })),
    ...(overview.logs || []).map((log, index) => ({
      id: `log-${log.user_id || index}-${log.created_at}`,
      label: `${String(log.full_name || "User")} ${String(log.activity_type || "updated activity").replaceAll(/[_-]/g, " ")}`,
      detail: log.email,
      created_at: log.created_at,
      icon: Activity,
      tone: "bg-violet-100 text-violet-700",
    })),
    ...(overview.jobs || []).map((job) => ({
      id: `job-${job.id}`,
      label: `Job “${job.title || "Untitled job"}” ${["active", "published"].includes(String(job.status || "").toLowerCase()) ? "is live" : "was posted"}`,
      detail: job.company_name || job.location || "Job listing",
      created_at: job.updated_at || job.created_at,
      icon: BriefcaseBusiness,
      tone: "bg-emerald-100 text-emerald-700",
    })),
  ].sort((left, right) => (new Date(right.created_at || 0).getTime() || 0) - (new Date(left.created_at || 0).getTime() || 0)).slice(0, 6);

  const kpis = [
    { label: "Total candidates", value: candidateCount, note: `${Number(stats.candidateGrowthPercent || 0) >= 0 ? "+" : ""}${Number(stats.candidateGrowthPercent || 0)}% from last month`, Icon: Users, tone: "bg-blue-50 text-blue-700", trend: true, path: "/admin/users" },
    { label: "Active jobs", value: activeJobs, note: `+${Number(stats.newJobsThisWeek || 0)} new this week`, Icon: BriefcaseBusiness, tone: "bg-emerald-50 text-emerald-700", path: "/admin/jobs" },
    { label: "AI match rate", value: `${Number(stats.avgMatchScore || 0)}%`, note: "Average compatibility score", Icon: Sparkles, tone: "bg-violet-50 text-violet-700", path: "/admin/ai-matching" },
    { label: "Registered companies", value: Number(stats.employersCount || 0), note: `${Number(overview.companies?.filter((company) => company.verification_status === "verified").length || 0)} verified profiles`, Icon: Building2, tone: "bg-amber-50 text-amber-700", path: "/admin/employers" },
  ];

  return (
    <div className="space-y-6 pb-4">
      <section className="mt-6 flex flex-col justify-between gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Welcome back, {adminName}</h1>
            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ${overview.offline ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              <span className={`h-2 w-2 rounded-full ${overview.offline ? "bg-rose-500" : "bg-emerald-500"}`} />
              {overview.offline ? "Platform data unavailable" : "System operational"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p>
          <p className="mt-1 text-sm text-slate-500">A clear view of hiring activity, matching performance, and platform health.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => go("/admin/jobs")} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"><Plus className="h-4 w-4" />Post new job</button>
          <button type="button" onClick={() => go("/admin/jobs?status=pending")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><Clock3 className="h-4 w-4 text-amber-600" />Review pending ({pendingJobs.length})</button>
          <button type="button" onClick={exportAnalytics} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><Download className="h-4 w-4" />Export analytics</button>
        </div>
      </section>

      <section aria-label="Platform metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, note, Icon, tone, trend, path }) => (
          <button key={label} type="button" onClick={() => go(path)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <div className="flex items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-600" /></div>
            <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-slate-950">{typeof value === "number" ? value.toLocaleString() : value}</p>
            <p className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${trend ? "text-emerald-700" : "text-slate-500"}`}>{trend && <TrendingUp className="h-3.5 w-3.5" />}{note}</p>
          </button>
        ))}
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-12">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-700" /><h2 className="text-base font-black text-slate-900">Platform growth</h2></div><p className="mt-1 text-sm text-slate-500">Applications and AI matches over time</p></div>
            <div className="inline-flex self-start rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Chart date range">
              {[ ["7d", "7 days"], ["30d", "30 days"], ["all", "All time"] ].map(([value, label]) => <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)} className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${range === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-slate-600"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-blue-600" />Applications</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Scored matches</span></div>
          {performance.length ? (
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="grid h-56 min-w-[560px] items-end gap-2 border-b border-l border-slate-100 px-2 pb-2 pt-3" style={{ gridTemplateColumns: `repeat(${chartRows.length}, minmax(24px, 1fr))` }}>
                {chartRows.map((item) => (
                  <div key={item.day} title={`${item.day}: ${item.applications} applications, ${item.matches} scored matches`} className="flex h-full min-w-0 items-end justify-center gap-1 border-b border-slate-100/70">
                    <div className="w-[42%] rounded-t bg-blue-600 transition-[height] duration-300" style={{ height: `${item.applications ? Math.max((item.applications / chartMax) * 100, 2) : 0}%` }} />
                    <div className="w-[42%] rounded-t bg-emerald-500 transition-[height] duration-300" style={{ height: `${item.matches ? Math.max((item.matches / chartMax) * 100, 2) : 0}%` }} />
                    <span className="sr-only">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="grid min-w-[560px] gap-2 px-2 pt-2 text-center text-[10px] font-medium text-slate-400" style={{ gridTemplateColumns: `repeat(${chartRows.length}, minmax(24px, 1fr))` }}>
                {chartRows.map((item, index) => <span key={item.day}>{range === "30d" && index % 5 !== 0 ? "" : item.label}</span>)}
              </div>
            </div>
          ) : <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 text-center"><BarChart3 className="h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No application activity yet</p><p className="mt-1 text-xs text-slate-500">Growth metrics will appear as candidates apply to jobs.</p></div>}
        </div>

        <div className="grid gap-5 xl:col-span-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="text-base font-black text-slate-900">AI insights</h2><p className="mt-1 text-sm text-slate-500">Candidate distribution by sector</p></div><Sparkles className="h-5 w-5 text-violet-600" /></div>
            {candidateCategories.length ? <div className="mt-5 space-y-4">{candidateCategories.slice(0, 5).map((item, index) => {
              const count = Number(item.total || 0);
              const share = categoryTotal ? Math.round((count / categoryTotal) * 100) : 0;
              const colors = ["bg-blue-600", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-rose-500"];
              return <div key={item.category}><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-700">{item.category}</span><span className="shrink-0 tabular-nums text-slate-500">{share}% <span className="text-slate-400">({count})</span></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${share}%` }} /></div></div>;
            })}</div> : <div className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center"><p className="text-sm font-semibold text-slate-700">Sector insights are building</p><p className="mt-1 text-xs text-slate-500">Candidate sectors appear as profiles are completed.</p></div>}
          </section>
          <section className={`rounded-2xl border p-5 shadow-sm ${pendingJobs.length ? "border-amber-200 bg-amber-50/70" : "border-emerald-200 bg-emerald-50/60"}`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pendingJobs.length ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{pendingJobs.length ? <Clock3 className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span>
              <div className="min-w-0 flex-1"><p className={`text-xs font-bold uppercase tracking-wide ${pendingJobs.length ? "text-amber-800" : "text-emerald-800"}`}>Pending actions</p><h2 className="mt-1 font-black text-slate-900">{pendingJobs.length ? `${pendingJobs.length} job${pendingJobs.length === 1 ? "" : "s"} need review` : "All caught up"}</h2><p className="mt-1 text-sm text-slate-600">{pendingJobs.length ? "Review new listings before they go live." : "No jobs pending review right now."}</p>{pendingJobs.length > 0 && <button type="button" onClick={() => go("/admin/jobs?status=pending")} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-900 hover:underline">Open review queue <ArrowUpRight className="h-4 w-4" /></button>}</div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-black text-slate-900">Recent platform activity</h2><p className="mt-1 text-sm text-slate-500">New accounts and recent platform events</p></div><button type="button" onClick={() => go("/admin/activity-log")} className="shrink-0 text-xs font-bold text-blue-700 hover:text-blue-900">View log</button></div>
          {activity.length ? <div className="mt-5 divide-y divide-slate-100">{activity.map((item) => {
            const Icon = item.icon;
            return <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.tone}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{item.label}</p><p className="mt-0.5 truncate text-xs text-slate-500">{item.detail || "SmartRecruit platform"}</p></div><time className="shrink-0 whitespace-nowrap text-[11px] text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Recent"}</time></div>;
          })}</div> : <div className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center"><Activity className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">No recent activity</p><p className="mt-1 text-xs text-slate-500">New registrations and platform events will appear here.</p></div>}
        </div>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-5"><div><h2 className="text-base font-black text-slate-900">Latest job listings</h2><p className="mt-1 text-sm text-slate-500">Recently submitted opportunities</p></div><button type="button" onClick={() => go("/admin/jobs")} className="shrink-0 text-xs font-bold text-blue-700 hover:text-blue-900">Manage jobs</button></div>
          {recentJobs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[610px] text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Job</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right"> </th></tr></thead><tbody className="divide-y divide-slate-100">{recentJobs.map((job) => {
            const status = String(job.status || "pending").toLowerCase();
            const isActive = ["active", "published"].includes(status);
            const isPending = ["pending", "pending_approval", "draft"].includes(status);
            const company = job.company_name || job.employer_name || "Company";
            return <tr key={job.id} className="hover:bg-slate-50/70"><td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-black text-blue-700">{String(company).trim().slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="max-w-40 truncate text-xs font-bold text-slate-800">{job.title || "Untitled job"}</p><p className="max-w-40 truncate text-[10px] text-slate-500">{company}{job.category ? ` · ${job.category}` : ""}</p></div></div></td><td className="max-w-28 truncate px-4 py-3 text-xs text-slate-500">{job.location || "Not provided"}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{job.created_at ? new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize ${isActive ? "bg-emerald-100 text-emerald-700" : isPending ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{isActive ? "Active" : isPending ? "Pending" : status.replaceAll("_", " ")}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => go("/admin/jobs")} className="rounded-md px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50">Manage</button></td></tr>;
          })}</tbody></table></div> : <div className="px-5 py-10 text-center"><BriefcaseBusiness className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">No job listings yet</p><p className="mt-1 text-xs text-slate-500">New opportunities will appear here.</p></div>}
        </section>
      </section>
    </div>
  );
}

function AdminModule({ tab, overview, go }) {
  const [processingId, setProcessingId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [moderatingJob, setModeratingJob] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationAction, setModerationAction] = useState('reject');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [jobRows, setJobRows] = useState(overview.jobs || []);
  const [userRows, setUserRows] = useState(overview.users || []);
  const [feedback, setFeedback] = useState(null);
  useEffect(() => {
    if (tab === "jobs") setJobRows(overview.jobs || []);
  }, [tab, overview.jobs]);
  const rows =
    tab === "users"
      ? userRows
      : tab === "companies"
        ? overview.companies || []
        : tab === "jobs"
          ? jobRows
          : tab === "applications" || tab === "matching"
            ? overview.applications || []
            : tab === "reports"
              ? overview.reports || []
              : tab === "notifications"
                ? overview.notifications || []
                : tab === "activity"
                  ? overview.logs || []
                  : [];
  const handleJobModeration = async (job, action, reason = '') => {
    const normalizedReason = String(reason || '').trim();
    if (normalizedReason.length < 20) {
      setFeedback({ type: "error", message: "Please provide a reason of at least 20 characters." });
      return false;
    }
    if (action === 'approve' && !hasJobApprovalDocuments(job)) {
      window.alert('Employer TIN and trade license details are required before approving this job.');
      return false;
    }
    setProcessingId(job.id);
    const nextStatus = action === "approve" ? "active" : "rejected";
    setJobRows((current) => current.map((item) => String(item.id) === String(job.id)
      ? { ...item, status: nextStatus, rejection_reason: normalizedReason || null, is_approved: action === "approve", isApproved: action === "approve" }
      : item));
    try {
      await moderateJob(job.id, action, normalizedReason);
      setSelectedJob((current) => current && String(current.id) === String(job.id)
        ? { ...current, status: nextStatus, rejection_reason: normalizedReason || null }
        : current);
      return true;
    } catch (error) {
      setJobRows((current) => current.map((item) => String(item.id) === String(job.id) ? job : item));
      window.alert(error.response?.data?.message || "Unable to update this job.");
      return false;
    } finally {
      setProcessingId(null);
    }
  };
  const startJobModeration = (job, action) => {
    if (action === 'approve' && !hasJobApprovalDocuments(job)) {
      window.alert('Employer TIN and trade license details are required before approving this job.');
      return;
    }
    setModeratingJob(job);
    setModerationAction(action);
    setModerationReason('');
  };
  const submitJobModeration = async (event) => {
    event.preventDefault();
    if (!moderatingJob || moderationReason.trim().length < 20) return;
    const completed = await handleJobModeration(moderatingJob, moderationAction, moderationReason);
    if (completed) {
      setModeratingJob(null);
      setModerationReason('');
    }
  };
  const runRowAction = async (row, action) => {
    setProcessingId(row.id);
    setFeedback(null);
    try {
      if (tab === "users") {
        const status = row.status === "active" ? "suspended" : "active";
        setUserRows((current) => current.map((item) => String(item.id) === String(row.id)
          ? { ...item, status, is_active: status === "active" ? 1 : 0 }
          : item));
        const { data } = await updateUserStatus(row.id, status);
        setFeedback({ type: "success", message: data.message });
        return;
      } else if (tab === "companies") {
        await updateCompanyVerification(row.company_profile_id || row.id, action);
      } else if (tab === "reports") {
        await updateReportStatus(row.id, action);
      }
      window.location.reload();
    } catch (error) {
      if (tab === "users") {
        setUserRows((current) => current.map((item) => String(item.id) === String(row.id)
          ? { ...item, status: row.status, is_active: row.is_active }
          : item));
        setFeedback({ type: "error", message: error.response?.data?.message || "Unable to update user status." });
      } else {
        window.alert(error.response?.data?.message || "Unable to complete this action.");
      }
    } finally {
      setProcessingId(null);
    }
  };
  const getModulePath = () => ({
    users: "/admin/users",
    companies: "/admin/employers",
    jobs: "/admin/jobs",
    applications: "/admin/applications",
    matching: "/admin/ai-matching",
    reports: "/admin/reports",
    notifications: "/admin/notifications",
    activity: "/admin/activity-log",
  })[tab] || "/admin/dashboard";
  if (tab === "settings")
    return (
      <div className="mt-8 grid max-w-3xl gap-6 md:grid-cols-2">
        <ModuleCard title="Admin Profile">
          <p className="text-sm text-slate-600">
            {overview.adminEmail || "Administrator account"}
          </p>
          <p className="mt-2 text-xs text-slate-500">Role: admin</p>
        </ModuleCard>
        <ModuleCard title="Platform Settings">
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700">
            Maintenance mode
            <input type="checkbox" className="h-4 w-4 accent-blue-600" />
          </label>
          <label className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-700">
            Email notifications
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 accent-blue-600"
            />
          </label>
        </ModuleCard>
      </div>
    );
  if (tab === "analytics")
    return (
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <ModuleCard title="Users" value={overview.stats?.totalUsers || 0} />
        <ModuleCard
          title="Active Jobs"
          value={overview.stats?.activeJobs || 0}
        />
        <ModuleCard
          title="Applications"
          value={overview.stats?.totalApplications || 0}
        />
        <ModuleCard
          title="Average Match"
          value={`${overview.stats?.avgMatchScore || 0}%`}
        />
      </div>
    );
  return (
    <>
      {feedback && tab === "users" && (
        <p role={feedback.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-6 rounded-lg px-4 py-3 text-sm font-semibold ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      )}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="p-4">Name / Title</th>
            <th className="p-4">Email / Company</th>
            <th className="p-4">Status</th>
            <th className="p-4">Date</th>
            <th className="p-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="p-4 font-semibold text-slate-800">
                  {row.full_name ||
                    row.company_name ||
                    row.title ||
                    row.candidate_name ||
                    row.reporter_name ||
                    row.recipient_name}
                </td>
                <td className="p-4 text-slate-600">
                  {row.email ||
                    row.rep_email ||
                    row.employer_name ||
                    row.job_title ||
                    row.message ||
                    "-"}
                </td>
                <td className="p-4">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {row.status ||
                      row.activity_type ||
                      row.verification_status ||
                      (row.is_read ? "Read" : "Unread") ||
                      "Active"}
                  </span>
                </td>
                <td className="p-4 text-xs text-slate-500">
                  {formatDate(row.created_at || row.applied_at)}
                </td>
                <td className="p-4 text-right">
                  {tab === "jobs" ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => setSelectedJob(row)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Details</button>
                      {String(row.status || "").toLowerCase() === "rejected" ? <span className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">✕ Rejected</span> : String(row.status || "").toLowerCase() === "active" || String(row.status || "").toLowerCase() === "published" && (row.is_approved === true || row.is_approved === 1 || row.isApproved === true) ? <span className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">✓ Approved</span> : <><button type="button" disabled={processingId === row.id || !hasJobApprovalDocuments(row)} title={hasJobApprovalDocuments(row) ? 'Approve job' : 'Employer TIN and trade license are required.'} onClick={() => startJobModeration(row, "approve")} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Approve</button><button type="button" disabled={processingId === row.id} onClick={() => startJobModeration(row, "reject")} className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">Reject</button></>}
                    </div>
                  ) : tab === "companies" ? (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setSelectedCompany(row)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Details</button>
                      {String(row.verification_status || "").toLowerCase() === "pending" && <><button type="button" disabled={processingId === row.id || !hasCompanyVerificationDocuments(row)} title={hasCompanyVerificationDocuments(row) ? 'Approve company' : 'TIN and trade license details are required before approval.'} onClick={() => runRowAction(row, "verified")} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Approve</button><button type="button" disabled={processingId === row.id} onClick={() => runRowAction(row, "rejected")} className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">Reject</button></>}
                    </div>
                  ) : tab === "users" ? (
                    <button type="button" disabled={processingId === row.id} onClick={() => runRowAction(row, "toggle")} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50">{row.status === "active" ? "Suspend" : "Activate"}</button>
                  ) : tab === "reports" && ["pending", "under-review"].includes(String(row.status || "").toLowerCase()) ? (
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={processingId === row.id} onClick={() => runRowAction(row, "resolved")} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Resolve</button>
                      <button type="button" disabled={processingId === row.id} onClick={() => runRowAction(row, "dismissed")} className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">Dismiss</button>
                    </div>
                  ) : tab === "notifications" ? (
                    <button type="button" onClick={() => setSelectedNotification(row)} className="text-xs font-bold text-blue-600 hover:text-blue-800">View</button>
                  ) : (
                    <button type="button" onClick={() => go(getModulePath())} className="text-xs font-bold text-blue-600 hover:text-blue-800">View</button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="5"
                className="p-10 text-center text-sm text-slate-500"
              >
                No records available yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Job details">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Job details</p><h2 className="mt-1 text-2xl font-black text-slate-900">{selectedJob.title || "Untitled job"}</h2><p className="mt-1 text-sm text-slate-500">{selectedJob.company_name || selectedJob.employer_name || "Employer"} · {selectedJob.location || "Location not provided"}</p></div>
              <button type="button" onClick={() => setSelectedJob(null)} className="rounded-lg px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Status</p><p className="mt-1 font-bold text-slate-900">{selectedJob.status || "Pending"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Job type</p><p className="mt-1 font-bold text-slate-900">{selectedJob.job_type || selectedJob.type || "Not provided"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Created</p><p className="mt-1 font-bold text-slate-900">{formatDate(selectedJob.created_at)}</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">Employer TIN</p><p className="mt-1 break-words font-bold text-slate-900">{selectedJob.employer_tin_number || 'Not provided'}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">Trade license / registration</p><p className="mt-1 break-words font-bold text-slate-900">{selectedJob.employer_trade_license_number || 'Not provided'}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">License document</p><p className="mt-1 break-words text-sm font-bold text-slate-900">{getSafeLicenseDocumentUrl(selectedJob.employer_trade_license_url) ? <a href={getSafeLicenseDocumentUrl(selectedJob.employer_trade_license_url)} target="_blank" rel="noreferrer" className="text-blue-700 underline">Open license</a> : selectedJob.employer_trade_license_url ? 'Document link unavailable' : 'Not provided'}</p></div>
            </div>
            {!hasJobApprovalDocuments(selectedJob) && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Approval is unavailable until the employer provides a TIN and trade license number or document.</p>}
            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedJob.description || "No job description provided."}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" disabled={processingId === selectedJob.id || !hasJobApprovalDocuments(selectedJob)} title={hasJobApprovalDocuments(selectedJob) ? 'Approve job' : 'Employer TIN and trade license are required.'} onClick={() => startJobModeration(selectedJob, "approve")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Approve</button><button type="button" disabled={processingId === selectedJob.id} onClick={() => startJobModeration(selectedJob, "reject")} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">Reject</button></div>
          </div>
        </div>
      )}
      {moderatingJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="job-moderation-title">
          <form onSubmit={submitJobModeration} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="job-moderation-title" className="text-xl font-black text-slate-900">{moderationAction === 'approve' ? 'Approve' : 'Reject'} job listing</h2>
            <p className="mt-2 text-sm text-slate-600">Provide a reason of at least 20 characters. The decision will be recorded in the admin activity log.</p>
            <p className="mt-3 text-sm font-bold text-slate-800">{moderatingJob.title || 'Untitled job'}</p>
            <label htmlFor="job-moderation-reason" className="mt-5 block text-sm font-bold text-slate-700">{moderationAction === 'approve' ? 'Approval reason' : 'Rejection reason'}</label>
            <textarea
              id="job-moderation-reason"
              autoFocus
              required
              minLength={20}
              value={moderationReason}
              onChange={(event) => setModerationReason(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={moderationAction === 'approve' ? 'Explain why this job meets the requirements...' : 'Explain what needs to be corrected...'}
              className={`mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm text-slate-900 outline-none focus:ring-4 ${moderationAction === 'approve' ? 'focus:border-emerald-500 focus:ring-emerald-500/10' : 'focus:border-rose-500 focus:ring-rose-500/10'}`}
            />
            <p className="mt-1 text-right text-xs text-slate-500">{moderationReason.trim().length}/20 characters minimum</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={processingId === moderatingJob.id} onClick={() => { setModeratingJob(null); setModerationReason(''); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={moderationReason.trim().length < 20 || processingId === moderatingJob.id} className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${moderationAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>{processingId === moderatingJob.id ? (moderationAction === 'approve' ? 'Approving...' : 'Rejecting...') : `${moderationAction === 'approve' ? 'Approve' : 'Reject'} job`}</button>
            </div>
          </form>
        </div>
      )}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Employer profile details">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Employer profile review</p><h2 className="mt-1 text-2xl font-black text-slate-900">{selectedCompany.company_name || "Unnamed employer"}</h2><p className="mt-1 text-sm text-slate-500">{selectedCompany.industry || "Industry not provided"} · {selectedCompany.location || "Location not provided"}</p></div>
              <button type="button" onClick={() => setSelectedCompany(null)} className="rounded-lg px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[['Representative', selectedCompany.rep_name], ['Email', selectedCompany.rep_email], ['Phone', selectedCompany.rep_phone], ['TIN', selectedCompany.tin_number], ['Trade license / registration number', selectedCompany.trade_license_number], ['License document', selectedCompany.trade_license_url], ['Website', selectedCompany.website], ['Hiring volume', selectedCompany.hiring_volume], ['Verification', selectedCompany.verification_status], ['Submitted', formatDate(selectedCompany.created_at)]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{label === 'License document' && value ? <a href={value} target="_blank" rel="noreferrer" className="text-blue-700 underline">Open license document</a> : value || 'Not provided'}</p></div>)}
            </div>
            {!hasCompanyVerificationDocuments(selectedCompany) && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Approval is unavailable until a TIN and trade license number or document are submitted.</p>}
            <div className="mt-5 rounded-xl border border-slate-100 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Additional information</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedCompany.profile_description || 'No additional information provided.'}</p></div>
          </div>
        </div>
      )}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-notification-title">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Notification details</p>
                <h2 id="admin-notification-title" className="mt-1 text-xl font-black text-slate-900">{selectedNotification.title || 'Notification'}</h2>
              </div>
              <button type="button" onClick={() => setSelectedNotification(null)} className="rounded-lg px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Recipient</dt><dd className="mt-1 break-words text-sm font-bold text-slate-800">{selectedNotification.recipient_name || selectedNotification.user_id || 'Not available'}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Type</dt><dd className="mt-1 text-sm font-bold text-slate-800">{selectedNotification.type || 'System'}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Status</dt><dd className="mt-1 text-sm font-bold text-slate-800">{selectedNotification.is_read ? 'Read' : 'Unread'}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Date</dt><dd className="mt-1 text-sm font-bold text-slate-800">{formatDate(selectedNotification.created_at)}</dd></div>
              {selectedNotification.related_job_id && <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Related job</dt><dd className="mt-1 text-sm font-bold text-slate-800">#{selectedNotification.related_job_id}</dd></div>}
              {selectedNotification.related_application_id && <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Related application</dt><dd className="mt-1 text-sm font-bold text-slate-800">#{selectedNotification.related_application_id}</dd></div>}
            </dl>
            <div className="mt-4 rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Message</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{selectedNotification.message || 'No message provided.'}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModuleCard({ title, value, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      {value !== undefined && (
        <p className="mt-4 text-3xl font-black text-slate-900">{value}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
export default AdminDashboard;
