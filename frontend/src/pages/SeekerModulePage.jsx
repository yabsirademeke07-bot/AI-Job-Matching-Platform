import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Camera,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Inbox,
  KeyRound,
  LockKeyhole,
  Mail,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Mic2,
  Phone,
  PhoneOff,
  MonitorSmartphone,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  UserRound,
  Bell,
  X,
  Send,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import api from "../services/api";
import TelegramConnectCard from "../components/TelegramConnectCard";
import { buildApplicationSubmissionPayload } from "../utils/applicationFlow";

const modules = {
  matches: {
    title: "AI Job Matches",
    eyebrow: "PERSONALIZED FOR YOU",
    icon: Target,
    description:
      "Ranked opportunities based on your CV, skills, preferences, and career goals.",
  },
  saved: {
    title: "Saved Jobs",
    eyebrow: "YOUR SHORTLIST",
    icon: Bookmark,
    description:
      "Keep promising opportunities in one place and apply before deadlines.",
  },
  applications: {
    title: "My Applications",
    eyebrow: "APPLICATION TRACKER",
    icon: FileText,
    description:
      "Follow every application from submission to interview and offer.",
  },
  skillgap: {
    title: "Skill Gap Analysis",
    eyebrow: "AI CAREER INSIGHT",
    icon: TrendingUp,
    description:
      "See the skills that can increase your match score and plan your next move.",
  },
  interview: {
    title: "AI Interview Prep",
    eyebrow: "PRACTICE WITH AI",
    icon: Mic2,
    description:
      "Prepare with role-specific questions and receive instant feedback.",
  },
  notifications: {
    title: "Notifications",
    eyebrow: "YOUR UPDATES",
    icon: Bell,
    description:
      "Stay on top of job alerts, application updates, and interview invitations.",
  },
  settings: {
    title: "Settings",
    eyebrow: "ACCOUNT CONTROL",
    icon: Settings,
    description:
      "Manage preferences, notifications, privacy, and account security.",
  },
};

const normalizeNotification = (item) => ({
  ...item,
  type: ({
    APPLICATION: "application",
    NEW_APPLICATION: "application",
    SHORTLIST: "application",
    STATUS_CHANGE: "application",
    HIRING: "application",
    INTERVIEW: "interview",
    MESSAGE: "message",
    AI_MATCH: "ai_match",
    NEW_JOB_ALERT: "job",
    JOB_STATUS: "job",
    SYSTEM: "system",
    VERIFICATION: "system",
    INVITATION: "system",
  })[String(item.type || "").toUpperCase()] || String(item.type || "system").toLowerCase(),
  label: ({
    APPLICATION: "Application",
    NEW_APPLICATION: "Application",
    SHORTLIST: "Application",
    STATUS_CHANGE: "Application",
    HIRING: "Application",
    INTERVIEW: "Interview",
    MESSAGE: "Message",
    AI_MATCH: "AI match",
    NEW_JOB_ALERT: "Job alert",
    JOB_STATUS: "Job update",
    SYSTEM: "System",
    VERIFICATION: "System",
    INVITATION: "System",
  })[String(item.type || "").toUpperCase()] || "Update",
  relatedId: item.related_application_id || item.relatedConversationId || item.relatedId || item.reference_id,
  relatedJobId: item.related_job_id || item.relatedJobId,
  relatedInterviewId: item.related_interview_id || item.relatedInterviewId,
  actionUrl: item.action_url || item.actionUrl,
  companyName: item.companyName || item.company_name || "",
  senderName: item.senderName || item.sender_name || "",
  isRead: Boolean(item.is_read ?? item.isRead),
});

const notificationTimeAgo = (value) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const getNotificationCategory = (notification) => {
  if (notification.type === "interview") return "interviews";
  if (notification.type === "message") return "messages";
  if (["application", "new_application"].includes(notification.type)) return "applications";
  return "other";
};

const getNotificationPresentation = (notification) => {
  const category = getNotificationCategory(notification);
  if (category === "interviews") return { Icon: CalendarDays, label: "Interview", action: "View interview", color: "text-violet-700 bg-violet-50 ring-violet-100" };
  if (category === "messages") return { Icon: MessageCircle, label: "Message", action: "Reply message", color: "text-sky-700 bg-sky-50 ring-sky-100" };
  if (category === "applications") return { Icon: ClipboardCheck, label: "Application", action: "Track status", color: "text-emerald-700 bg-emerald-50 ring-emerald-100" };
  if (notification.type === "ai_match" || notification.type === "recommendation") return { Icon: Sparkles, label: "AI match", action: "View jobs", color: "text-indigo-700 bg-indigo-50 ring-indigo-100" };
  if (notification.type === "job") return { Icon: BriefcaseBusiness, label: "Job update", action: "View job", color: "text-amber-700 bg-amber-50 ring-amber-100" };
  return { Icon: Building2, label: "Update", action: "View update", color: "text-slate-600 bg-slate-100 ring-slate-200" };
};

const applicationStatuses = [
  {
    id: "applied",
    label: "Applied",
    description: "Application sent",
    color: "border-yellow-200 bg-yellow-50 text-yellow-800",
  },
  {
    id: "review",
    label: "In Review / Shortlisted",
    description: "Employer is reviewing",
    color: "border-blue-200 bg-blue-50 text-blue-800",
  },
  {
    id: "interview",
    label: "Interview",
    description: "Interview scheduled",
    color: "border-violet-200 bg-violet-50 text-violet-800",
  },
  {
    id: "offer",
    label: "Offer / Hired",
    description: "Offer received",
    color: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    id: "rejected",
    label: "Rejected",
    description: "Application closed",
    color: "border-red-200 bg-red-50 text-red-800",
  },
  {
    id: "withdrawn",
    label: "Withdrawn",
    description: "Application withdrawn",
    color: "border-slate-200 bg-slate-50 text-slate-700",
  },
];

const roleRoadmaps = {
  "Senior AI/ML Engineer": {
    current: ["Python", "Pandas", "SQL"],
    missing: ["PyTorch", "Docker", "Kubernetes", "LLM Fine-Tuning"],
    roadmap: [
      {
        phase: "1",
        title: "Deep Learning Foundations",
        duration: "4 weeks",
        skills: ["PyTorch", "Neural networks"],
        courses: [
          {
            name: "PyTorch for Deep Learning",
            provider: "freeCodeCamp · Free",
            url: "https://www.youtube.com/watch?v=V_xro1bcAuA",
          },
        ],
      },
      {
        phase: "2",
        title: "Production ML Engineering",
        duration: "3 weeks",
        skills: ["Docker", "Model serving"],
        courses: [
          {
            name: "Docker for Developers",
            provider: "Docker · Free",
            url: "https://www.docker.com/101-tutorial/",
          },
        ],
      },
      {
        phase: "3",
        title: "Scale and LLM Systems",
        duration: "5 weeks",
        skills: ["Kubernetes", "LLM Fine-Tuning"],
        courses: [
          {
            name: "Kubernetes Basics",
            provider: "Kubernetes · Free",
            url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
          },
          {
            name: "LLM Fine-Tuning",
            provider: "DeepLearning.AI · Paid",
            url: "https://www.deeplearning.ai/short-courses/",
          },
        ],
      },
    ],
  },
  "Senior Frontend Engineer": {
    current: ["React.js", "JavaScript", "CSS", "Git"],
    missing: ["TypeScript", "Next.js", "Testing", "System Design"],
    roadmap: [
      {
        phase: "1",
        title: "Type-safe React",
        duration: "3 weeks",
        skills: ["TypeScript", "Next.js"],
        courses: [
          {
            name: "TypeScript Handbook",
            provider: "TypeScript · Free",
            url: "https://www.typescriptlang.org/docs/handbook/intro.html",
          },
        ],
      },
      {
        phase: "2",
        title: "Reliable Frontend Systems",
        duration: "3 weeks",
        skills: ["Testing", "Performance"],
        courses: [
          {
            name: "Testing JavaScript Applications",
            provider: "Testing Library · Free",
            url: "https://testing-library.com/docs/",
          },
        ],
      },
      {
        phase: "3",
        title: "Senior Engineering Practice",
        duration: "4 weeks",
        skills: ["System Design", "Architecture"],
        courses: [
          {
            name: "Frontend System Design",
            provider: "Frontend Masters · Paid",
            url: "https://frontendmasters.com/courses/frontend-system-design/",
          },
        ],
      },
    ],
  },
};

const interviewScenarios = {
  "Senior React Developer": {
    "YeneTech Solutions": [
      {
        type: "Technical",
        question:
          "How would you improve the performance of a React application with a slow dashboard?",
      },
      {
        type: "Behavioral",
        question:
          "Tell us about a difficult frontend problem you solved and what you learned.",
      },
      {
        type: "Technical",
        question:
          "How do you design a reliable API integration in a React and Node.js application?",
      },
    ],
    "EthioTelecom Innovation Lab": [
      {
        type: "Technical",
        question:
          "How would you structure a reusable component system for a large product team?",
      },
      {
        type: "Behavioral",
        question:
          "Describe a time you disagreed with a technical decision and how you handled it.",
      },
    ],
  },
  "Senior AI/ML Engineer": {
    "Kacha Digital Financial": [
      {
        type: "Technical",
        question:
          "How would you deploy and monitor a machine-learning model in production?",
      },
      {
        type: "Behavioral",
        question:
          "Tell us about a time your data or model result was challenged by stakeholders.",
      },
    ],
  },
};

function MatchCard({ job, featured = false, onViewDetails, onApply, applied }) {
  return (
    <article
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${featured ? "border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[var(--brand-deep)]">
            {featured ? "Best Match" : "Recommended"}
          </p>
          <h2 className="mt-2 text-lg font-black text-slate-900">
            {job.title}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {job.company}
          </p>
          <p className="mt-2 text-sm text-slate-500">{job.location}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[var(--brand-deep)]">
            {job.score == null ? "Not available" : `${job.score}%`}
          </p>
          <p className="text-xs font-bold text-slate-500">AI Match</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{job.whyMatch || "Match details are unavailable."}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Skills Match</p>
          <p className="mt-1 font-black text-slate-900">{job.skillsMatch == null ? "Not available" : `${job.skillsMatch}%`}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Experience Match</p>
          <p className="mt-1 font-black text-slate-900">
            {job.experienceMatch == null ? "Not available" : `${job.experienceMatch}%`}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="font-bold text-slate-700">Matching Skills</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.matchingSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-bold text-slate-700">Skills to Improve</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.skillsToImprove.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onViewDetails(job)}
        className="mt-5 min-h-11 rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-black text-white hover:bg-[var(--brand-primary-hover)]"
      >
        View Details
      </button>
      <button
        type="button"
        onClick={() => onApply(job)}
        disabled={applied}
        className="mt-2 min-h-11 rounded-xl border border-[var(--brand-primary)] px-4 py-3 text-sm font-black text-[var(--brand-deep)] hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700"
      >
        {applied ? "Applied" : "Apply Now"}
      </button>
    </article>
  );
}

export default function SeekerModulePage({ module: moduleProp }) {
  const { module: routeModule } = useParams();
  const module = moduleProp || routeModule || "matches";
  const navigate = useNavigate();
  const current = modules[module] || modules.matches;
  const [savedJobList, setSavedJobList] = useState([]);
  const [savedJobToRemove, setSavedJobToRemove] = useState(null);
  const [toast, setToast] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [scoreFilter, setScoreFilter] = useState("70");
  const [salaryFilter, setSalaryFilter] = useState("0");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [targetRole, setTargetRole] = useState("Senior AI/ML Engineer");
  const [notificationTab, setNotificationTab] = useState("all");
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationFeedback, setNotificationFeedback] = useState("");
  const [caughtUpNotificationIds, setCaughtUpNotificationIds] = useState(new Set());
  const [applications, setApplications] = useState([]);
  const [moduleDataLoading, setModuleDataLoading] = useState(["saved", "applications", "notifications"].includes(module));
  const [moduleDataError, setModuleDataError] = useState("");
  const [interviewRole, setInterviewRole] = useState("Senior React Developer");
  const [interviewCompany, setInterviewCompany] =
    useState("YeneTech Solutions");
  const [interviewMode, setInterviewMode] = useState("chat");
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordVisibility, setPasswordVisibility] = useState({ current: false, next: false, confirm: false });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [directContactProtection, setDirectContactProtection] = useState(true);
  const [privacySaved, setPrivacySaved] = useState(false);
  const [interviewStep, setInterviewStep] = useState(0);
  const [interviewMessages, setInterviewMessages] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [settingsSection, setSettingsSection] = useState("account");
  const [accountForm, setAccountForm] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return {
        displayName: user.name || user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        headline: user.headline || "",
        location: user.location || "",
        telegramUsername: user.telegram_username || user.telegramUsername || "",
      };
    } catch {
      return { displayName: "", email: "", phone: "", headline: "", location: "", telegramUsername: "" };
    }
  });
  const [accountAvatar, setAccountAvatar] = useState("");
  const [accountEmailVerified, setAccountEmailVerified] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [notificationSettings, setNotificationSettings] = useState({
    applications: true,
    interviews: true,
    messages: true,
    recommendations: true,
    system: true,
  });
  const [notificationPreferencesSaved, setNotificationPreferencesSaved] = useState(false);
  const [smsPreferenceEnabled, setSmsPreferenceEnabled] = useState(true);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsCommunications, setSmsCommunications] = useState([]);
  const [smsHistoryLoading, setSmsHistoryLoading] = useState(false);
  const [smsHistoryError, setSmsHistoryError] = useState("");
  const [smsReplyingId, setSmsReplyingId] = useState(null);
  const [smsRepliedIds, setSmsRepliedIds] = useState(new Set());
  const [resumeVisible, setResumeVisible] = useState(true);
  const [dataPreferences, setDataPreferences] = useState(true);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [realMatches, setRealMatches] = useState([]);
  const [appliedMatchIds, setAppliedMatchIds] = useState(new Set());
  const [matchesLoading, setMatchesLoading] = useState(module === "matches");
  const [matchesError, setMatchesError] = useState("");

  useEffect(() => {
    if (module !== "matches") return undefined;
    let active = true;
    setMatchesLoading(true);
    api.get("/seeker/matched-jobs")
      .then(({ data }) => {
        if (!active) return;
        const nextMatches = (data.jobs || []).map((job) => ({
          ...job,
          company: job.company || job.company_name || "Company",
          location: job.location || job.city || "Location not specified",
          score: job.matchScore == null ? null : Number(job.matchScore),
          matchScore: job.matchScore == null ? null : Number(job.matchScore),
          skillsMatch: job.skillsMatch == null && job.skills_match_score == null ? null : Number(job.skillsMatch ?? job.skills_match_score),
          experienceMatch: job.experienceMatch == null && job.experience_match_score == null ? null : Number(job.experienceMatch ?? job.experience_match_score),
          salaryMin: Number(job.salary_min || 0),
          jobType: job.jobType || job.job_type || "",
          matchingSkills: job.matchedSkills || job.matchingSkills || [],
          skillsToImprove: job.missingSkills || job.skillsToImprove || [],
          whyMatch: job.rationale || "",
        }));
        setRealMatches(nextMatches);
        setAppliedMatchIds(new Set(nextMatches.filter((job) => job.isApplied).map((job) => String(job.id))));
      })
      .catch((error) => active && setMatchesError(error?.response?.data?.message || "Unable to load recommended jobs."))
      .finally(() => active && setMatchesLoading(false));
    return () => { active = false; };
  }, [module]);

  useEffect(() => {
    if (module !== "settings") return undefined;
    let active = true;
    setSmsHistoryLoading(true);
    setSmsHistoryError("");
    api.get("/seeker/sms")
      .then(({ data }) => {
        if (!active) return;
        setSmsPreferenceEnabled(Boolean(data.preference?.enabled));
        setSmsPhone(data.phone || "");
        const records = Array.isArray(data.communications) ? data.communications : [];
        setSmsCommunications(records);
        setSmsRepliedIds(new Set(records
          .filter((record) => record.communicationType === "seeker_reply")
          .map((record) => String(record.parentCommunicationId))));
      })
      .catch((error) => {
        if (active) setSmsHistoryError(error.response?.data?.message || "Unable to load SMS communications.");
      })
      .finally(() => active && setSmsHistoryLoading(false));
    return () => { active = false; };
  }, [module]);

  useEffect(() => {
    if (module !== "settings") return undefined;
    let active = true;
    api.get("/seeker/profile/full")
      .then(({ data }) => {
        if (!active) return;
        const profile = data?.profile || {};
        setAccountForm({
          displayName: profile.full_name || profile.name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          headline: profile.headline || "",
          location: profile.location || profile.city || "",
          telegramUsername: profile.telegram_username || "",
        });
        setAccountAvatar(profile.avatar_url || profile.profile_picture_url || "");
        setAccountEmailVerified(profile.is_verified === true || Number(profile.is_verified) === 1);
      })
      .catch((requestError) => {
        if (active) setAccountError(requestError.response?.data?.message || "Unable to load account information.");
      });
    return () => { active = false; };
  }, [module]);

  useEffect(() => {
    if (!["saved", "applications", "notifications"].includes(module)) return undefined;
    let active = true;
    setModuleDataLoading(true);
    setModuleDataError("");
    const endpoint = module === "saved" ? "/seeker/saved-jobs" : module === "applications" ? "/seeker/applications" : "/seeker/notifications";
    api.get(endpoint)
      .then(({ data }) => {
        if (!active) return;
        if (module === "saved") setSavedJobList((Array.isArray(data?.jobs) ? data.jobs : []).map((job) => ({
          ...job,
          company: job.company || job.company_name,
          jobType: job.jobType || job.job_type,
          savedAt: job.savedAt || (job.saved_at ? new Date(job.saved_at).toLocaleDateString() : "Date unavailable"),
        })));
        if (module === "applications") setApplications((Array.isArray(data?.applications) ? data.applications : []).map((application) => ({
          ...application,
          title: application.title || application.jobTitle,
          date: application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "Date unavailable",
          status: ["pending", "submitted", "applied", "under review", "in review"].includes(String(application.status || "").toLowerCase()) ? "applied"
            : ["shortlisted", "review"].includes(String(application.status || "").toLowerCase()) ? "review"
              : ["interview", "interview scheduled"].includes(String(application.status || "").toLowerCase()) ? "interview"
                : ["hired", "offer"].includes(String(application.status || "").toLowerCase()) ? "offer"
                  : String(application.status || "").toLowerCase(),
        })));
        if (module === "notifications") setNotificationItems((Array.isArray(data?.notifications) ? data.notifications : []).map(normalizeNotification));
      })
      .catch((requestError) => {
        if (active) setModuleDataError(requestError.response?.data?.message || "Unable to load this section.");
      })
      .finally(() => active && setModuleDataLoading(false));
    return () => { active = false; };
  }, [module]);

  useEffect(() => {
    if (module !== "notifications") return undefined;
    let active = true;
    const refreshNotifications = async () => {
      try {
        const { data } = await api.get("/seeker/notifications");
        if (active) {
          setNotificationItems((Array.isArray(data?.notifications) ? data.notifications : []).map(normalizeNotification));
        }
      } catch (requestError) {
        if (active) setModuleDataError(requestError.response?.data?.message || "Unable to refresh notifications.");
      }
    };
    const intervalId = window.setInterval(refreshNotifications, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [module]);

  useEffect(() => {
    if (!savedJobToRemove) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSavedJobToRemove(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [savedJobToRemove]);
  useEffect(() => {
    if (!showDeleteAccount) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowDeleteAccount(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showDeleteAccount]);
  const displayedApplications = applications;

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const removeSavedJob = async () => {
    if (!savedJobToRemove) return;
    try {
      await api.delete(`/seeker/saved-jobs/${savedJobToRemove.id}`);
      setSavedJobList((items) => items.filter((item) => String(item.id) !== String(savedJobToRemove.id)));
      setSavedJobToRemove(null);
      notify("Job removed from saved jobs");
    } catch (requestError) {
      setModuleDataError(requestError.response?.data?.message || "Unable to remove saved job.");
    }
  };

  const notificationFilters = [
    { id: "all", label: "All", Icon: Inbox, count: notificationItems.length },
    { id: "unread", label: "Unread", Icon: Bell, count: notificationItems.filter((item) => !item.isRead).length },
    { id: "interviews", label: "Interviews", Icon: CalendarDays, count: notificationItems.filter((item) => getNotificationCategory(item) === "interviews").length },
    { id: "messages", label: "Messages", Icon: MessageCircle, count: notificationItems.filter((item) => getNotificationCategory(item) === "messages").length },
    { id: "applications", label: "Applications", Icon: FileText, count: notificationItems.filter((item) => getNotificationCategory(item) === "applications").length },
  ];
  const displayedSmsCommunications = [...new Map(smsCommunications.map((communication) => [
    [
      communication.communicationType,
      communication.companyName,
      communication.jobTitle,
      String(communication.messageBody || "").trim().replace(/\s+/g, " ").toLowerCase(),
    ].join("|"),
    communication,
  ])).values()];
  const formatSmsTimestamp = (value) => {
    if (!value) return "Date unavailable";
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? "Date unavailable" : timestamp.toLocaleString();
  };
  const getSmsStatusClasses = (status) => {
    const normalizedStatus = String(status || "").toUpperCase();
    if (["DELIVERED", "CONFIRMED", "RECEIVED"].includes(normalizedStatus)) return "bg-emerald-50 text-emerald-700";
    if (["FAILED", "REJECTED", "UNDELIVERED"].includes(normalizedStatus)) return "bg-rose-50 text-rose-700";
    return "bg-amber-50 text-amber-700";
  };
  const visibleNotifications = notificationItems.filter((item) => {
    if (notificationTab === "all") return true;
    if (notificationTab === "unread") return !item.isRead || caughtUpNotificationIds.has(String(item.id));
    return getNotificationCategory(item) === notificationTab;
  });

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        await api.patch(`/seeker/notifications/${notification.id}/read`);
        setNotificationItems((items) => items.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
        window.dispatchEvent(new Event("seeker-notifications:updated"));
      } catch (requestError) {
        setModuleDataError(requestError.response?.data?.message || "Unable to update notification.");
      }
    }
    if (notification.type === "application" && notification.relatedId)
      navigate(
        `/applications/${encodeURIComponent(String(notification.relatedId))}`,
      );
    if (
      notification.type === "interview" &&
      (notification.relatedInterviewId || notification.relatedId)
    )
      navigate(
        `/interviews/${encodeURIComponent(String(notification.relatedInterviewId || notification.relatedId))}`,
      );
    if (notification.type === "message" && (notification.relatedConversationId || notification.relatedId))
      navigate(`/chat/${encodeURIComponent(String(notification.relatedConversationId || notification.relatedId))}`);
    if (
      notification.type === "job" &&
      (notification.relatedJobId || notification.reference_id)
    )
      navigate(
        notification.actionUrl ||
          `/jobs/${encodeURIComponent(String(notification.relatedJobId || notification.reference_id))}`,
      );
    if (["recommendation", "ai_match"].includes(notification.type) && notification.relatedJobId)
      navigate(
        `/job-details/${encodeURIComponent(String(notification.relatedJobId))}`,
      );
    if (notification.type === "system") navigate("/profile");
  };

  const markAllNotificationsRead = async () => {
    const unreadNotifications = notificationItems.filter((item) => !item.isRead);
    if (!unreadNotifications.length) return;
    try {
      const results = await Promise.allSettled(unreadNotifications.map((item) => api.patch(`/seeker/notifications/${item.id}/read`)));
      const successfulIds = new Set(results.flatMap((result, index) => result.status === "fulfilled" ? [String(unreadNotifications[index].id)] : []));
      const failedCount = results.length - successfulIds.size;
      if (successfulIds.size) {
        setNotificationItems((items) => items.map((item) => successfulIds.has(String(item.id)) ? { ...item, isRead: true } : item));
        window.dispatchEvent(new Event("seeker-notifications:updated"));
      }
      if (failedCount) {
        setNotificationFeedback(`${successfulIds.size} notification${successfulIds.size === 1 ? "" : "s"} marked as read; ${failedCount} could not be updated.`);
        setModuleDataError("Some notifications could not be marked as read. Please try again.");
      } else {
        setCaughtUpNotificationIds(successfulIds);
        setNotificationFeedback(`All caught up! ${unreadNotifications.length} notification${unreadNotifications.length === 1 ? "" : "s"} marked as read.`);
      }
    } catch (requestError) {
      setModuleDataError(requestError.response?.data?.message || "Unable to mark notifications as read.");
    }
  };

  const displayedMatches = realMatches.length ? realMatches : [];
  const filteredMatches = displayedMatches.filter(
    (job) => job.score != null && job.score >= Number(scoreFilter) && job.salaryMin >= Number(salaryFilter) && (jobTypeFilter === "all" || job.jobType === jobTypeFilter),
  );
  const applyToMatch = async (job) => {
    try {
      await api.post("/applications/apply", buildApplicationSubmissionPayload(job));
      setAppliedMatchIds((current) => new Set([...current, String(job.id)]));
      notify("Application submitted successfully.");
    } catch (error) {
      notify(error?.response?.data?.message || "Unable to submit application.");
    }
  };

  const interviewQuestions =
    interviewScenarios[interviewRole]?.[interviewCompany] ||
    interviewScenarios[interviewRole]?.["YeneTech Solutions"] ||
    interviewScenarios["Senior React Developer"]["YeneTech Solutions"];
  const currentQuestion =
    interviewQuestions[interviewStep % interviewQuestions.length];

  const startInterview = () => {
    setInterviewStep(0);
    setFeedback(null);
    setInterviewMessages([
      {
        sender: "ai",
        text: `Welcome to your ${interviewRole} interview at ${interviewCompany}. Let's begin with a ${currentQuestion.type.toLowerCase()} question.`,
      },
    ]);
  };

  const submitInterviewAnswer = (event) => {
    event.preventDefault();
    const answerText = answer.trim();
    if (!answerText) return;
    const hasStructure =
      /situation|task|action|result|impact|because|therefore/i.test(answerText);
    const score = Math.min(
      96,
      62 +
        Math.min(22, Math.floor(answerText.length / 18)) +
        (hasStructure ? 12 : 0),
    );
    setInterviewMessages((messages) => [
      ...messages,
      { sender: "user", text: answerText },
      {
        sender: "ai",
        text: `Thanks. I have recorded your answer. Next, I will ask a ${interviewQuestions[(interviewStep + 1) % interviewQuestions.length].type.toLowerCase()} question.`,
      },
    ]);
    setFeedback({
      score,
      strengths:
        answerText.length > 100
          ? ["Clear context and relevant detail", "Good connection to the role"]
          : ["Direct response to the question"],
      improvements: hasStructure
        ? ["Add measurable results to make the impact stronger."]
        : [
            "Use STAR: describe the Situation, Task, Action, and measurable Result.",
          ],
      sample:
        "Situation: briefly explain the context. Task: name your responsibility. Action: describe the specific steps you took. Result: close with a measurable outcome.",
    });
    setInterviewStep((step) => step + 1);
    setAnswer("");
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordError("Complete all password fields.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("Your new password and confirmation do not match.");
      return;
    }
    if (passwordForm.next.length < 8 || new TextEncoder().encode(passwordForm.next).length > 72 || !/\d/.test(passwordForm.next) || !/[^A-Za-z0-9\s]/.test(passwordForm.next)) {
      setPasswordError("Choose a password that meets all listed requirements.");
      return;
    }
    setPasswordSaving(true);
    try {
      const { data } = await api.put("/seeker/password", {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPasswordSuccess(data?.message || "Password updated successfully.");
    } catch (requestError) {
      setPasswordError(requestError.response?.data?.message || "Unable to update your password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const saveAccountSettings = async (event) => {
    event.preventDefault();
    setAccountSaving(true);
    setAccountError("");
    try {
      await api.put("/seeker/profile/personal", {
        name: accountForm.displayName,
        phone: accountForm.phone,
        headline: accountForm.headline,
        location: accountForm.location,
        telegramUsername: accountForm.telegramUsername,
      });
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...storedUser, name: accountForm.displayName, full_name: accountForm.displayName, phone: accountForm.phone }));
      } catch (storageError) {
        console.warn("Could not update cached account details:", storageError);
      }
      window.dispatchEvent(new Event("profileUpdated"));
      notify("Account information saved.");
    } catch (requestError) {
      setAccountError(requestError.response?.data?.message || "Unable to save account information.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleAccountAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setAccountError("Choose a JPG, GIF, or PNG image under 2MB.");
      return;
    }
    setAvatarSaving(true);
    setAccountError("");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const { data } = await api.post("/seeker/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAccountAvatar(data.avatarUrl);
      window.dispatchEvent(new Event("profileUpdated"));
      notify("Profile photo updated.");
    } catch (requestError) {
      setAccountError(requestError.response?.data?.message || "Unable to upload profile photo.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const removeAccountAvatar = async () => {
    setAvatarSaving(true);
    setAccountError("");
    try {
      await api.delete("/seeker/profile/avatar");
      setAccountAvatar("");
      window.dispatchEvent(new Event("profileUpdated"));
      notify("Profile photo removed.");
    } catch (requestError) {
      setAccountError(requestError.response?.data?.message || "Unable to remove profile photo.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const passwordRequirements = [
    { label: "At least 8 characters", met: passwordForm.next.length >= 8 },
    { label: "At least one number", met: /\d/.test(passwordForm.next) },
    { label: "At least one symbol", met: /[^A-Za-z0-9\s]/.test(passwordForm.next) },
  ];
  const metPasswordRequirements = passwordRequirements.filter((requirement) => requirement.met).length;
  const passwordStrengthScore = !passwordForm.next ? 0
    : metPasswordRequirements === 3 && passwordForm.next.length >= 12 ? 4
      : metPasswordRequirements === 3 ? 3
        : metPasswordRequirements === 2 ? 2 : 1;
  const passwordStrength = ["", "Weak", "Fair", "Good", "Strong"][passwordStrengthScore];
  const passwordStrengthColors = ["bg-rose-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];

  return (
    <div className="seeker-module-page min-h-screen min-w-0 bg-slate-50 px-3 py-5 text-slate-800 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="mb-6 flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand">
              <Sparkles className="h-4 w-4" /> {current.eyebrow}
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {current.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              {module === "saved"
                ? "Keep track of jobs you are interested in and review them later."
                : module === "notifications"
                  ? "Stay updated with your applications, interviews, messages, and job recommendations."
                  : module === "matches"
                    ? "Discover jobs that best match your skills, experience, resume, and profile."
                    : current.description}
            </p>
          </div>
        </div>

        {moduleDataError && (
          <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <span>{moduleDataError}</span>
            <button type="button" onClick={() => window.location.reload()} className="font-black underline">Retry</button>
          </div>
        )}
        {moduleDataLoading && (
          <div role="status" className="mb-5 rounded-xl border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500">
            Loading {current.title.toLowerCase()}...
          </div>
        )}

        {module === "matches" && (
          <div className="space-y-5">
            <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                <SlidersHorizontal className="h-4 w-4 text-brand" /> Filter
                matches
              </div>
              <select
                value={scoreFilter}
                onChange={(event) => setScoreFilter(event.target.value)}
                className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand"
              >
                <option value="90">90%+ match</option>
                <option value="80">80%+ match</option>
                <option value="70">70%+ match</option>
              </select>
              <select
                value={salaryFilter}
                onChange={(event) => setSalaryFilter(event.target.value)}
                className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand"
              >
                <option value="0">Any salary</option>
                <option value="25000">25,000+ ETB</option>
                <option value="30000">30,000+ ETB</option>
                <option value="40000">40,000+ ETB</option>
              </select>
              <select
                value={jobTypeFilter}
                onChange={(event) => setJobTypeFilter(event.target.value)}
                className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand"
              >
                <option value="all">All job types</option>
                <option value="Full-time">Full-time</option>
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
              </select>
              <span className="text-xs font-bold text-slate-400 sm:ml-auto">
                {filteredMatches.length} matches found
              </span>
            </div>

            {filteredMatches.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-slate-500">Best Match</p>
                  <p className="mt-1 text-2xl font-black text-[var(--brand-deep)]">
                    {filteredMatches[0].score}%
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Recommended Jobs
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {filteredMatches.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Skills Matched
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {filteredMatches[0].matchingSkills.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Skills to Improve
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {filteredMatches[0].skillsToImprove.length}
                  </p>
                </div>
              </div>
            )}

            {matchesLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Loading real recommended jobs...</div>
            ) : matchesError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm font-semibold text-red-700">{matchesError}</div>
            ) : displayedMatches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  No Job Matches Available Yet
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Complete your profile and add your skills to receive better
                  job recommendations.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="mt-5 min-h-11 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white hover:bg-brand-deep"
                >
                  Update Profile
                </button>
              </div>
            ) : filteredMatches.length > 0 ? (
              <>
                <MatchCard
                  job={filteredMatches[0]}
                  featured
                  applied={appliedMatchIds.has(String(filteredMatches[0].id))}
                  onApply={applyToMatch}
                  onViewDetails={(job) =>
                    navigate(
                      `/job-details/${encodeURIComponent(String(job.id))}`,
                      { state: { job } },
                    )
                  }
                />
                <div>
                  <h2 className="mb-4 text-xl font-black text-slate-900">
                    Recommended Jobs
                  </h2>
                  <div className="grid gap-5 md:grid-cols-2">
                    {filteredMatches.slice(1).map((job) => (
                      <MatchCard
                        key={job.id}
                        job={job}
                        applied={appliedMatchIds.has(String(job.id))}
                        onApply={applyToMatch}
                        onViewDetails={(selectedJob) =>
                          navigate(
                            `/job-details/${encodeURIComponent(String(selectedJob.id))}`,
                            { state: { job: selectedJob } },
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
                No jobs match these filters. Try a broader score or salary
                range.
              </div>
            )}
          </div>
        )}

        {module === "saved" && !moduleDataLoading && !moduleDataError && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Saved Jobs
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {savedJobList.length}
              </p>
            </div>

            {savedJobList.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-3">
                {savedJobList.map((job) => (
                  <article
                    key={job.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                          <BriefcaseBusiness className="h-5 w-5" />
                        </div>
                        <h2 className="font-bold text-slate-900">
                          {job.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {job.company}
                        </p>
                      </div>
                      {job.score != null && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                          AI Match: {job.score}%
                        </span>
                      )}
                    </div>
                    <div className="mt-5 space-y-2 text-sm text-slate-500">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-brand" />
                        {job.location}
                      </p>
                      <p className="flex items-center gap-2">
                        <BriefcaseBusiness className="h-4 w-4 text-brand" />
                        {job.jobType || job.type || "Job type not specified"}
                      </p>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      Saved on {job.savedAt}
                    </p>
                    <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/job-details/${encodeURIComponent(String(job.id))}`,
                            { state: { job } },
                          )
                        }
                        className="min-h-11 flex-1 rounded-xl bg-brand px-3 text-sm font-black text-white hover:bg-brand-deep"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setSavedJobToRemove(job)}
                        className="min-h-11 flex-1 rounded-xl border border-red-100 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-1 inline h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  No Saved Jobs Yet
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  You haven't saved any jobs yet.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/explore-jobs")}
                  className="mt-5 min-h-11 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white hover:bg-brand-deep"
                >
                  Find Jobs
                </button>
              </div>
            )}
            {savedJobToRemove && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                    setSavedJobToRemove(null);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="remove-saved-job-title"
                  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2
                        id="remove-saved-job-title"
                        className="text-xl font-black text-slate-900"
                      >
                        Remove Saved Job?
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Are you sure you want to remove this job from your saved
                        jobs?
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setSavedJobToRemove(null)}
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setSavedJobToRemove(null)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={removeSavedJob}
                      className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {module === "applications" && !moduleDataLoading && !moduleDataError && (
          <div className="relative">
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-sm font-black text-slate-900">
                  Application progress
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Click an application to view its history and employer message.
                </p>
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand">
                {displayedApplications.length} applications
              </span>
            </div>
            {displayedApplications.length > 0 ? (
              <div className="grid gap-4 pb-4 sm:grid-cols-2 xl:grid-cols-5">
                {applicationStatuses.map((status) => {
                  const columnApplications = displayedApplications.filter((item) => item.status === status.id);
                  return (
                    <section key={status.id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
                      <div className={`rounded-xl border p-3 ${status.color}`}>
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-sm font-black">{status.label}</h2>
                          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-black">{columnApplications.length}</span>
                        </div>
                        <p className="mt-1 text-[11px] font-semibold opacity-75">{status.description}</p>
                      </div>
                      <div className="mt-3 space-y-3">
                        {columnApplications.length > 0 ? (
                          columnApplications.map((item) => (
                            <button key={item.id} onClick={() => setSelectedApplication(item)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-black text-slate-900">{item.title}</h3>
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                              </div>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{item.company}</p>
                              <p className="mt-4 text-[11px] font-semibold text-slate-400">Applied {item.date}</p>
                            </button>
                          ))
                        ) : (
                          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs font-semibold text-slate-400">No applications</p>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-base font-black text-slate-900">You haven't submitted any applications yet</p>
                <p className="mt-2 text-sm text-slate-500">Explore current job openings and submit an application to track it here.</p>
                <button type="button" onClick={() => navigate("/explore-jobs")} className="mt-5 min-h-11 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white hover:bg-brand-deep">Explore Jobs</button>
              </div>
            )}

            {selectedApplication && (
              <div
                className="fixed inset-0 z-50 bg-slate-900/30"
                onClick={() => setSelectedApplication(null)}
              >
                <aside
                  onClick={(event) => event.stopPropagation()}
                  className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
                        Application detail
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-slate-900">
                        {selectedApplication.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {selectedApplication.company}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedApplication(null)}
                      aria-label="Close application details"
                      className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-6 rounded-2xl bg-brand-soft p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-brand">
                      Current status
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {applicationStatuses.find((status) => status.id === selectedApplication.status)?.label || selectedApplication.status}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Applied on {selectedApplication.date}
                    </p>
                  </div>
                  <div className="mt-7">
                    <h3 className="text-sm font-black text-slate-900">Application history</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {Array.isArray(selectedApplication.history) && selectedApplication.history.length
                        ? selectedApplication.history.join(" · ")
                        : "Status history is not available for this application."}
                    </p>
                  </div>
                  <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-black text-slate-900">
                      Employer message
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {selectedApplication.message || "No employer message is available yet."}
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </div>
        )}

        {module === "skillgap" &&
          (() => {
            const roadmap = roleRoadmaps[targetRole];
            return (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label
                    htmlFor="target-role"
                    className="block text-sm font-black text-slate-900"
                  >
                    Target dream role
                  </label>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose the role you want AI to help you reach.
                  </p>
                  <select
                    id="target-role"
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value)}
                    className="mt-4 min-h-12 w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none focus:border-brand"
                  >
                    {Object.keys(roleRoadmaps).map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-black text-emerald-900">
                        Current skills
                      </h2>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                        {roadmap.current.length} skills
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {roadmap.current.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-emerald-800 shadow-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-black text-red-900">
                        Missing skills
                      </h2>
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                        {roadmap.missing.length} to learn
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {roadmap.missing.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-800 shadow-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
                        AI learning plan
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-slate-900">
                        Roadmap to {targetRole}
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      10-12 weeks estimated
                    </span>
                  </div>
                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {roadmap.roadmap.map((step) => (
                      <article
                        key={step.phase}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-black text-white">
                            {step.phase}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {step.duration}
                          </span>
                        </div>
                        <h3 className="mt-4 font-black text-slate-900">
                          {step.title}
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {step.skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-brand-soft px-2 py-1 text-[11px] font-bold text-brand"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 space-y-2">
                          {step.courses.map((course) => (
                            <a
                              key={course.name}
                              href={course.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand"
                            >
                              <p className="text-xs font-black text-slate-800">
                                {course.name}
                              </p>
                              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                {course.provider}
                              </p>
                            </a>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            );
          })()}

        {module === "interview" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="text-sm font-black text-slate-900">
                  Practice role
                  <select
                    value={interviewRole}
                    onChange={(event) => setInterviewRole(event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-brand"
                  >
                    <option>Senior React Developer</option>
                    <option>Senior AI/ML Engineer</option>
                  </select>
                </label>
                <label className="text-sm font-black text-slate-900">
                  Company
                  <select
                    value={interviewCompany}
                    onChange={(event) =>
                      setInterviewCompany(event.target.value)
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-brand"
                  >
                    <option>YeneTech Solutions</option>
                    <option>EthioTelecom Innovation Lab</option>
                    <option>Kacha Digital Financial</option>
                  </select>
                </label>
                <button
                  onClick={startInterview}
                  className="min-h-11 rounded-xl bg-brand px-5 text-sm font-black text-white hover:bg-brand-deep"
                >
                  Start interview
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => setInterviewMode("chat")}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${interviewMode === "chat" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  Chat mode
                </button>
                <button
                  onClick={() => setInterviewMode("voice")}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${interviewMode === "voice" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  Voice mode
                </button>
                <span className="text-xs text-slate-400">
                  {interviewMode === "voice"
                    ? "Voice UI ready for microphone integration"
                    : "Text chat with your AI interviewer"}
                </span>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-brand-soft p-3 text-brand">
                      <Mic2 />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900">
                        AI interviewer
                      </h2>
                      <p className="text-xs text-slate-500">
                        {interviewStep + 1} of {interviewQuestions.length}{" "}
                        questions · {currentQuestion.type}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    Live practice
                  </span>
                </div>
                <div className="mt-6 max-h-64 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4">
                  {interviewMessages.length === 0 ? (
                    <p className="text-sm leading-6 text-slate-500">
                      Select a role and company, then start the interview. Your
                      AI interviewer will ask technical and behavioral
                      questions.
                    </p>
                  ) : (
                    interviewMessages.map((message, index) => (
                      <div
                        key={`${message.sender}-${index}`}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <p
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender === "user" ? "bg-brand text-white" : "bg-white text-slate-700 shadow-sm"}`}
                        >
                          {message.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-5 rounded-2xl bg-brand-soft p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-brand">
                    {currentQuestion.type} question
                  </p>
                  <p className="mt-2 text-lg font-bold leading-8 text-slate-900">
                    {currentQuestion.question}
                  </p>
                </div>
                <form onSubmit={submitInterviewAnswer}>
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    rows={5}
                    placeholder="Write your answer using the STAR method..."
                    className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-black text-white hover:bg-brand-deep"
                  >
                    <Send className="h-4 w-4" /> Submit answer
                  </button>
                </form>
              </section>

              <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-900">
                  Real-time feedback
                </h2>
                {feedback ? (
                  <div className="mt-5 space-y-5">
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-black text-brand">
                        {feedback.score}
                      </span>
                      <span className="pb-2 text-sm font-bold text-slate-500">
                        / 100 score
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-700">
                        Strengths
                      </h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                        {feedback.strengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-700">
                        Improve next
                      </h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                        {feedback.improvements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-brand-border bg-brand-soft p-3">
                      <p className="text-xs font-black text-brand">
                        Better STAR answer
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {feedback.sample}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    Submit your first answer to receive a score, strengths,
                    improvement tips, and a stronger STAR response.
                  </p>
                )}
              </aside>
            </div>
          </div>
        )}

        {module === "notifications" && !moduleDataLoading && !moduleDataError && (
          <div className="space-y-5">
            <TelegramConnectCard banner />
            {notificationFeedback && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                <span className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {notificationFeedback}
                </span>
                {notificationTab === "unread" && (
                  <button type="button" onClick={() => setNotificationTab("all")} className="font-bold underline underline-offset-2">
                    View all notifications
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {notificationFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      setNotificationTab(filter.id);
                      if (filter.id !== "unread") setCaughtUpNotificationIds(new Set());
                    }}
                    aria-pressed={notificationTab === filter.id}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all duration-150 ${
                      notificationTab === filter.id
                        ? "border-sky-500 bg-sky-500 font-bold text-white shadow-sm shadow-sky-500/25"
                        : "border-slate-200 bg-white font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <filter.Icon className="h-4 w-4 shrink-0 stroke-[2]" />
                    <span>{filter.label}</span>
                    {filter.count > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                        notificationTab === filter.id
                          ? "bg-white/25 text-white"
                          : "border border-slate-200/70 bg-slate-100 text-slate-700"
                      }`}>
                        {filter.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {notificationItems.some((item) => !item.isRead) && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-sky-700 lg:self-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark all as read
                </button>
              )}
            </div>
            {notificationItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Inbox className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-base font-bold text-slate-900">You’re all caught up</h2>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                  New messages, application updates, and interview invitations will appear here.
                </p>
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  {notificationTab === "interviews" ? <CalendarDays className="h-6 w-6" />
                    : notificationTab === "messages" ? <MessageCircle className="h-6 w-6" />
                      : notificationTab === "applications" ? <FileText className="h-6 w-6" />
                        : <CheckCircle2 className="h-6 w-6" />}
                </span>
                <h2 className="mt-4 text-base font-bold text-slate-900">
                  {notificationTab === "unread" ? "No unread notifications" : `No ${notificationFilters.find((filter) => filter.id === notificationTab)?.label.toLowerCase() || "notifications"} yet`}
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                  {notificationTab === "unread"
                    ? "You’re all caught up. New updates will appear here."
                    : "We’ll let you know when there’s something new."}
                </p>
              </div>
            ) : (
              <div className="space-y-3" aria-label="Notifications">
                {visibleNotifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 hover:border-sky-300 hover:bg-slate-50/80 hover:shadow-md sm:gap-4 sm:p-5 ${
                      item.isRead
                        ? "border-slate-200 bg-white"
                        : "border-sky-200 bg-sky-50/45"
                    }`}
                  >
                    <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 ring-1 ring-slate-200">
                      {(() => {
                        const { Icon } = getNotificationPresentation(item);
                        return <Icon className="h-5 w-5" />;
                      })()}
                      {!item.isRead && (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-sky-500 ring-4 ring-sky-100" aria-label="Unread" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <strong className="truncate text-sm font-bold text-slate-900">
                          {item.companyName || item.senderName || "Career update"}
                        </strong>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${getNotificationPresentation(item).color}`}>
                          {getNotificationPresentation(item).label}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm font-semibold leading-5 text-slate-800">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        {item.message}
                      </span>
                      <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{notificationTimeAgo(item.createdAt || item.created_at)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.label}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 transition group-hover:border-sky-200 group-hover:bg-sky-100">
                        <span className="hidden sm:inline">{getNotificationPresentation(item).action}</span>
                        <span className="sm:hidden">View</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <span>{item.isRead ? "Read" : "New"}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {module === "settings" && (
          <div className="max-w-4xl space-y-5">
            <div className="w-full max-w-full overflow-x-auto border-b border-slate-200/70 scrollbar-none">
              <div className="flex w-max min-w-full items-center gap-6 sm:gap-9">
                {[
                  ["account", "Account", User],
                  ["security", "Security", ShieldCheck],
                  ["notifications", "Notifications", Bell],
                  ["privacy", "Privacy", Lock],
                  ["danger", "Danger Zone", AlertTriangle],
                ].map(([id, label, Icon]) => {
                  const isActive = settingsSection === id;
                  const isDanger = id === "danger";

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSettingsSection(id)}
                      className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-1 pb-2.5 font-bold italic text-sm transition-colors sm:text-base ${
                        isDanger
                          ? `text-[#ff1744] hover:text-[#f50057] ${isActive ? "border-[#ff1744]" : "hover:border-[#ff1744]/40"}`
                          : isActive
                            ? "border-sky-500 text-sky-500 dark:text-sky-400"
                            : "text-slate-400 hover:text-sky-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {settingsSection === "account" && (
              <section className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs sm:p-9">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Account Information</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Manage your candidate profile and account contact details.</p>

                <div className="mt-7 flex flex-col gap-4 border-b border-slate-100 pb-7 sm:flex-row sm:items-center">
                  <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xl font-bold text-sky-800 ring-4 ring-sky-50">
                    {accountAvatar
                      ? <img src={accountAvatar} alt={`${accountForm.displayName || "Candidate"} profile`} className="h-full w-full object-cover" />
                      : (accountForm.displayName || "YD").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}
                    <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-white">
                      <Camera className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">Profile photo</p>
                    <p className="mt-0.5 text-xs text-slate-500">JPG, GIF or PNG. Max 2MB.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 ${avatarSaving ? "pointer-events-none opacity-60" : ""}`}>
                        <Camera className="h-3.5 w-3.5" />
                        {avatarSaving ? "Updating…" : "Upload Photo"}
                        <input type="file" accept="image/jpeg,image/png,image/gif" onChange={handleAccountAvatarUpload} disabled={avatarSaving} className="sr-only" />
                      </label>
                      {accountAvatar && (
                        <button type="button" onClick={removeAccountAvatar} disabled={avatarSaving} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={saveAccountSettings} className="mt-7 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
                  {[
                    { key: "displayName", label: "Display Name", Icon: UserRound, placeholder: "Your full name" },
                    { key: "headline", label: "Professional Headline", Icon: BriefcaseBusiness, placeholder: "Senior Frontend Developer" },
                    { key: "email", label: "Email Address", Icon: Mail, verified: true },
                    { key: "phone", label: "Phone Number", Icon: Phone, placeholder: "+251-952748973" },
                    { key: "telegramUsername", label: "Telegram Username", Icon: Send, placeholder: "@yabsira_demeke" },
                    { key: "location", label: "Location", Icon: MapPin, placeholder: "Addis Ababa, Ethiopia" },
                  ].map(({ key, label, Icon, placeholder, verified }) => (
                    <label key={key} htmlFor={`account-${key}`} className="block min-w-0">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">{label}</span>
                      <span className="relative block">
                        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id={`account-${key}`}
                          type={key === "email" ? "email" : "text"}
                          value={accountForm[key] || ""}
                          placeholder={placeholder}
                          readOnly={key === "email"}
                          onChange={(event) => {
                            setAccountForm((currentForm) => ({ ...currentForm, [key]: event.target.value }));
                            setToast("");
                          }}
                          className={`min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400 ${key === "email" ? "pr-24" : "pr-3.5"}`}
                        />
                        {verified && (
                          <span className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-bold ${accountEmailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {accountEmailVerified ? "Verified" : "Unverified"}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                  {accountError && <p role="alert" className="text-sm font-medium text-rose-700 sm:col-span-2">{accountError}</p>}
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={accountSaving}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-7 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition duration-150 hover:bg-sky-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {accountSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <Save className="h-4 w-4" />}
                      {accountSaving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </form>
              </section>
            )}
            {settingsSection === "security" && (
              <div className="space-y-8">
                <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                      <KeyRound className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Change password</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Use a unique password you don’t use on other websites.
                      </p>
                    </div>
                  </div>
                  <form onSubmit={handlePasswordChange} className="mt-6 max-w-xl space-y-5">
                    {[
                      { id: "current", label: "Current Password", autocomplete: "current-password" },
                      { id: "next", label: "New Password", autocomplete: "new-password", placeholder: "Min. 8 chars, 1 number & 1 symbol (e.g. Pass@123)" },
                      { id: "confirm", label: "Confirm New Password", autocomplete: "new-password", placeholder: "Re-enter your new password" },
                    ].map((field) => (
                      <label key={field.id} htmlFor={`security-${field.id}`} className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">{field.label}</span>
                        <span className="relative block">
                          <input
                            id={`security-${field.id}`}
                            type={passwordVisibility[field.id] ? "text" : "password"}
                            autoComplete={field.autocomplete}
                            placeholder={field.placeholder}
                            value={passwordForm[field.id]}
                            onChange={(event) => {
                              setPasswordForm((current) => ({ ...current, [field.id]: event.target.value }));
                              setPasswordError("");
                              setPasswordSuccess("");
                            }}
                            required
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400"
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordVisibility((current) => ({ ...current, [field.id]: !current[field.id] }))}
                            aria-label={`${passwordVisibility[field.id] ? "Hide" : "Show"} ${field.label.toLowerCase()}`}
                            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-slate-700"
                          >
                            {passwordVisibility[field.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </span>
                        {field.id === "next" && passwordForm.next.length > 0 && (
                          <span className="mt-2 flex items-center gap-2" aria-live="polite">
                            <span className="flex w-24 shrink-0 gap-1" aria-hidden="true">
                              {passwordStrengthColors.map((color, index) => (
                                <span key={color} className={`h-1 flex-1 rounded-full ${index < passwordStrengthScore ? color : "bg-slate-200"}`} />
                              ))}
                            </span>
                            <span className={`text-[11px] font-semibold ${
                              passwordStrength === "Strong" ? "text-emerald-700"
                                : passwordStrength === "Good" ? "text-sky-700"
                                  : passwordStrength === "Fair" ? "text-amber-700" : "text-rose-700"
                            }`}>
                              {passwordStrength}
                            </span>
                          </span>
                        )}
                      </label>
                    ))}
                    {passwordError && <p role="alert" className="text-sm font-medium text-rose-700">{passwordError}</p>}
                    {passwordSuccess && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{passwordSuccess}</p>}
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-7 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition duration-150 hover:-translate-y-0.5 hover:bg-sky-600 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {passwordSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : passwordSuccess ? <CheckCircle2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                      {passwordSaving ? "Updating password…" : passwordSuccess ? "Password updated" : "Update Password"}
                    </button>
                  </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Two-factor authentication</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Add another verification step to protect your applications and sensitive CV data.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                      Not configured · Recommended
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-xl text-xs leading-5 text-slate-600">
                      SMS and authenticator-app setup are not currently available. We’ll show setup here when secure 2FA enrollment is supported.
                    </p>
                    <button type="button" disabled title="Two-factor setup is not available yet" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-400 disabled:cursor-not-allowed">
                      <ShieldCheck className="h-4 w-4" />
                      Set Up 2FA
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      <MonitorSmartphone className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Sessions & connected devices</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Review this browser session and your Telegram alert connection.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">Current session · This device</p>
                        <p className="mt-0.5 text-xs text-slate-500">Active now · Browser and location details are not collected.</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Active</span>
                    </div>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Telegram alert connection</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">Manage authorization for instant bot notifications.</p>
                      </div>
                      <TelegramConnectCard compact />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 ring-1 ring-sky-200">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-sky-800">Account security</p>
                      <h2 className="mt-1 text-base font-bold text-slate-900">Review recommended</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Use a strong, unique password. Two-factor authentication and remote session management are not yet available, so an account security score cannot be calculated reliably.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
            {settingsSection === "notifications" && (
              <div className="space-y-8">
              <section className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs sm:p-9">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Notification Settings
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose which updates you want to see.
                </p>
                <div className="mt-7 space-y-3">
                  {[
                    [
                      "applications",
                      "Application Updates",
                      "Receive updates about your job applications.",
                      BriefcaseBusiness,
                    ],
                    [
                      "interviews",
                      "Interview Invitations",
                      "Receive interview updates and invitations.",
                      CalendarDays,
                    ],
                    [
                      "messages",
                      "Employer Messages",
                      "Receive notifications when an employer sends a message.",
                      MessageSquare,
                    ],
                    [
                      "recommendations",
                      "AI Job Recommendations",
                      "Receive recommendations for jobs matching your profile.",
                      Sparkles,
                    ],
                    [
                      "system",
                      "System Notifications",
                      "Receive important system updates.",
                      Bell,
                    ],
                  ].map(([key, label, description, Icon]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/70"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-bold text-slate-900">
                          {label}
                        </strong>
                        <small className="mt-0.5 block text-xs leading-5 text-slate-500">
                          {description}
                        </small>
                      </span>
                      <span className="relative inline-flex shrink-0 items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings[key]}
                          onChange={(event) => {
                            setNotificationSettings((currentSettings) => ({ ...currentSettings, [key]: event.target.checked }));
                            setNotificationPreferencesSaved(false);
                          }}
                          className="peer sr-only"
                          aria-label={label}
                        />
                        <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors duration-200 peer-checked:bg-sky-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-500" />
                        <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationPreferencesSaved(true);
                    notify("Notification preferences updated.");
                  }}
                  className="mt-7 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-7 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition duration-150 hover:bg-sky-600 active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {notificationPreferencesSaved ? "Preferences saved" : "Save Preferences"}
                </button>
              </section>
              <section className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">SMS Alerts &amp; Communications</h2>
                    <p className="mt-1 text-sm text-slate-500">Manage interview and application SMS messages from employers.</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${smsPhone ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    {smsPhone ? "Phone verification unavailable" : "No phone number on account"}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-700">
                  Phone on account: <span className="font-bold">{smsPhone ? `${smsPhone.slice(0, 5)}***${smsPhone.slice(-4)}` : "Not provided"}</span>
                  <span className="ml-2 text-xs text-slate-500">A verified phone status cannot be confirmed yet.</span>
                </p>
                <label className="mt-4 flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/70">
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-bold text-slate-900">Receive instant SMS when shortlisted or invited to interview</strong>
                    <small className="mt-0.5 block text-xs text-slate-500">You can change this preference at any time.</small>
                  </span>
                  <span className="relative inline-flex shrink-0 items-center">
                    <input
                      type="checkbox"
                      checked={smsPreferenceEnabled}
                      onChange={async (event) => {
                        const enabled = event.target.checked;
                        const previous = smsPreferenceEnabled;
                        setSmsPreferenceEnabled(enabled);
                        try {
                          await api.put("/seeker/sms/preference", { enabled });
                        } catch (error) {
                          setSmsPreferenceEnabled(previous);
                          setSmsHistoryError(error.response?.data?.message || "Unable to save SMS preference.");
                        }
                      }}
                      className="peer sr-only"
                      aria-label="Receive instant SMS when shortlisted or invited to interview"
                    />
                    <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors duration-200 peer-checked:bg-sky-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-500" />
                    <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />
                  </span>
                </label>
                <div className="mt-6">
                  <h3 className="text-sm font-black text-slate-900">SMS History</h3>
                  {smsHistoryError && <p role="alert" className="mt-2 text-sm text-rose-700">{smsHistoryError}</p>}
                  {smsHistoryLoading ? (
                    <p className="mt-3 text-sm text-slate-500">Loading SMS history…</p>
                  ) : displayedSmsCommunications.length === 0 ? (
                    <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No SMS communications yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {displayedSmsCommunications.map((communication) => {
                        const isEmployerSms = communication.communicationType === "employer";
                        const alreadyReplied = smsRepliedIds.has(String(communication.id));
                        return (
                          <li key={communication.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="text-sm text-slate-900">{communication.companyName || "Employer"} · {communication.jobTitle || "Job application"}</strong>
                              <span className="text-xs text-slate-500">{formatSmsTimestamp(communication.sentAt)}</span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{communication.messageBody}</p>
                            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getSmsStatusClasses(communication.deliveryStatus)}`}>
                              {communication.deliveryStatus || "STATUS UNKNOWN"}
                            </span>
                            {isEmployerSms && /interview invitation|invite you to interview/i.test(communication.messageBody) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={alreadyReplied || smsReplyingId === communication.id}
                                  onClick={async () => {
                                    setSmsReplyingId(communication.id);
                                    try {
                                      await api.post(`/seeker/sms/${communication.id}/reply`, { response: "confirm_attendance" });
                                      setSmsRepliedIds((current) => new Set([...current, String(communication.id)]));
                                      setSmsCommunications((current) => [{
                                        id: `reply-${communication.id}`,
                                        parentCommunicationId: communication.id,
                                        communicationType: "seeker_reply",
                                        messageBody: "Candidate confirmed interview attendance.",
                                        deliveryStatus: "RECEIVED",
                                        sentAt: new Date().toISOString(),
                                        companyName: communication.companyName,
                                        jobTitle: communication.jobTitle,
                                      }, ...current]);
                                    } catch (error) {
                                      setSmsHistoryError(error.response?.data?.message || "Unable to send your response.");
                                    } finally {
                                      setSmsReplyingId(null);
                                    }
                                  }}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50"
                                >Confirm Attendance</button>
                                <button
                                  type="button"
                                  disabled={alreadyReplied || smsReplyingId === communication.id}
                                  onClick={async () => {
                                    setSmsReplyingId(communication.id);
                                    try {
                                      await api.post(`/seeker/sms/${communication.id}/reply`, { response: "request_reschedule" });
                                      setSmsRepliedIds((current) => new Set([...current, String(communication.id)]));
                                      setSmsCommunications((current) => [{
                                        id: `reply-${communication.id}`,
                                        parentCommunicationId: communication.id,
                                        communicationType: "seeker_reply",
                                        messageBody: "Candidate requested to reschedule the interview.",
                                        deliveryStatus: "RECEIVED",
                                        sentAt: new Date().toISOString(),
                                        companyName: communication.companyName,
                                        jobTitle: communication.jobTitle,
                                      }, ...current]);
                                    } catch (error) {
                                      setSmsHistoryError(error.response?.data?.message || "Unable to send your response.");
                                    } finally {
                                      setSmsReplyingId(null);
                                    }
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                                >Request Reschedule</button>
                                {alreadyReplied && <span className="self-center text-xs font-semibold text-emerald-700">Response recorded</span>}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
              </div>
            )}
            {settingsSection === "privacy" && (
              <section className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs sm:p-9">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Privacy settings</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Choose how employers can discover and interact with your profile.
                  </p>
                </div>

                <fieldset className="mt-7">
                  <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Profile discovery</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { id: "public", title: "Public to Employers", description: "Allow employers to discover your profile.", Icon: Globe },
                      { id: "private", title: "Private (Stealth)", description: "Hide your profile from employer searches.", Icon: EyeOff },
                    ].map(({ id, title, description, Icon }) => {
                      const selected = profileVisibility === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setProfileVisibility(id);
                            setPrivacySaved(false);
                          }}
                          className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition duration-150 ${
                            selected
                              ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <strong className="text-sm font-bold text-slate-900">{title}</strong>
                              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-sky-500" : "border-slate-300"}`}>
                                {selected && <span className="h-2 w-2 rounded-full bg-sky-500" />}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-8 space-y-3">
                  {[
                    {
                      id: "contact",
                      title: "Direct Contact Protection",
                      description: "Hide your phone and Telegram until you’re shortlisted by an employer.",
                      Icon: PhoneOff,
                      checked: directContactProtection,
                      onChange: setDirectContactProtection,
                    },
                    {
                      id: "resume",
                      title: "Full CV Download Access",
                      description: "Allow employers to download your original PDF resume.",
                      Icon: FileText,
                      checked: resumeVisible,
                      onChange: setResumeVisible,
                    },
                    {
                      id: "matching",
                      title: "Smart Job Matching",
                      description: "Allow the algorithm to match your profile with new vacancies.",
                      Icon: Sparkles,
                      checked: dataPreferences,
                      onChange: setDataPreferences,
                    },
                  ].map(({ id, title, description, Icon, checked, onChange }) => (
                    <label key={id} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/70">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-bold text-slate-900">{title}</strong>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
                      </span>
                      <span className="relative inline-flex shrink-0 items-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            onChange(event.target.checked);
                            setPrivacySaved(false);
                          }}
                          className="peer sr-only"
                          aria-label={title}
                        />
                        <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors duration-200 peer-checked:bg-sky-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-500" />
                        <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPrivacySaved(true);
                      notify("Privacy settings saved.");
                    }}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-7 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition duration-150 hover:bg-sky-600 active:scale-95"
                    aria-live="polite"
                  >
                    {privacySaved ? <CheckCircle2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {privacySaved ? "Settings saved" : "Save Privacy"}
                  </button>
                </div>
              </section>
            )}
            {settingsSection === "danger" && (
              <section className="rounded-3xl border border-rose-200/80 bg-white p-7 shadow-xs sm:p-9">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Danger Zone</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Account actions with significant effects on your profile and application data.
                    </p>
                  </div>
                </div>

                <div className="mt-8 divide-y divide-slate-200">
                  <div className="flex flex-col gap-4 py-6 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-2xl">
                      <h3 className="text-sm font-bold text-slate-900">Deactivate Profile (Temporary)</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Temporarily hide your CV, skills, and profile from employer searches. You can reactivate anytime by logging back in.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => notify("Profile deactivation is not available yet. Please contact support for assistance.")}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-bold text-amber-800 transition hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98]"
                    >
                      Deactivate Account
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 py-6 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-2xl">
                      <h3 className="text-sm font-bold text-slate-900">Permanently Delete Account</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Permanently erase your candidate profile, uploaded PDF resumes, ATS match scores, and application records. This action is irreversible.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmationText("");
                        setShowDeleteAccount(true);
                      }}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98]"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </section>
            )}
            {showDeleteAccount && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                    setShowDeleteAccount(false);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-account-title"
                  className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                        <AlertTriangle className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 id="delete-account-title" className="text-lg font-bold text-slate-900">
                          Permanently delete your account?
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          This action is irreversible. Your account and associated candidate data will be permanently removed.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => {
                        setShowDeleteAccount(false);
                        setDeleteConfirmationText("");
                      }}
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <ul className="mt-5 space-y-2 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      All submitted applications will be cancelled.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      Your uploaded CV and profile data will be purged.
                    </li>
                  </ul>

                  <label htmlFor="delete-account-confirmation" className="mt-5 block text-sm font-semibold text-slate-700">
                    Type <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-rose-700">DELETE</span> to confirm
                    <input
                      id="delete-account-confirmation"
                      type="text"
                      autoComplete="off"
                      value={deleteConfirmationText}
                      onChange={(event) => setDeleteConfirmationText(event.target.value)}
                      placeholder="Type DELETE"
                      className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
                    />
                  </label>
                  <p role="note" className="mt-3 text-xs leading-5 text-amber-800">
                    Account deactivation and permanent deletion are not connected to account-management services yet. This screen will not delete or deactivate your account.
                  </p>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteAccount(false);
                        setDeleteConfirmationText("");
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteAccount(false);
                        setDeleteConfirmationText("");
                        notify("Account deletion is not available yet. Please contact support for assistance.");
                      }}
                      disabled={deleteConfirmationText !== "DELETE"}
                      className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-rose-600"
                    >
                      Confirm Permanent Deletion
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-slate-900 px-4 py-3 text-sm font-bold text-emerald-300 shadow-2xl">
            <CheckCircle2 className="h-5 w-5" />
            {toast}
            <button onClick={() => setToast("")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
