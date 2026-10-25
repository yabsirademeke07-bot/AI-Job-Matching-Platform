import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TelegramConnectCard from "../components/TelegramConnectCard";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  ChevronDown,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Globe2,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  Menu,
  MessageCircle,
  MoreHorizontal,
  MapPin,
  Mail,
  Moon,
  PauseCircle,
  Pencil,
  Plus,
  Search,
  SearchCheck,
  Save,
  ShieldAlert,
  Settings,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
  Trophy,
  UserCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getMetricCardClassName, metricCardIconClassName } from "../components/dashboard/metricCardStyles";
import {
  getPipelineStatusLabel,
  normalizePipelineStatus,
} from "../utils/pipelineStatus";
import EmployerReputationCenter from "../components/employer/EmployerReputationCenter";
import UniversalReportModal from "../components/UniversalReportModal";
import TalentPool from "../components/employer/TalentPool";
import TopCandidatesList from "../components/employer/TopCandidatesList";
import AICandidateMatching from "../components/employer/AICandidateMatching";
import DashboardMetricCards from "../components/employer/DashboardMetricCards";
import ApplicationsTable from "../components/employer/ApplicationsTable";
import EmployerJobsManagement from "../components/employer/EmployerJobsManagement";
import EmployerSidebar from "../components/employer/EmployerSidebar";
import {
  EmployerMessages,
  EmployerNotifications,
  EmployerSettings,
} from "../components/employer/EmployerEngagementViews";
import CompanyLegal from "../components/employer/CompanyLegal";
import LogoutFlowModals from "../components/LogoutFlowModals";
import SearchableSelect from "../components/ui/SearchableSelect";
import {
  ETHIOPIAN_SECTORS as jobSectors,
  SECTOR_SKILLS_MAP,
  UNIVERSAL_SKILL_SUGGESTIONS,
} from "../data/sectorsData";

const stages = [
  ["overview", "Dashboard", LayoutDashboard],
  ["profile", "Company & Legal", Building2],
  ["post", "Post Job", Plus],
  ["jobs", "My Jobs", BriefcaseBusiness],
  ["applications", "Applications", ClipboardList],
  ["matching", "AI Matching", Target],
  ["shortlist", "Shortlist", Star],
  ["interviews", "Interviews", CalendarDays],
  ["reviews", "Reviews Management", MessageCircle],
  ["messages", "Messages", MessageCircle],
  ["notifications", "Notifications", Bell],
  ["settings", "Settings", Settings],
  ["summary", "AI Candidate Summary", Sparkles],
];

const applicationPipelineFilters = [
  { value: "all", label: "All Applicants", icon: Users, badge: "Total pipeline", tone: "bg-blue-50 text-blue-600 border-blue-100", badgeTone: "bg-blue-50 text-blue-700" },
  { value: "pending", label: "Pending (New)", icon: Clock3, badge: "Unreviewed", tone: "bg-amber-50 text-amber-600 border-amber-100", badgeTone: "bg-amber-50 text-amber-700" },
  { value: "review", label: "In Review", icon: SearchCheck, badge: "Screening", tone: "bg-indigo-50 text-indigo-600 border-indigo-100", badgeTone: "bg-indigo-50 text-indigo-700" },
  { value: "high_match", label: "Top AI Matches (≥80%)", icon: Sparkles, badge: "High compatibility", tone: "bg-purple-50 text-purple-600 border-purple-100", badgeTone: "bg-purple-50 text-purple-700" },
  { value: "shortlisted", label: "Shortlisted", icon: Star, badge: "Qualified pool", tone: "bg-blue-50 text-blue-600 border-blue-100", badgeTone: "bg-blue-50 text-blue-700" },
  { value: "interview", label: "Interviews", icon: CalendarDays, badge: "Scheduled meets", tone: "bg-emerald-50 text-emerald-600 border-emerald-100", badgeTone: "bg-emerald-50 text-emerald-700" },
  { value: "hired", label: "Hired", icon: Trophy, badge: "Offers accepted", tone: "bg-green-100 text-green-700 border-green-200", badgeTone: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejected", icon: XCircle, badge: "Archived", tone: "bg-rose-50 text-rose-600 border-rose-100", badgeTone: "bg-rose-50 text-rose-700" },
];
const applicationStatusOptions = applicationPipelineFilters.filter(({ value }) =>
  ["pending", "review", "shortlisted", "interview", "hired", "rejected"].includes(value),
);

function formatApplicationDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dateDay = new Date(date);
  dateDay.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((startOfToday - dateDay) / 86400000);
  const relativeLabel = daysAgo === 0
    ? "Today"
    : daysAgo === 1
      ? "Yesterday"
      : daysAgo > 1
        ? `${daysAgo} days ago`
        : "";

  return relativeLabel ? `${dateLabel} (${relativeLabel})` : dateLabel;
}

function getCandidateMatchDetails(candidate) {
  const readScore = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
  };
  const matchedSkills = Array.isArray(candidate.matchedSkills) ? candidate.matchedSkills : [];
  const requiredSkills = Array.isArray(candidate.requiredSkills) ? candidate.requiredSkills : [];
  const skills = readScore(candidate.skills_match_score)
    ?? (requiredSkills.length ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : null);
  const experience = readScore(candidate.experience_match_score);
  const title = readScore(candidate.titleScore ?? candidate.title_match_score);
  const education = readScore(candidate.education_match_score);
  const evidenceScores = [skills, experience, title, education].filter((score) => score !== null);
  const storedOverall = readScore(candidate.matchScore ?? candidate.aiMatchScore);
  const overall = storedOverall > 0
    ? storedOverall
    : evidenceScores.length
      ? Math.round(evidenceScores.reduce((sum, score) => sum + score, 0) / evidenceScores.length)
      : null;
  return {
    overall,
    estimatedOverall: storedOverall === null || storedOverall === 0,
    skills,
    experience,
    title,
    education,
    matchedSkills,
  };
}

function getLocalDateTimeValue(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function buildInterviewSmsMessage(candidate, interviewAt, meetingType, meetingLocation) {
  const formattedDate = interviewAt
    ? new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(interviewAt))
    : "";
  const meetingLabel = meetingType === "online" ? "Online" : "In-Person";
  const details = [
    formattedDate,
    meetingLocation.trim() ? `${meetingLabel}: ${meetingLocation.trim()}` : "",
  ].filter(Boolean).join(" · ");
  return `Hello ${candidate.name || "there"}, interview invitation for ${candidate.jobTitle || "the role"}${details ? `. ${details}` : "."}`.slice(0, 160);
}

function CandidateScoreProgress({ label, score, description }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{score === null ? "Not evaluated" : `${Math.round(score)}%`}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        {score !== null && <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />}
      </div>
      {description && <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>}
    </div>
  );
}

const getJobApprovalStatus = (job) => {
  const approvalStatus = String(job.approval_status || job.approvalStatus || "").toLowerCase();
  if (["pending", "approved", "rejected"].includes(approvalStatus)) return approvalStatus;
  if (String(job.status || "").toLowerCase() === "rejected") return "rejected";
  return job.is_approved === true || job.is_approved === 1 ? "approved" : "pending";
};

const employmentTypeOptions = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
  { value: "self-employed", label: "Self-employed" },
  { value: "volunteer", label: "Volunteer" },
  { value: "other", label: "Other" },
];
const workModeOptions = [
  { value: "on-site", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "other", label: "Other" },
];
const genderPreferenceOptions = [
  { value: "any", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];
const educationOptions = [
  { value: "any", label: "Any / Not Specified" },
  { value: "high-school", label: "High School" },
  { value: "associate", label: "Diploma / TVET" },
  { value: "bachelor", label: "Bachelor's Degree (BSc/BA)" },
  { value: "master", label: "Master's Degree (MSc/MA)" },
  { value: "phd", label: "PhD / Doctorate" },
  { value: "other", label: "Other" },
];
const getEditOptionValue = (value, options) => {
  const normalizedValue = String(value || "").toLowerCase();
  const matchingOption = options.find(
    (option) =>
      String(typeof option === "string" ? option : option.value).toLowerCase() ===
      normalizedValue,
  );
  return matchingOption
    ? typeof matchingOption === "string"
      ? matchingOption
      : matchingOption.value
    : value
      ? "other"
      : "";
};

const parseSkills = (value) =>
  (Array.isArray(value) ? value : String(value || "").split(","))
    .map((skill) => String(skill).trim())
    .filter(Boolean);

const filterJobsForEmployer = (jobs, user) => {
  const userId = user?.id ?? user?.userId ?? user?.user_id ?? user?.sub;
  const userEmail = String(user?.email || "").trim().toLowerCase();

  if (userId == null && !userEmail) return [];

  return jobs.filter((job) => {
    const jobOwnerId =
      job.employer_id ??
      job.employerId ??
      job.user_id ??
      job.userId ??
      job.created_by ??
      job.createdBy;
    const jobOwnerEmail = String(
      job.employer_email ??
        job.employerEmail ??
        job.user_email ??
        job.userEmail ??
        "",
    )
      .trim()
      .toLowerCase();

    return (
      (userId != null && jobOwnerId != null && String(jobOwnerId) === String(userId)) ||
      (userEmail && jobOwnerEmail === userEmail)
    );
  });
};

const blankJob = {
  title: "",
  company_name: "",
  department: "",
  department_other: "",
  job_type: "",
  job_type_other: "",
  experience_level: "",
  work_mode: "",
  work_mode_other: "",
  gender_preference: "",
  location: "",
  work_address: "",
  salary_min: "",
  salary_max: "",
  salary_type: "",
  is_negotiable: false,
  min_experience: "",
  required_education: "",
  required_education_other: "",
  education_qualification: "",
  vacancies: "1",
  benefits: "",
  currency: "ETB",
  application_deadline: "",
  required_skills: "",
  description: "",
};

const getSalaryValidationErrors = (minimum, maximum) => {
  const minValue = minimum === "" ? null : Number(minimum);
  const maxValue = maximum === "" ? null : Number(maximum);
  const errors = { minimum: "", maximum: "" };

  if (minValue !== null && minValue < 0) errors.minimum = "Minimum salary cannot be negative.";
  if (maxValue !== null && maxValue < 0) errors.maximum = "Maximum salary cannot be negative.";
  if (minValue !== null && maxValue !== null && maxValue < minValue) {
    errors.maximum = "Maximum salary must be greater than or equal to minimum salary.";
  }

  return errors;
};

function ScoreRing({ score, size = 54 }) {
  const color = score >= 85 ? "#10b981" : score >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0deg)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full bg-white font-semibold text-slate-800"
        style={{
          width: size - 10,
          height: size - 10,
          fontSize: size < 60 ? 12 : 16,
        }}
      >
        {score}%
      </div>
    </div>
  );
}
function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div
      className={`fixed right-6 top-6 z-[70] flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl ${
        isError
          ? "border-red-500 bg-red-600 text-white"
          : "border-emerald-500 bg-emerald-600 text-white"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-5 w-5 text-white" />
      ) : (
        <CheckCircle2 className="h-5 w-5 text-emerald-200" />
      )}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div className="block min-w-0">
      <span className="block text-[15px] font-semibold text-slate-800 mb-2 tracking-normal">
        {label}
      </span>
      {children}
    </div>
  );
}
function inputClass(dark, modern = false) {
  if (modern) {
    return "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50";
  }
  return `min-h-11 w-full min-w-0 rounded-xl border px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-500 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 ${dark ? "border-slate-700 bg-slate-900 text-white placeholder:text-slate-400" : "border-slate-300 bg-white shadow-sm hover:border-slate-400"}`;
}

function selectInputClass(dark, modern = false) {
  if (modern) {
    return "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50";
  }
  return `min-h-11 w-full min-w-0 rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"}`;
}

function getAddisAbabaDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatScheduleDate(isoDate) {
  const [year, month, day] = String(isoDate || "").split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

function normalizeJobDeadline(value) {
  const text = String(value || "").trim();
  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) {
    const parsed = new Date(`${isoDate[1]}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === isoDate[1] ? isoDate[1] : "";
  }
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  return ethiopianDateToGregorian(Number(match[3]), Number(match[2]), Number(match[1]));
}

function formatJobDeadline(value) {
  const text = String(value || "");
  const normalized = normalizeJobDeadline(text);
  if (!normalized) return text;
  const dateParts = getEthiopianDateParts(new Date(`${normalized}T12:00:00Z`));
  return `${String(dateParts.day).padStart(2, "0")}/${String(dateParts.month).padStart(2, "0")}/${dateParts.year}`;
}

function formatCandidateEntry(entry) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return "";
  return [
    entry.role || entry.title || entry.degree || entry.course,
    entry.company || entry.institution || entry.school_name,
    entry.duration || entry.dates || entry.year,
    entry.description,
  ].filter(Boolean).join(" · ");
}

async function fetchEmployerApplications(ownedJobs, searchTerm = "", jobId = "all") {
  const response = await api.get("/employer/applications", {
    params: { search: searchTerm, job_id: jobId },
  });
  const rows = response.data?.applications;
  if (!Array.isArray(rows)) {
    throw new Error(response.data?.message || "Employer applications response was not a list.");
  }
  return {
    applications: rows.map((item) => ({
      ...item,
      id: item.application_id || item.applicationId || item.id,
      applicationId: item.applicationId || item.application_id || null,
      candidateId: item.candidateId || item.job_seeker_id,
      name: item.candidateName || item.full_name || item.name,
      email: item.email || item.candidateEmail,
      phone: item.phone,
      location: item.candidateLocation || item.candidate_location,
      avatarUrl: item.avatar_url || item.avatarUrl || null,
      jobTitle:
        ownedJobs.find((jobItem) => String(jobItem.id) === String(item.job_id))
          ?.title || item.jobTitle,
      aiMatchScore: item.aiMatchScore ?? item.ai_match_score,
      matchScore: item.aiMatchScore ?? item.ai_match_score,
      skills_match_score: item.skills_match_score ?? item.skillsMatchScore,
      experience_match_score: item.experience_match_score ?? item.experienceMatchScore,
      title_match_score: item.title_match_score ?? item.titleMatchScore ?? item.titleScore,
      domain_match_score: item.domain_match_score ?? item.domainMatchScore,
      education_match_score: item.education_match_score ?? item.educationMatchScore,
      soft_skills_match_score: item.soft_skills_match_score ?? item.softSkillsMatchScore,
      aiMatchSummary: item.ai_match_summary || item.aiMatchSummary || "",
      aiStrengths: item.ai_strengths || item.aiStrengths || [],
      aiGaps: item.ai_missing_skills || item.aiGaps || [],
      matchedSkills: item.matchedSkills || [],
      candidateSkills: item.candidateSkills || item.skills || [],
      requiredSkills: item.requiredSkills || [],
      missingSkills: item.missingSkills || [],
      education: item.education || [],
      experience: item.experience || [],
      educationLevel: item.educationLevel || item.education_level || "",
      experienceLevel: item.experienceLevel || item.experience_level || "",
      headline: item.headline || "",
      candidateSummary: item.candidateSummary || item.headline || "",
      aiRecommendation: item.aiRecommendation || item.ai_recommendation || "",
      employer_notes: item.employer_notes || "",
      resumeFileName: item.file_name || item.resumeFileName || "",
      appliedAt: item.appliedAt || item.applied_at || null,
      status: item.status,
    })),
    counts: response.data.counts || {},
  };
}

function parseScheduleDate(displayDate) {
  const match = String(displayDate || "").trim().match(/^(\d{1,2})[,/ -](\d{1,2})[,/ -](\d{4})$/);
  if (!match) return "";

  const [, day, month, year] = match;
  const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsedDate = new Date(`${isoDate}T00:00:00Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === isoDate
    ? isoDate
    : "";
}

const ETHIOPIAN_TIME_PERIODS = {
  morning: { label: "Morning", hours: [1, 2, 3, 4, 5] },
  afternoon: { label: "Afternoon", hours: [6, 7, 8, 9, 10, 11] },
  evening: { label: "Evening", hours: [12, 1, 2, 3, 4, 5] },
  night: { label: "Night", hours: [6, 7, 8, 9, 10, 11] },
};
const ETHIOPIAN_MONTH_NAMES = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
];
const ETHIOPIAN_DATE_FORMATTER = new Intl.DateTimeFormat("en-US-u-ca-ethiopic", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

function getEthiopianDateParts(date) {
  const parts = ETHIOPIAN_DATE_FORMATTER.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function ethiopianDateToGregorian(year, month, day) {
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 13 || !Number.isInteger(day) || day < 1 || day > 30) return "";
  let low = Date.UTC(year + 7, 0, 1);
  let high = Date.UTC(year + 9, 0, 1);
  const target = [year, month, day];
  const dayMilliseconds = 86400000;

  while (low <= high) {
    const middle = Math.floor((low + high) / (2 * dayMilliseconds)) * dayMilliseconds;
    const currentDate = new Date(middle);
    const current = getEthiopianDateParts(currentDate);
    const comparison = current.year - target[0] || current.month - target[1] || current.day - target[2];
    if (comparison === 0) return currentDate.toISOString().slice(0, 10);
    if (comparison < 0) low = middle + dayMilliseconds;
    else high = middle - dayMilliseconds;
  }
  return "";
}

function getEthiopianMonthLength(year, month) {
  if (month < 13) return 30;
  const currentMonthStart = ethiopianDateToGregorian(year, month, 1);
  const nextYearStart = ethiopianDateToGregorian(year + 1, 1, 1);
  if (!currentMonthStart || !nextYearStart) return 5;
  return Math.round((Date.parse(`${nextYearStart}T00:00:00Z`) - Date.parse(`${currentMonthStart}T00:00:00Z`)) / 86400000);
}

const getApplicantMatchScore = (item) =>
  Number(
    item.aiMatchScore?.overallMatch ??
      item.ai_match_score?.overallMatch ??
      item.matchScore ??
      item.aiMatchScore ??
      item.ai_match_score ??
      item.matchPercentage ??
      0,
  );

function getEthiopianScheduleTime({ hour, minute, period }) {
  const ethiopianHour = Number(hour);
  const twentyFourHour = period === "evening"
    ? ethiopianHour === 12 ? 18 : ethiopianHour + 18
    : period === "night"
      ? ethiopianHour - 6
      : ethiopianHour + 6;
  const eatHour = ((twentyFourHour % 24) + 24) % 24;
  const meridiem = eatHour < 12 ? "AM" : "PM";
  const displayHour = eatHour % 12 || 12;

  return {
    hour: String(eatHour).padStart(2, "0"),
    isoTime: `${String(eatHour).padStart(2, "0")}:${minute}:00+03:00`,
    preview: `${displayHour}:${minute} ${meridiem}`,
  };
}

export default function EmployerWorkspace() {
  const { user, token, setSession, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const standalonePostJob = location.pathname.includes("/post-job") || location.pathname.endsWith("/jobs/new");
  const [active, setActive] = useState(() =>
    location.pathname.includes("/post-job") ||
    location.pathname.endsWith("/jobs/new")
      ? "post"
      : location.pathname === "/employer/ai-matching"
        ? "matching"
      : location.pathname.includes("/applicants") ||
          location.pathname.includes("/applications") ||
          location.pathname.includes("/candidates")
        ? "applications"
        : location.pathname.includes("/messages")
          ? "messages"
          : location.pathname === "/employer/jobs" || /^\/employer\/jobs\/[^/]+$/.test(location.pathname)
            ? "jobs"
            : searchParams.get("view") || "overview",
  );
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsLoadError, setJobsLoadError] = useState("");
  const [applications, setApplications] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [offers, setOffers] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [company, setCompany] = useState({
    company_name: "",
    industry: "",
    company_size: "11-50",
    location: "",
    website: "",
    description: "",
    benefits: "",
    license_number: "",
    tin_number: "",
    license_expiry_date: "",
    verification_status: "Under Review",
  });
  const [job, setJob] = useState(blankJob);
  const [salaryError, setSalaryError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [deadlineCalendarOpen, setDeadlineCalendarOpen] = useState(false);
  const [deadlineCalendarMonth, setDeadlineCalendarMonth] = useState(() =>
    getEthiopianDateParts(new Date(`${getAddisAbabaDate()}T12:00:00Z`)),
  );
  const salaryValidationErrors = getSalaryValidationErrors(job.salary_min, job.salary_max);
  const selectedSkills = parseSkills(job.required_skills);
  const skillSuggestions =
    SECTOR_SKILLS_MAP[job.department] || UNIVERSAL_SKILL_SUGGESTIONS;
  const addSkills = (skills) => {
    setJob((current) => {
      const existingSkills = parseSkills(current.required_skills);
      const seen = new Set(existingSkills.map((skill) => skill.toLowerCase()));
      const nextSkills = [...existingSkills];
      skills.forEach((skill) => {
        const normalizedSkill = String(skill || "").trim();
        const key = normalizedSkill.toLowerCase();
        if (normalizedSkill && !seen.has(key)) {
          seen.add(key);
          nextSkills.push(normalizedSkill);
        }
      });
      return { ...current, required_skills: nextSkills.join(", ") };
    });
    clearStep1Error("required_skills");
  };
  const removeSkill = (skillToRemove) => {
    setJob((current) => ({
      ...current,
      required_skills: parseSkills(current.required_skills)
        .filter((skill) => skill.toLowerCase() !== skillToRemove.toLowerCase())
        .join(", "),
    }));
  };
  const handleSkillInputChange = (value) => {
    const parts = value.split(",");
    if (parts.length > 1) {
      addSkills(parts.slice(0, -1));
      setSkillInput(parts[parts.length - 1].trimStart());
      return;
    }
    setSkillInput(value);
  };
  const submitSkillInput = () => {
    if (!skillInput.trim()) return;
    addSkills([skillInput]);
    setSkillInput("");
  };
  const [step1Errors, setStep1Errors] = useState({});
  const [editingJobId, setEditingJobId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState("");
  const jobSaveInFlightRef = useRef(false);
  const jobDraftIdRef = useRef(null);
  const [wizard, setWizard] = useState(1);
  const [selected, setSelected] = useState(null);
  const [candidateDrawerOpen, setCandidateDrawerOpen] = useState(false);
  const [candidateDrawerTab, setCandidateDrawerTab] = useState("overview");
  const [candidateNotes, setCandidateNotes] = useState("");
  const [savingCandidateNotes, setSavingCandidateNotes] = useState(false);
  const drawerCloseTimeoutRef = useRef(null);
  const [reportCandidate, setReportCandidate] = useState(null);
  const [platformReportOpen, setPlatformReportOpen] = useState(false);
  const [aiCandidate, setAiCandidate] = useState(null);
  const [matchingJobId, setMatchingJobId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedApplicationSearch, setDebouncedApplicationSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [applicationCounts, setApplicationCounts] = useState({});
  const [minScore, setMinScore] = useState(0);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState([]);
  const openedDeepLinkCandidateRef = useRef("");
  const openedDeepLinkJobRef = useRef("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [openApplicationMenu, setOpenApplicationMenu] = useState(null);
  const [rejectFeedbackApplication, setRejectFeedbackApplication] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [messageCandidate, setMessageCandidate] = useState(null);
  const [initialMessage, setInitialMessage] = useState("");
  const [sendingInitialMessage, setSendingInitialMessage] = useState(false);
  const [smsCandidate, setSmsCandidate] = useState(null);
  const [smsTemplate, setSmsTemplate] = useState("interview");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsInterviewAt, setSmsInterviewAt] = useState("");
  const [smsInterviewMinimum, setSmsInterviewMinimum] = useState("");
  const [smsMeetingType, setSmsMeetingType] = useState("in_person");
  const [smsMeetingLocation, setSmsMeetingLocation] = useState("");
  const [smsValidationErrors, setSmsValidationErrors] = useState({});
  const [smsSentApplicationIds, setSmsSentApplicationIds] = useState(() => new Set());
  const [sendingSms, setSendingSms] = useState(false);
  const [smsHistory, setSmsHistory] = useState([]);
  const [smsHistoryLoading, setSmsHistoryLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [activeMetric, setActiveMetric] = useState(null);
  const [highlightActiveJobs, setHighlightActiveJobs] = useState(false);
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState(null);
  const applicationSearchSequence = useRef(0);
  const activeTabRef = useRef(active);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [dark, setDark] = useState(false);
  const toastTimeoutRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedApplicationSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);
  useEffect(() => {
    activeTabRef.current = active;
  }, [active]);
  useEffect(() => {
    if (!selected) {
      setCandidateDrawerOpen(false);
      return undefined;
    }
    if (drawerCloseTimeoutRef.current) window.clearTimeout(drawerCloseTimeoutRef.current);
    setCandidateDrawerTab("overview");
    setCandidateNotes(selected.employer_notes || selected.employerNotes || "");
    const frame = window.requestAnimationFrame(() => setCandidateDrawerOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);
  useEffect(() => {
    if (!highlightActiveJobs) return undefined;
    const timeoutId = window.setTimeout(() => setHighlightActiveJobs(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [highlightActiveJobs]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState({
    date: "",
    hour: "3",
    minute: "00",
    period: "morning",
  });
  const [scheduleDateInput, setScheduleDateInput] = useState("");
  const [showPublishSchedule, setShowPublishSchedule] = useState(false);
  const [publishScheduleError, setPublishScheduleError] = useState("");
  const publishScheduleDatePickerRef = useRef(null);
  const resetPublishScheduleForm = (defaultToToday = false) => {
    const today = getAddisAbabaDate();
    const nextDate = defaultToToday ? today : "";
    setScheduleDraft({
      date: nextDate,
      hour: "3",
      minute: "00",
      period: "morning",
    });
    setScheduleDateInput(defaultToToday ? formatScheduleDate(today) : "");
    setPublishScheduleError("");
  };
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutSession, setLogoutSession] = useState(null);
  const [schedule, setSchedule] = useState({
    date: "",
    time: "",
    type: "video",
    link: "",
    notes: "",
  });
  useEffect(() => {
    let mounted = true;
    const loadUnreadNotifications = () => api.get('/employer/notifications/unread-count').then(({ data }) => {
      if (mounted) setUnreadNotificationCount(Number(data?.data?.count || 0));
    }).catch(() => {});
    loadUnreadNotifications();
    const intervalId = window.setInterval(loadUnreadNotifications, 15000);
    const handleNotificationUpdate = () => loadUnreadNotifications();
    window.addEventListener('employer-notifications:updated', handleNotificationUpdate);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('employer-notifications:updated', handleNotificationUpdate);
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    const loadUnreadMessages = () => api.get('/employer/messages/conversations/unread-count').then(({ data }) => {
      if (mounted) setUnreadMessageCount(Number(data?.data?.count || 0));
    }).catch(() => {});
    loadUnreadMessages();
    const intervalId = window.setInterval(loadUnreadMessages, 30000);
    const handleMessageUpdate = () => loadUnreadMessages();
    window.addEventListener('employer-messages:updated', handleMessageUpdate);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('employer-messages:updated', handleMessageUpdate);
    };
  }, []);
  const globalSearchResults = useMemo(() => {
    const query = globalQuery.trim().toLowerCase();
    if (!query) return [];
    const jobResults = jobs
      .filter((item) => `${item.title || ""} ${item.location || ""} ${item.description || ""}`.toLowerCase().includes(query))
      .slice(0, 5)
      .map((item) => ({ type: "Job", title: item.title || "Untitled job", detail: `${item.location || "Location not provided"} · ${item.status || "Draft"}`, action: () => { setActive("jobs"); setGlobalSearchOpen(false); } }));
    const employeeResults = applications
      .filter((item) => `${item.candidate_name || item.candidateName || ""} ${item.job_title || item.jobTitle || ""} ${item.status || ""}`.toLowerCase().includes(query))
      .slice(0, 8)
      .map((item) => ({ type: "Employee", title: item.candidate_name || item.candidateName || "Employee", detail: `${item.job_title || item.jobTitle || "Application"} · ${item.status || "New"}`, action: () => { setActive("applications"); setGlobalSearchOpen(false); } }));
    return [...employeeResults, ...jobResults];
  }, [applications, globalQuery, jobs, setActive, setGlobalSearchOpen]);
  const handleLogout = () => {
    setLogoutSession({ token, user });
    setLogoutOpen(true);
  };

  const notify = (message, type = "success") => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ message, type });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 5000);
  };
  const validateStep1 = () => {
    const errors = {};
    if (!String(job.title || "").trim()) errors.title = "Job title is required";
    if (!String(job.company_name || "").trim()) errors.company_name = "Company / organization name is required";
    if (!String(job.location || "").trim()) errors.location = "Location is required";
    if (!String(job.application_deadline || "").trim()) errors.application_deadline = "Application deadline is required";
    else if (!normalizeJobDeadline(job.application_deadline)) errors.application_deadline = "Enter a valid date in DD/MM/YYYY format.";
    if (!String(job.required_skills || "").trim()) errors.required_skills = "Please enter at least one required skill";
    if (!String(job.description || "").trim()) errors.description = "Job description is required";
    if (!Number.isInteger(Number(job.vacancies)) || Number(job.vacancies) < 1) errors.vacancies = "Enter at least 1 vacancy.";
    if (salaryValidationErrors.minimum) errors.salary_min = salaryValidationErrors.minimum;
    if (salaryValidationErrors.maximum) errors.salary_max = salaryValidationErrors.maximum;
    if (!job.salary_type) errors.salary_type = "Select a salary type";
    setStep1Errors(errors);
    return errors;
  };
  const handleContinueToPreview = (event) => {
    event.preventDefault();
    const errors = validateStep1();
    const salaryRangeIsInvalid =
      job.salary_min !== "" &&
      job.salary_max !== "" &&
      Number(job.salary_min) > Number(job.salary_max);
    setSalaryError(
      salaryRangeIsInvalid
        ? "Minimum salary cannot be greater than maximum salary"
        : salaryValidationErrors.minimum || salaryValidationErrors.maximum,
    );
    const firstInvalidField = ["title", "location", "application_deadline", "required_skills", "description", "salary_type", "salary_min", "salary_max", "vacancies"]
      .find((field) => errors[field]);
    if (firstInvalidField) {
      const input = document.getElementById(firstInvalidField);
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStep1Errors({});
    setWizard(2);
  };
  const clearStep1Error = (field) => {
    setStep1Errors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const validateJob = () => {
    if (!normalizeJobDeadline(job.application_deadline)) {
      notify("Enter a valid application deadline in DD/MM/YYYY format.", "error");
      setWizard(1);
      return false;
    }
    if (salaryValidationErrors.minimum || salaryValidationErrors.maximum) {
      notify(salaryValidationErrors.minimum || salaryValidationErrors.maximum, "error");
      setWizard(1);
      return false;
    }
    if (!Number.isInteger(Number(job.vacancies)) || Number(job.vacancies) < 1) {
      notify("Enter at least 1 vacancy.", "error");
      setWizard(1);
      return false;
    }
    const missing = [
      ["Job title", job.title],
      ["Location", job.location],
      ["Description", job.description],
    ]
      .filter(([, value]) => !String(value || "").trim())
      .map(([label]) => label);
    if (missing.length) {
      notify(`Please complete: ${missing.join(", ")}`, "error");
      setWizard(1);
      return false;
    }
    return true;
  };
  useEffect(() => {
    const requestedStage =
      location.pathname.includes("/post-job") ||
      location.pathname.endsWith("/jobs/new")
        ? "post"
        : location.pathname === "/employer/ai-matching"
          ? "matching"
        : location.pathname.includes("/applicants") ||
            location.pathname.includes("/applications") ||
            location.pathname.includes("/candidates")
          ? "applications"
          : location.pathname.includes("/messages")
            ? "messages"
            : location.pathname === "/employer/jobs" || /^\/employer\/jobs\/[^/]+$/.test(location.pathname)
              ? "jobs"
              : searchParams.get("view") || "overview";
    if (stages.some(([id]) => id === requestedStage)) setActive(requestedStage);
  }, [location.pathname, searchParams]);
  useEffect(() => {
    const requestedJobId = searchParams.get("jobId") || searchParams.get("job_id");
    if (requestedJobId) setSelectedJobFilter(requestedJobId);
  }, [searchParams]);
  const selectStage = (stage) => {
    setActive(stage);
    setSidebarOpen(false);
    const nextUrl =
      stage === "overview"
        ? "/employer/dashboard"
        : stage === "matching"
          ? "/employer/ai-matching"
        : stage === "post"
          ? "/employer/jobs/new"
          : `/employer/dashboard?view=${stage}`;
    navigate(nextUrl, { replace: true });
  };
  const navigateFromMetric = (targetTab, subTab) => {
    const stageMap = { my_jobs: "jobs", ai_matching: "matching" };
    const stage = stageMap[targetTab] || targetTab;
    if (stage === "matching") setMinScore(subTab === "top_matches" ? 80 : 0);
    if (stage === "applications") setStatus("all");
    selectStage(stage);
  };
  useEffect(() => {
    const candidateId = searchParams.get("candidateId");
    const applicationId = searchParams.get("id");
    const deepLinkId = applicationId || candidateId;
    if (!deepLinkId) {
      openedDeepLinkCandidateRef.current = "";
      return;
    }
    if (openedDeepLinkCandidateRef.current === deepLinkId) return;
    const candidate = applications.find((application) =>
      applicationId
        ? String(application.applicationId || application.id) === applicationId
        : String(application.candidateId) === candidateId,
    );
    if (!candidate) return;
    openedDeepLinkCandidateRef.current = deepLinkId;
    const frame = window.requestAnimationFrame(() => setSelected(candidate));
    return () => window.cancelAnimationFrame(frame);
  }, [applications, searchParams]);
  useEffect(() => {
    const metricTargets = {
      "Active Jobs": ["jobs", "published"],
      Applicants: ["applications", "all"],
      "High AI Matches": ["matching", "top_matches"],
      Shortlisted: ["shortlist", "all"],
      Interviews: ["interviews", "upcoming"],
      Hired: ["hired", "confirmed"],
    };
    const handleMetricClick = (event) => {
      if (active !== "overview") return;
      const cardElement = event.target.closest("div.rounded-2xl.border.p-4");
      const label = cardElement?.querySelector("p")?.textContent?.trim();
      const target = metricTargets[label];
      if (target) navigateFromMetric(target[0], target[1]);
    };
    document.addEventListener("click", handleMetricClick);
    return () => document.removeEventListener("click", handleMetricClick);
  }, [active, applications, jobs, interviews]);
  useEffect(() => {
    let mounted = true;
    const loadEmployerPipeline = async () => {
      try {
        const [
          pipelineResponse,
          offersResponse,
          onboardingResponse,
          interviewsResponse,
          profileResponse,
        ] = await Promise.all([
          api.get("/employer/pipeline"),
          api.get("/employer/offers"),
          api.get("/employer/onboarding"),
          api.get("/employer/interviews"),
          api.get("/employer/profile"),
        ]);
        if (!mounted) return;
        setPipeline(pipelineResponse?.data?.applications || []);
        setOffers(offersResponse?.data?.offers || []);
        setOnboarding(onboardingResponse?.data?.onboarding || []);
        setInterviews(interviewsResponse?.data?.interviews || []);
        setCompany((current) => ({
          ...current,
          ...(profileResponse?.data?.profile || {}),
        }));
      } catch (error) {
        if (!mounted) return;
        setPipeline([]);
        setOffers([]);
        setOnboarding([]);
        setApplications([]);
        console.error("Unable to load employer dashboard records:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setLoading(true);
    loadEmployerPipeline();
    return () => {
      mounted = false;
    };
  }, [token]);
  useEffect(() => {
    const handleCompanyProfileUpdate = (event) => {
      const profile = event.detail || {};
      setCompany((current) => ({
        ...current,
        company_name: profile.company_name ?? current.company_name,
        industry: profile.industry ?? current.industry,
        location: profile.location ?? current.location,
        website: profile.website ?? current.website,
        description: profile.description ?? current.description,
        logo_url: profile.logo_url ?? current.logo_url,
      }));
    };
    window.addEventListener("employer:company-profile-updated", handleCompanyProfileUpdate);
    return () => window.removeEventListener("employer:company-profile-updated", handleCompanyProfileUpdate);
  }, []);
  useEffect(() => {
    let mounted = true;
    const refreshApplicationStatuses = async () => {
      try {
        const { data } = await api.get("/employer/pipeline");
        if (!mounted) return;
        const latestApplications = data?.applications || [];
        const latestById = new Map(
          latestApplications.map((application) => [
            String(application.id),
            application,
          ]),
        );
        setPipeline(latestApplications);
        setApplications((current) =>
          current.map((application) => {
            const latest = latestById.get(String(application.id));
            return latest
              ? {
                  ...application,
                  status: latest.status,
                  interview: latest.interview || application.interview,
                }
              : application;
          }),
        );
      } catch (error) {
        console.error("Unable to refresh employer application statuses", error);
      }
    };

    const intervalId = window.setInterval(refreshApplicationStatuses, 10000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    const refreshJobs = async () => {
      try {
        const response = await api.get("/employer/jobs");
        const responseJobs = response?.data?.jobs ?? response?.data;
        if (!Array.isArray(responseJobs)) {
          throw new Error("Employer jobs response was not a list.");
        }
        if (!mounted) return;
        const latestJobs = filterJobsForEmployer(responseJobs, user);
        setJobsLoadError("");
        setJobs(latestJobs);
        setJobsLoading(false);
        if (latestJobs.length) {
          setMatchingJobId((current) => current || String(latestJobs[0].id));
        }
        if (!["applications", "shortlist", "hired"].includes(activeTabRef.current)) {
          try {
            const result = await fetchEmployerApplications(latestJobs);
            setApplications(result.applications);
            setApplicationCounts(result.counts);
          } catch (error) {
            console.error("Unable to load applications for employer jobs:", error);
          }
        }
      } catch (error) {
        if (!mounted) return;
        setJobs([]);
        setJobsLoading(false);
        setJobsLoadError("Unable to load your job postings. Please try again.");
        console.error("Unable to refresh employer jobs:", error);
      }
    };
    setJobs([]);
    setJobsLoading(true);
    setJobsLoadError("");
    refreshJobs();
    window.addEventListener("focus", refreshJobs);
    const intervalId = window.setInterval(refreshJobs, 10000);
    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshJobs);
      window.clearInterval(intervalId);
    };
  }, [token, user?.id, user?.userId, user?.user_id, user?.sub, user?.email]);
  const activeJobs = useMemo(
    () =>
      jobs.filter((job) =>
        ["active", "published", "open"].includes(
          String(job.status || "").trim().toLowerCase(),
        ),
      ),
    [jobs],
  );
  useEffect(() => {
    if (!["applications", "shortlist", "hired"].includes(active) || !jobs.length) return undefined;
    const requestId = ++applicationSearchSequence.current;
    let mounted = true;
    fetchEmployerApplications(jobs, debouncedApplicationSearch, selectedJobFilter)
      .then((result) => {
        if (mounted && requestId === applicationSearchSequence.current) {
          setApplications(result.applications);
          setApplicationCounts(result.counts);
        }
      })
      .catch((error) => {
        if (mounted && requestId === applicationSearchSequence.current) {
          console.error("Unable to search employer applications:", error);
          notify(error?.response?.data?.message || "Unable to search candidates. Please try again.", "error");
        }
      });
    return () => {
      mounted = false;
    };
  }, [active, jobs, debouncedApplicationSearch, selectedJobFilter]);
  useEffect(() => {
    if (
      !jobsLoading &&
      selectedJobFilter !== "all" &&
      !jobs.some(
        (job) => String(job.id) === String(selectedJobFilter),
      )
    ) {
      setSelectedJobFilter("all");
    }
  }, [jobs, jobsLoading, selectedJobFilter]);
  const filtered = useMemo(
    () =>
      applications.filter(
        (item) =>
          (!debouncedApplicationSearch ||
            `${item.name || item.candidateName} ${item.email || item.candidateEmail || ""} ${item.jobTitle || ""} ${(item.matchedSkills || []).join(" ")} ${(item.candidateSkills || []).join(" ")} ${item.profile_skills || ""}`
              .toLowerCase()
              .includes(debouncedApplicationSearch.toLowerCase())) &&
          (status === "all" ||
            (status === "high_match" && getApplicantMatchScore(item) >= 80) ||
            normalizePipelineStatus(item.status) ===
              (status === "interview" ? "interviewed" : status)) &&
          (activeFilter === "ALL" ||
            (activeFilter === "HIGH_AI" && getApplicantMatchScore(item) >= 80) ||
            (activeFilter === "ACTIVE_JOBS" &&
              activeJobs.some((jobItem) => String(jobItem.id) === String(item.job_id ?? item.jobId))) ||
            (activeFilter === "Pending" && String(item.status || "").trim().toLowerCase() === "pending") ||
            (activeFilter === "InReview" &&
              ["review", "in review"].includes(String(item.status || "").trim().toLowerCase().replace(/_/g, " "))) ||
            (activeFilter === "Shortlisted" && normalizePipelineStatus(item.status) === "shortlisted") ||
            (activeFilter === "Interview" && normalizePipelineStatus(item.status) === "interviewed") ||
            (activeFilter === "Hired" && normalizePipelineStatus(item.status) === "hired")) &&
          Number(item.matchScore || 0) >= minScore,
      ),
    [applications, jobs, activeJobs, debouncedApplicationSearch, status, activeFilter, minScore],
  );
  const jobScopedApplications = useMemo(
    () => applications.filter((item) =>
      selectedJobFilter === "all"
        || String(item.job_id ?? item.jobId ?? item.job?.id ?? "") === String(selectedJobFilter),
    ),
    [applications, selectedJobFilter],
  );
  const pipelineCardCounts = useMemo(
    () => Object.fromEntries(applicationPipelineFilters.map(({ value }) => {
      const countKey = value === "high_match" ? "highMatch" : value;
      if (applicationCounts[countKey] !== undefined) return [value, Number(applicationCounts[countKey]) || 0];
      return [
        value,
        value === "all"
          ? jobScopedApplications.length
          : value === "high_match"
            ? jobScopedApplications.filter((item) => getApplicantMatchScore(item) >= 80).length
            : jobScopedApplications.filter((item) =>
              normalizePipelineStatus(item.status) === (value === "interview" ? "interviewed" : value),
            ).length,
      ];
    })),
    [applicationCounts, jobScopedApplications],
  );
  const stats = {
    activeJobs: activeJobs.length,
    totalApplicants: applications.length,
    highMatch: applications.filter((item) => getApplicantMatchScore(item) >= 80).length,
    pending: applications.filter(
      (item) => String(item.status || "").trim().toLowerCase() === "pending",
    ).length,
    review: applications.filter((item) =>
      ["review", "in review"].includes(
        String(item.status || "").trim().toLowerCase().replace(/_/g, " "),
      ),
    ).length,
    shortlisted: applications.filter(
      (item) => normalizePipelineStatus(item.status) === "shortlisted",
    ).length,
    interviews: applications.filter(
      (item) => normalizePipelineStatus(item.status) === "interviewed",
    ).length,
    hired: applications.filter(
      (item) => normalizePipelineStatus(item.status) === "hired",
    ).length,
  };
  const nextInterview = interviews
    .filter((item) =>
      ["scheduled", "upcoming"].includes(
        String(item.interview_status || item.status || "").toLowerCase(),
      ),
    )
    .sort(
      (first, second) =>
        new Date(first.scheduled_at || first.scheduledAt) -
        new Date(second.scheduled_at || second.scheduledAt),
    )[0];
  const nextInterviewLabel = nextInterview
    ? `Next interview: ${new Date(
        nextInterview.scheduled_at || nextInterview.scheduledAt,
      ).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`
    : "No upcoming interviews";
  const pipelineStages = [
    { label: "Applied", value: applications.length || 0, percent: 100, tone: "bg-blue-600" },
    { label: "Screened", value: Math.max(0, Math.floor((applications.filter((item) => ["shortlisted", "under-review", "interview", "hired"].includes(normalizePipelineStatus(item.status))).length / Math.max(applications.length || 1, 1)) * 100)), percent: 45, tone: "bg-violet-600" },
    { label: "Interview", value: applications.filter((item) => normalizePipelineStatus(item.status) === "interview").length || 0, percent: 20, tone: "bg-amber-500" },
    { label: "Offer", value: applications.filter((item) => normalizePipelineStatus(item.status) === "hired").length || 0, percent: 8, tone: "bg-emerald-500" },
    { label: "Hired", value: stats.hired || 0, percent: 4, tone: "bg-emerald-700" },
  ];
  const updateApplication = async (id, nextStatus, employerNotes = "", silent = false) => {
    const normalizedStatus = normalizePipelineStatus(nextStatus);
    if (normalizedStatus === "interviewed") {
      notify("Schedule an interview with a date and time before setting this status.", "error");
      return false;
    }
    const previousApplication = applications.find(
      (item) => String(item.id) === String(id),
    );
    if (!previousApplication) return false;
    if (normalizePipelineStatus(previousApplication.status) === normalizedStatus && !employerNotes) return false;

    setApplications((current) =>
      current.map((item) =>
        String(item.id) === String(id)
          ? { ...item, status: normalizedStatus }
          : item,
      ),
    );
    setPipeline((current) =>
      current.map((item) =>
        String(item.id) === String(id)
          ? { ...item, status: normalizedStatus }
          : item,
      ),
    );
    setUpdatingApplicationId(id);
    let telegramNotification = null;
    try {
      const { data } = await api.patch(`/applications/${id}/status`, {
        status: normalizedStatus,
        employer_notes: employerNotes || undefined,
      });
      telegramNotification = data?.telegramNotification;
    } catch (error) {
      setApplications((current) =>
        current.map((item) =>
          String(item.id) === String(id)
            ? { ...item, status: previousApplication.status }
            : item,
        ),
      );
      setPipeline((current) =>
        current.map((item) =>
          String(item.id) === String(id)
            ? { ...item, status: previousApplication.status }
            : item,
        ),
      );
      notify(
        error?.response?.data?.message || "Unable to update candidate.",
        "error",
      );
      return false;
    } finally {
      setUpdatingApplicationId(null);
    }
    if (!silent) {
      if (telegramNotification?.sent === false) {
        console.warn("Application status updated, but the Telegram notification was not delivered.", telegramNotification.message);
      }
      notify(`✓ Status successfully updated to ${getPipelineStatusLabel(normalizedStatus)}.`, "success");
    }
    return { updated: true, telegramSent: telegramNotification?.sent === true };
  };
  const exportApplicationsCsv = (items) => {
    if (!items.length) {
      notify("There are no candidates to export.", "error");
      return;
    }
    const columns = [
      ["Candidate", (item) => item.name || item.candidateName || ""],
      ["Email", (item) => item.email || item.candidateEmail || ""],
      ["Job", (item) => item.jobTitle || ""],
      ["Status", (item) => getPipelineStatusLabel(item.status)],
      ["AI Match", (item) => getApplicantMatchScore(item)],
      ["Applied At", (item) => item.appliedAt || item.applied_at || ""],
      ["Skills", (item) => (item.matchedSkills || []).join("; ")],
    ];
    const csv = [
      columns.map(([label]) => label),
      ...items.map((item) => columns.map(([, value]) => value(item))),
    ].map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "employer-applicants.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${items.length} candidate${items.length === 1 ? "" : "s"}.`);
  };
  const runBulkStatusUpdate = async (nextStatus) => {
    const candidates = applications.filter((item) => selectedApplicationIds.includes(String(item.id)));
    const updates = candidates.filter((item) => normalizePipelineStatus(item.status) !== nextStatus);
    if (!updates.length) {
      setSelectedApplicationIds([]);
      return;
    }
    setBulkUpdating(true);
    let updatedCount = 0;
    let telegramSentCount = 0;
    for (const candidate of updates) {
      const result = await updateApplication(candidate.id, nextStatus, "", true);
      if (!result) break;
      updatedCount += 1;
      if (result.telegramSent) telegramSentCount += 1;
    }
    setBulkUpdating(false);
    setSelectedApplicationIds([]);
    if (updatedCount) {
      notify(`Updated ${updatedCount} candidate${updatedCount === 1 ? "" : "s"} to ${getPipelineStatusLabel(nextStatus)}. ${telegramSentCount} Telegram alert${telegramSentCount === 1 ? "" : "s"} sent.`);
    }
  };
  const handleApplicationStatusSelection = (candidate, nextStatus) => {
    if (["interview", "interviewed"].includes(normalizePipelineStatus(nextStatus))) {
      setSelected({
        ...candidate,
        id: candidate.id,
        candidateId: candidate.candidateId || candidate.job_seeker_id,
      });
      setSchedule({ date: "", time: "", type: "video", link: "", notes: "" });
      setShowSchedule(true);
      return;
    }
    updateApplication(candidate.id, nextStatus);
  };
  const closeCandidateDrawer = () => {
    setCandidateDrawerOpen(false);
    if (drawerCloseTimeoutRef.current) window.clearTimeout(drawerCloseTimeoutRef.current);
    drawerCloseTimeoutRef.current = window.setTimeout(() => {
      setSelected(null);
      drawerCloseTimeoutRef.current = null;
    }, 200);
  };
  const shortlistDrawerCandidate = () => {
    if (!selected) return;
    void updateApplication(selected.id, "shortlisted");
  };
  const saveCandidateHiringNotes = async () => {
    if (!selected) return;
    setSavingCandidateNotes(true);
    try {
      await api.patch(`/applications/${encodeURIComponent(String(selected.id))}/notes`, {
        notes: candidateNotes,
      });
      setApplications((current) => current.map((application) =>
        String(application.id) === String(selected.id)
          ? { ...application, employer_notes: candidateNotes }
          : application,
      ));
      setSelected((current) => current && String(current.id) === String(selected.id)
        ? { ...current, employer_notes: candidateNotes }
        : current);
      notify("Hiring notes saved.");
    } catch (error) {
      notify(error?.response?.data?.message || "Unable to save hiring notes.", "error");
    } finally {
      setSavingCandidateNotes(false);
    }
  };
  const sendInitialCandidateMessage = async (event) => {
    event.preventDefault();
    if (!messageCandidate || !initialMessage.trim()) return;
    setSendingInitialMessage(true);
    try {
      await api.post("/employer/messages", {
        candidateId: messageCandidate.candidateId || messageCandidate.job_seeker_id,
        message: initialMessage.trim(),
      });
      setMessageCandidate(null);
      setInitialMessage("");
      setActive("messages");
      window.dispatchEvent(new Event("employer-messages:updated"));
      notify(`Message sent to ${messageCandidate.name || "candidate"}.`);
    } catch (error) {
      notify(error?.response?.data?.message || "Unable to send the message.", "error");
    } finally {
      setSendingInitialMessage(false);
    }
  };
  const handleSendOffer = async (
    application,
    offeredSalary = application.offeredSalary || "",
  ) => {
    try {
      await api.post("/employer/offers", {
        applicationId: application.id,
        candidateId:
          application.candidateId ||
          application.job_seeker_id ||
          application.candidate_id,
        offeredSalary: offeredSalary === "" ? null : Number(offeredSalary) || null,
        startDate: new Date(Date.now() + 21 * 86400000)
          .toISOString()
          .slice(0, 10),
      });
      setPipeline((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, status: "offered" } : item,
        ),
      );
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, status: "offered" } : item,
        ),
      );
      notify("Offer sent successfully.");
    } catch (error) {
      notify(error?.response?.data?.message || "Unable to send offer.");
    }
  };
  const handleFinalizeEmployee = async (applicationId) => {
    try {
      await api.patch(`/employer/applications/${applicationId}/finalize`);
      setPipeline((current) =>
        current.map((item) =>
          item.id === applicationId ? { ...item, status: "hired" } : item,
        ),
      );
      setApplications((current) =>
        current.map((item) =>
          item.id === applicationId ? { ...item, status: "hired" } : item,
        ),
      );
      notify("Candidate finalized as active employee.");
    } catch (error) {
      notify(error?.response?.data?.message || "Unable to finalize employee.");
    }
  };
  const handleTaskToggle = async (taskId, isCompleted) => {
    try {
      await api.patch(`/employer/onboarding/${taskId}`, { isCompleted });
      setOnboarding((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, isCompleted } : task,
        ),
      );
      notify(isCompleted ? "Task marked complete." : "Task reopened.");
    } catch (error) {
      notify(
        error?.response?.data?.message || "Unable to update onboarding task.",
      );
    }
  };
  const refreshEmployerJobs = async () => {
    const response = await api.get("/employer/jobs");
    const responseJobs = response?.data?.jobs ?? response?.data;
    if (!Array.isArray(responseJobs)) {
      throw new Error("Employer jobs response was not a list.");
    }
    const latestJobs = filterJobsForEmployer(responseJobs, user);
    setJobsLoadError("");
    setJobs(latestJobs);
    if (latestJobs.length) {
      setMatchingJobId((current) => current || String(latestJobs[0].id));
    }
    try {
      const result = await fetchEmployerApplications(latestJobs);
      setApplications(result.applications);
      setApplicationCounts(result.counts);
    } catch (error) {
      console.error("Unable to load applications for employer jobs:", error);
    }
  };
  const retryRefreshEmployerJobs = async () => {
    setJobsLoading(true);
    setJobsLoadError("");
    try {
      await refreshEmployerJobs();
    } catch (error) {
      setJobsLoadError("Unable to load your job postings. Please try again.");
      console.error("Unable to refresh employer jobs:", error);
    } finally {
      setJobsLoading(false);
    }
  };

  const saveJob = async (nextStatus = "draft", scheduledAt = null) => {
    if (!normalizeJobDeadline(job.application_deadline)) {
      notify("Enter a valid application deadline in DD/MM/YYYY format.", "error");
      setWizard(1);
      return;
    }
    if (salaryValidationErrors.minimum || salaryValidationErrors.maximum) {
      notify(salaryValidationErrors.minimum || salaryValidationErrors.maximum, "error");
      setWizard(1);
      return;
    }
    if (jobSaveInFlightRef.current) return false;
    jobSaveInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmittingAction(nextStatus);
    const submittedSkills = parseSkills(job.required_skills);
    const payload = {
      ...job,
      company_name: String(job.company_name || user?.company_name || "").trim() || String(user?.full_name || "").trim() || "Company",
      sector: job.department === "other" ? job.department_other.trim() : (job.department || job.sector || "General"),
      category: job.department === "other" ? job.department_other.trim() : (job.department || job.category || "General"),
      title: String(job.title || "").trim(),
      description: String(job.description || "").trim(),
      job_type: job.job_type === "other" ? job.job_type_other.trim() : (job.job_type || "full-time"),
      jobType: job.job_type === "other" ? job.job_type_other.trim() : (job.job_type || "full-time"),
      work_mode: job.work_mode === "other" ? job.work_mode_other.trim() : (job.work_mode || "hybrid"),
      workMode: job.work_mode === "other" ? job.work_mode_other.trim() : (job.work_mode || "hybrid"),
      location: String(job.location || "Addis Ababa").trim() || "Addis Ababa",
      state_province: job.state_province || null,
      work_address: job.work_address || null,
      gender_preference: job.gender_preference || "any",
      salary_min: Number(job.salary_min) || null,
      salary_max: Number(job.salary_max) || null,
      currency: job.currency || "ETB",
      salary_period: job.salary_period || "monthly",
      salary_type: job.salary_type || "monthly",
      is_salary_negotiable: Boolean(job.is_negotiable ?? job.is_salary_negotiable ?? true),
      is_negotiable: Boolean(job.is_negotiable ?? job.is_salary_negotiable ?? true),
      vacancies: Number(job.vacancies) || 1,
      required_skills: submittedSkills.join(", "),
      requiredSkills: submittedSkills,
      education_qualification: job.education_qualification || (job.required_education === "other" ? job.required_education_other.trim() : (job.required_education || "Bachelor's Degree")),
      benefits: job.benefits || null,
      deadline: normalizeJobDeadline(job.application_deadline) || null,
      applicationDeadline: normalizeJobDeadline(job.application_deadline) || null,
      is_urgent: Boolean(job.is_urgent),
      isScheduled: nextStatus === "scheduled",
      scheduledAt: scheduledAt || null,
      scheduledDate: scheduledAt || null,
      status: nextStatus === "scheduled" ? "published" : nextStatus,
    };
    setLoading(true);
    try {
      const existingJobId = editingJobId || jobDraftIdRef.current;
      const response = existingJobId
        ? await api.put(`/employer/jobs/${existingJobId}`, payload)
        : await api.post("/employer/jobs", payload);
      const savedJob = response.data;
      const savedId = savedJob.id || savedJob.jobId || existingJobId;
      if (!savedId) throw new Error("The saved job did not return an ID. Refresh your postings before retrying.");
      jobDraftIdRef.current = savedId;
      setEditingJobId(savedId);
      let telegramNotification = savedJob.telegramNotification;
      if (nextStatus === "published" || nextStatus === "scheduled") {
        const statusResponse = await api.patch(`/employer/jobs/${savedId}/status`, {
          status: "published",
          ...(nextStatus === "scheduled" ? { scheduledAt: scheduledAt } : {}),
        });
        telegramNotification = statusResponse.data?.telegramNotification || telegramNotification;
      }
      let refreshFailed = false;
      try {
        await refreshEmployerJobs();
      } catch (refreshError) {
        refreshFailed = true;
        setJobs([]);
        setJobsLoadError("The job was saved, but your postings could not be refreshed. Please try again.");
        console.error("Unable to refresh employer jobs after saving:", refreshError);
      }
      setJob(blankJob);
      setSkillInput("");
      setEditingJobId(null);
      jobDraftIdRef.current = null;
      setWizard(1);
      setActive("overview");
      navigate("/employer/dashboard", {
        replace: true,
        state: {
          newlyPublished: true,
          activeTab: "dashboard",
        },
      });
      notify(
        refreshFailed
          ? "Job saved, but the postings list could not refresh."
          : nextStatus === "published"
            ? `Job submitted for admin approval.${telegramNotification?.message ? ` ${telegramNotification.message}` : ""}`
            : nextStatus === "scheduled"
              ? `Job scheduled successfully.${telegramNotification?.message ? ` ${telegramNotification.message}` : ""}`
              : `Draft saved.${telegramNotification?.message ? ` ${telegramNotification.message}` : ""}`,
        refreshFailed ? "error" : "success",
      );
      if (nextStatus === "published")
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });
      return true;
    } catch (error) {
      const serverMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to save job.";
      notify(serverMessage, "error");
      return false;
    } finally {
      setLoading(false);
      setIsSubmitting(false);
      setSubmittingAction("");
      jobSaveInFlightRef.current = false;
    }
  };
  const handlePublish = () => saveJob("published");
  const handleConfirmPublishSchedule = async () => {
    setPublishScheduleError("");
    const { hour, minute, period } = scheduleDraft;
    const date = parseScheduleDate(scheduleDateInput);
    if (!scheduleDateInput.trim()) {
      setPublishScheduleError("Please choose a publication date and time.");
      return;
    }
    if (!date) {
      setPublishScheduleError("Enter a valid date in DD/MM/YYYY format.");
      return;
    }
    if (!hour || !minute || !period) {
      setPublishScheduleError("Please choose a publication date and time.");
      return;
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      setPublishScheduleError("Enter a valid date in DD/MM/YYYY format.");
      return;
    }
    if (date < getAddisAbabaDate()) {
      setPublishScheduleError("The scheduled date must be today or later in East Africa Time.");
      return;
    }

    if (!ETHIOPIAN_TIME_PERIODS[period]?.hours.includes(Number(hour)) || !/^\d{2}$/.test(minute) || Number(minute) > 59) {
      setPublishScheduleError("Choose a valid Ethiopian hour and minute.");
      return;
    }

    const { isoTime } = getEthiopianScheduleTime(scheduleDraft);
    const eatDateTime = `${date}T${isoTime}`;
    if (new Date(eatDateTime) <= new Date()) {
      setPublishScheduleError("The scheduled time must be in the future.");
      return;
    }

    const scheduledAt = new Date(eatDateTime).toISOString();
    const saved = await saveJob("scheduled", scheduledAt);
    if (saved) {
      setShowPublishSchedule(false);
      setScheduleDraft({ date: "", hour: "3", minute: "00", period: "morning" });
      setScheduleDateInput("");
    }
  };
  const toggleJob = async (item) => {
    const normalizedStatus = normalizeJobStatus(item.status);
    const next = normalizedStatus === "active" ? "paused" : "active";

    console.log(
      "--> [FRONTEND STATUS TRIGGER] Attempting to update Job ID:",
      item.id,
      "to Status:",
      next,
    );

    if (!item.id || item.id === "undefined") {
      console.error(
        "--> [FATAL] Cannot update status: jobId is undefined or invalid!",
      );
      notify("Error: Invalid Job ID. Please publish the job first.", "error");
      return;
    }

    setJobs((current) =>
      current.map((jobItem) =>
        jobItem.id === item.id ? { ...jobItem, status: next } : jobItem,
      ),
    );

    try {
      const response = await api.patch(`/employer/jobs/${item.id}/status`, {
        status: next,
      });

      console.log("--> [BACKEND RESPONSE]:", response.status, response.data);

      if (response?.data?.success === false) {
        throw new Error(response.data.error || "Failed to update job status.");
      }

      const updatedStatus =
        response?.data?.job?.status || response?.data?.status || next;
      setJobs((current) =>
        current.map((jobItem) =>
          jobItem.id === item.id
            ? { ...jobItem, status: updatedStatus }
            : jobItem,
        ),
      );
      notify(`Job ${next}`);
    } catch (requestError) {
      setJobs((current) =>
        current.map((jobItem) =>
          jobItem.id === item.id
            ? { ...jobItem, status: item.status }
            : jobItem,
        ),
      );
      console.error("--> [STATUS ERROR DETAILS]:", requestError);
      const message =
        requestError?.response?.data?.error ||
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Failed to update job status.";

      notify(message, "error");
    }
  };
  const publishJobNow = async (item) => {
    const previousJob = item;
    setJobs((current) =>
      current.map((jobItem) => jobItem.id === item.id
        ? { ...jobItem, status: "active", approval_status: "approved", is_approved: true, is_active: true }
        : jobItem),
    );
    try {
      const response = await api.patch(`/employer/jobs/${encodeURIComponent(String(item.id))}/publish-now`);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || "Failed to publish job.");
      }
      const updatedJob = response?.data?.job || {};
      setJobs((current) =>
        current.map((jobItem) => jobItem.id === item.id
          ? { ...jobItem, ...updatedJob, status: "active", approval_status: "approved", is_approved: true, is_active: true }
          : jobItem),
      );
      notify("Job is now Live & Published!");
    } catch (requestError) {
      setJobs((current) =>
        current.map((jobItem) => jobItem.id === item.id ? previousJob : jobItem),
      );
      const message = requestError?.response?.data?.message
        || requestError?.message
        || "Failed to publish job.";
      notify(message, "error");
    }
  };
  const closeJob = async (item) => {
    const previousStatus = item.status;
    setJobs((current) =>
      current.map((jobItem) =>
        jobItem.id === item.id ? { ...jobItem, status: "closed" } : jobItem,
      ),
    );
    try {
      const response = await api.patch(`/employer/jobs/${item.id}/status`, {
        status: "closed",
      });
      if (response?.data?.success === false) {
        throw new Error(response.data.error || "Failed to close job.");
      }
      notify("Job closed");
    } catch (requestError) {
      setJobs((current) =>
        current.map((jobItem) =>
          jobItem.id === item.id
            ? { ...jobItem, status: previousStatus }
            : jobItem,
        ),
      );
      const message =
        requestError?.response?.data?.error ||
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Failed to close job.";
      notify(message, "error");
    }
  };
  const deleteJob = async (id) => {
    const deletedJob = jobs.find((item) => String(item.id) === String(id));
    setJobs((current) =>
      current.filter((item) => String(item.id) !== String(id)),
    );
    try {
      await api.delete(`/employer/jobs/${id}`);
    } catch (requestError) {
      if (deletedJob) {
        setJobs((current) =>
          current.some((item) => String(item.id) === String(id))
            ? current
            : [...current, deletedJob],
        );
      }
      const message =
        requestError?.response?.data?.error ||
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Failed to delete job.";
      notify(message, "error");
      return;
    }
    notify("Job deleted");
  };
  const editJob = (item) => {
    jobDraftIdRef.current = null;
    setEditingJobId(item.id);
    const department = item.department || item.category || "";
    const jobType = item.job_type || "full-time";
    const workMode = item.work_mode || "hybrid";
    const genderPreference = item.gender_preference || item.genderPreference || "any";
    const requiredEducation = item.required_education || "any";
    setJob({
      title: item.title || "",
      company_name: item.company_name || item.companyName || "",
      department: getEditOptionValue(department, [...jobSectors, "other"]),
      department_other: getEditOptionValue(department, [...jobSectors, "other"]) === "other" ? department : "",
      job_type: getEditOptionValue(jobType, employmentTypeOptions),
      job_type_other: getEditOptionValue(jobType, employmentTypeOptions) === "other" ? jobType : "",
      experience_level: item.experience_level || "",
      work_mode: getEditOptionValue(workMode, workModeOptions),
      work_mode_other: getEditOptionValue(workMode, workModeOptions) === "other" ? workMode : "",
      gender_preference: getEditOptionValue(genderPreference, genderPreferenceOptions),
      location: item.location || "",
      work_address: item.work_address || item.workAddress || "",
      salary_min: item.salary_min || "",
      salary_max: item.salary_max || "",
      salary_type: item.salary_type || ({
        hourly: "Hourly",
        monthly: "Monthly",
        yearly: "Yearly",
      }[String(item.salary_period || "").toLowerCase()] || "Monthly"),
      is_negotiable: Boolean(item.is_negotiable ?? item.is_salary_negotiable),
      min_experience: item.min_experience === null || item.min_experience === undefined ? "" : String(item.min_experience),
      required_education: getEditOptionValue(requiredEducation, educationOptions),
      required_education_other: getEditOptionValue(requiredEducation, educationOptions) === "other" ? requiredEducation : "",
      education_qualification: item.education_qualification || requiredEducation,
      vacancies: String(item.vacancies ?? 1),
      benefits: item.benefits || "",
      currency: item.currency || "ETB",
      application_deadline: item.application_deadline || "",
      required_skills: (item.required_skills || item.tags || []).join
        ? (item.required_skills || item.tags || []).join(", ")
        : item.required_skills || "",
      description: item.description || item.fullDescription || "",
    });
    setSkillInput("");
    setWizard(1);
    setActive("post");
    notify("Job loaded for editing");
  };
  const duplicateJob = (item) => {
    editJob(item);
    jobDraftIdRef.current = null;
    setEditingJobId(null);
    setJob((current) => ({
      ...current,
      title: `Copy of ${item.title || "Untitled job"}`,
    }));
    notify("Job copied to a new draft. Review it before publishing.");
  };
  useEffect(() => {
    const requestedJobId = searchParams.get("edit");
    if (!requestedJobId) {
      openedDeepLinkJobRef.current = "";
      return;
    }
    if (openedDeepLinkJobRef.current === requestedJobId || jobsLoading) return;
    const job = jobs.find((item) => String(item.id) === requestedJobId);
    if (!job) return;
    openedDeepLinkJobRef.current = requestedJobId;
    editJob(job);
  }, [editJob, jobs, jobsLoading, searchParams]);
  const scheduleInterview = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const item = {
      applicationId: selected.id,
      candidateId: selected.candidateId,
      scheduledDate: schedule.date,
      scheduledTime: schedule.time,
      interviewType: schedule.type,
      meetingLink: schedule.link,
      notes: schedule.notes,
    };
    try {
      await api.post("/employer/interviews", item);
      setInterviews((current) => [
        ...current,
        {
          ...item,
          candidate_name: selected.name,
          job_title: selected.jobTitle,
          scheduled_at: `${schedule.date}T${schedule.time}`,
        },
      ]);
      setApplications((current) =>
        current.map((application) =>
          String(application.id) === String(selected.id)
            ? { ...application, status: "interview" }
            : application,
        ),
      );
      setPipeline((current) =>
        current.map((application) =>
          String(application.id) === String(selected.id)
            ? { ...application, status: "interview" }
            : application,
        ),
      );
      setSelected(null);
      setSchedule({ date: "", time: "", type: "video", link: "", notes: "" });
      setShowSchedule(false);
      notify("Interview scheduled");
    } catch (error) {
      notify(
        error?.response?.data?.message || "Unable to schedule interview.",
        "error",
      );
    }
  };
  const hire = (item) => {
    updateApplication(item.id, "hired");
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    notify(`${item.name} marked as hired`);
  };

  const shell = dark
    ? "employer-workspace bg-slate-950 text-slate-100"
    : "employer-workspace bg-[#f7f9fc] text-slate-900";
  const card = dark
    ? "border-slate-800 bg-slate-900"
    : "border-slate-200 bg-white";
  const employeeName = user?.full_name || user?.name || "Employee";
  const formattedToday = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const generatedPersonalCompanyName = user?.full_name
    ? `${String(user.full_name).trim()}'s company`
    : "";
  const normalizeCompanyName = (value) => {
    const name = String(value || "").trim();
    return name && name.toLowerCase() !== generatedPersonalCompanyName.toLowerCase() ? name : "";
  };
  const companyName = normalizeCompanyName(company.company_name || user?.company_name) || "Company";
  const welcomeName = companyName === "Company" ? employeeName : companyName;
  const postWizardHeaders = {
    1: {
      title: "Create a New Job Vacancy",
      subtitle:
        "Define role responsibilities, required qualifications, and competitive compensation to attract top-tier candidates.",
      icon: BriefcaseBusiness,
    },
    2: {
      title: "Review the Candidate Experience",
      subtitle:
        "Check how your vacancy appears to applicants and refine the final messaging before publishing.",
      icon: Search,
    },
    3: {
      title: "Publish and Launch Your Role",
      subtitle:
        "Decide when to post, schedule the launch, or save the role as a draft for your next hiring push.",
      icon: CheckCircle2,
    },
  };

  function normalizeJobStatus(statusValue) {
    const value = String(statusValue || "draft").trim().toLowerCase();
    return value === "published" ? "active" : value;
  }

  const getJobStatusClasses = (statusValue) => {
    const normalized = normalizeJobStatus(statusValue);

    switch (normalized) {
      case "active":
        return "border border-emerald-200 bg-emerald-50 text-emerald-700";
      case "pending":
      case "pending_approval":
        return "border border-amber-200 bg-amber-50 text-amber-700";
      case "paused":
        return "border border-amber-200 bg-amber-50 text-amber-700";
      case "draft":
        return "border border-slate-200 bg-slate-100 text-slate-600";
      case "closed":
      case "expired":
      case "archived":
        return "border border-rose-200 bg-rose-50 text-rose-700";
      default:
        return "border border-slate-200 bg-slate-100 text-slate-600";
    }
  };

  const renderApplications = (items = filtered) => {
    const filteredCandidates = (items || []).filter((item) => {
      if (selectedJobFilter === "all") return true;
      const itemJobId = String(
        item.job_id ?? item.jobId ?? item.job?.id ?? "",
      );
      return itemJobId === String(selectedJobFilter);
    });
    const visibleCandidates =
      active === "overview" && activeMetric === null
        ? filteredCandidates.slice(0, 4)
        : filteredCandidates;
    const metricFilterLabels = {
      ACTIVE_JOBS: "Active Jobs",
      Pending: "Pending",
      HIGH_AI: "High AI Matches (80%+)",
      Shortlisted: "Shortlisted",
      Interview: "Interview",
      Hired: "Hired",
    };

    const getStatusLabel = (statusValue) =>
      getPipelineStatusLabel(statusValue);
    const statusBadgeClasses = {
      pending: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
      review: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
      shortlisted: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      interviewed: "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100",
      hired: "border-green-400 bg-green-100 text-green-800 hover:bg-green-200",
      rejected: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
    };
    const openCandidateMenu = (event, candidate, kind) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const menuHeight = kind === "status" ? 360 : 112;
      const spaceBelow = window.innerHeight - bounds.bottom;
      setOpenApplicationMenu({
        id: String(candidate.id),
        kind,
        top: spaceBelow >= menuHeight + 8
          ? bounds.bottom + 6
          : Math.max(8, bounds.top - menuHeight - 6),
        left: Math.max(8, Math.min(bounds.left, window.innerWidth - (kind === "status" ? 232 : 208) - 8)),
      });
    };

    return (
      <div id="applicants-table-section" className="mb-8 mt-6 scroll-mt-28 overflow-visible rounded-3xl border border-slate-200/90 bg-white shadow-[0_10px_30px_-5px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-100 bg-white px-4 py-6 text-center">
          <h3 className="flex flex-wrap items-center justify-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            <span>Recent Applicants &amp; AI Matches</span>
            <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {filteredCandidates.length}
            </span>
          </h3>
          <p className="mx-auto mt-1.5 max-w-lg text-xs font-normal text-slate-500 sm:text-sm">
              Evaluate incoming resumes, AI compatibility scores, and take quick hiring actions.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {active === "overview" && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                Filter by Job:
                <select
                  value={selectedJobFilter}
                  onChange={(event) => setSelectedJobFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Posted Jobs ({activeJobs.length})</option>
                  {activeJobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </label>
            )}
            {active === "overview" && (
              <button
                onClick={() => navigate("/employer/candidates")}
                className="ml-2 flex items-center gap-1 whitespace-nowrap text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>View all</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>

        {activeFilter !== "ALL" && metricFilterLabels[activeFilter] && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50 px-5 py-3">
            <p className="text-xs font-semibold text-blue-900">
              <span className="mr-2 rounded-full bg-blue-100 px-2 py-1 font-bold text-blue-800">Showing:</span>
              {metricFilterLabels[activeFilter]}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter("ALL");
                setActiveMetric(null);
              }}
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              ✕ Clear filter
            </button>
          </div>
        )}

        {selectedApplicationIds.length > 0 && (
          <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
            <span className="mr-auto text-sm font-bold text-blue-900">
              {selectedApplicationIds.length} {selectedApplicationIds.length === 1 ? "candidate" : "candidates"} selected
            </span>
            <button type="button" disabled={bulkUpdating} onClick={() => runBulkStatusUpdate("review")} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
              Move to In Review
            </button>
            <button type="button" disabled={bulkUpdating} onClick={() => runBulkStatusUpdate("shortlisted")} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
              Shortlist
            </button>
            <button type="button" disabled={bulkUpdating} onClick={() => runBulkStatusUpdate("rejected")} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
              Reject
            </button>
            <button type="button" onClick={() => exportApplicationsCsv(visibleCandidates.filter((item) => selectedApplicationIds.includes(String(item.id))))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Export CSV
            </button>
            <button type="button" onClick={() => setSelectedApplicationIds([])} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-white">
              Clear
            </button>
          </div>
        )}

        <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-y border-blue-100/80 bg-blue-50/80 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    aria-label="Select all visible candidates"
                    checked={visibleCandidates.length > 0 && visibleCandidates.every((item) => selectedApplicationIds.includes(String(item.id)))}
                    onChange={(event) => {
                      const visibleIds = visibleCandidates.map((item) => String(item.id));
                      setSelectedApplicationIds((current) => event.target.checked
                        ? [...new Set([...current, ...visibleIds])]
                        : current.filter((id) => !visibleIds.includes(id)));
                    }}
                    className="h-4 w-4 rounded border-blue-300 bg-white text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Applied Job Role</th>
                <th className="px-6 py-4 text-center">AI Match</th>
                <th className="px-6 py-4">Applied Date</th>
                <th className="px-6 py-4">Hiring Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleCandidates.length > 0 ? (
                visibleCandidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="transition-colors duration-150 hover:bg-blue-50/20"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${candidate.name || "candidate"}`}
                        checked={selectedApplicationIds.includes(String(candidate.id))}
                        onChange={(event) => setSelectedApplicationIds((current) => event.target.checked
                          ? [...new Set([...current, String(candidate.id)])]
                          : current.filter((id) => id !== String(candidate.id)))}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
                          {(candidate.name || "CA")
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase() || "CA"}
                        </div>
                        <div>
                          <button
                            onClick={() => setSelected(candidate)}
                            className="text-left text-xs font-bold text-slate-800 hover:text-blue-700 sm:text-sm"
                          >
                            {candidate.name}
                          </button>
                          <p className="text-[11px] text-slate-400">
                            {candidate.email || candidate.phone || "No contact provided"}
                          </p>
                          {smsSentApplicationIds.has(String(candidate.applicationId || candidate.id)) && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <Check className="h-3 w-3" /> SMS sent
                            </span>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(Array.isArray(candidate.matchedSkills) ? candidate.matchedSkills : []).slice(0, 2).map((skill) => (
                              <span key={skill} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {candidate.jobTitle || "General Application"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${candidate.matchScore >= 85 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : candidate.matchScore >= 70 ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                      >
                        <span>✦</span>
                        <span>{candidate.matchScore}%</span>
                      </span>
                    </td>

                    <td className="px-4 py-4 font-medium text-slate-500">
                      {formatApplicationDate(candidate.appliedDate || candidate.appliedAt || candidate.applied_at || candidate.created_at || candidate.createdAt)}
                    </td>

                    <td className="px-4 py-4">
                      <div
                        className="relative inline-block"
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) {
                            setOpenApplicationMenu(null);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setOpenApplicationMenu(null);
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`Change hiring status for ${candidate.name || "applicant"}`}
                          aria-expanded={openApplicationMenu?.id === String(candidate.id) && openApplicationMenu.kind === "status"}
                          disabled={String(updatingApplicationId) === String(candidate.id)}
                          onClick={(event) => {
                            if (openApplicationMenu?.id === String(candidate.id) && openApplicationMenu.kind === "status") {
                              setOpenApplicationMenu(null);
                            } else {
                              openCandidateMenu(event, candidate, "status");
                            }
                          }}
                          className={`inline-flex items-center justify-between gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${statusBadgeClasses[normalizePipelineStatus(candidate.status)] || "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                        >
                          {getStatusLabel(candidate.status)}
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        {openApplicationMenu?.id === String(candidate.id) && openApplicationMenu.kind === "status" && (
                          <div className="absolute right-0 top-full z-[81] mt-2 max-h-[min(380px,calc(100vh-16px))] w-64 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xl">
                            {applicationStatusOptions.map((option) => {
                              const selectedStatus = normalizePipelineStatus(candidate.status)
                                === (option.value === "interview" ? "interviewed" : option.value);
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  disabled={selectedStatus}
                                  onClick={() => {
                                    setOpenApplicationMenu(null);
                                    handleApplicationStatusSelection(candidate, option.value);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-default"
                                >
                                  <span className={`h-2.5 w-2.5 rounded-full ${option.tone}`} />
                                  <span className="flex-1">{option.label}</span>
                                  {selectedStatus && <Check className="h-4 w-4 text-blue-600" />}
                                </button>
                              );
                            })}
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              type="button"
                              onClick={() => {
                                setOpenApplicationMenu(null);
                                setRejectFeedbackApplication(candidate);
                                setRejectFeedback("");
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                            >
                              <AlertCircle className="h-4 w-4" />Reject with Feedback
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {candidate.resumeUrl ? (
                          <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" title="View submitted CV">
                            <FileText className="h-4 w-4" />View CV
                          </a>
                        ) : (
                          <button type="button" disabled className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-400" title="CV unavailable">
                            <FileText className="h-4 w-4" />View CV
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMessageCandidate(candidate);
                            setInitialMessage("");
                          }}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          <MessageCircle className="h-4 w-4" />Message
                        </button>
                        {normalizePipelineStatus(candidate.status) === "shortlisted" && (
                          <button
                            type="button"
                            onClick={() => {
                              const applicationId = candidate.applicationId || candidate.id;
                              const smsContext = {
                                applicationId,
                                candidateId: candidate.candidateId || candidate.job_seeker_id,
                                name: candidate.name || candidate.candidateName || "Candidate",
                                jobTitle: candidate.jobTitle || "the role",
                                phone: candidate.phone || "",
                              };
                              setSmsCandidate(smsContext);
                              setSmsTemplate("interview");
                              setSmsInterviewAt("");
                              setSmsInterviewMinimum(getLocalDateTimeValue());
                              setSmsMeetingType("in_person");
                              setSmsMeetingLocation("");
                              setSmsValidationErrors({});
                              setSmsHistory([]);
                              setSmsHistoryLoading(true);
                              setSmsMessage(`Hello ${smsContext.name}, interview invitation for ${smsContext.jobTitle}. Please confirm your availability.`);
                              api.get(`/employer/applications/${encodeURIComponent(String(applicationId))}/sms`)
                                .then(({ data }) => setSmsHistory(data.communications || []))
                                .catch((error) => notify(error.response?.data?.message || "Unable to load SMS history.", "error"))
                                .finally(() => setSmsHistoryLoading(false));
                            }}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            <MessageCircle className="h-4 w-4" />{smsSentApplicationIds.has(String(candidate.applicationId || candidate.id)) ? "SMS Sent" : "Send SMS / Invite"}
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`More actions for ${candidate.name || "candidate"}`}
                          aria-expanded={openApplicationMenu?.id === String(candidate.id) && openApplicationMenu.kind === "more"}
                          onClick={(event) => openCandidateMenu(event, candidate, "more")}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />More
                        </button>
                        {openApplicationMenu?.id === String(candidate.id) && openApplicationMenu.kind === "more" && (
                          createPortal(
                          <>
                            <button type="button" aria-label="Close candidate actions" className="fixed inset-0 z-[80] cursor-default" onClick={() => setOpenApplicationMenu(null)} />
                            <div className="fixed z-[81] max-h-[calc(100vh-16px)] w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl" style={{ top: openApplicationMenu.top, left: openApplicationMenu.left }}>
                              <button type="button" onClick={() => { setOpenApplicationMenu(null); setSelected(candidate); }} className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">View candidate profile</button>
                              <button type="button" onClick={() => { setOpenApplicationMenu(null); setRejectFeedbackApplication(candidate); setRejectFeedback(""); }} className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50">Reject with feedback</button>
                            </div>
                          </>,
                          document.body,
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center">
                      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                        <Users className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <p className="text-base font-bold text-slate-900">
                        {applications.length === 0
                          ? "እስካሁን ምንም አመልካቾች የሉም (No applicants yet)"
                          : "No applicants found in this stage"}
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                        Try selecting another pipeline stage from the cards above or adjust your search keywords.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {smsCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !sendingSms) setSmsCandidate(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="sms-modal-title" className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="sms-modal-title" className="text-lg font-black text-slate-900">SMS Dispatch</h2>
                <p className="mt-1 text-sm text-slate-500">Send an SMS to a shortlisted applicant.</p>
              </div>
              <button type="button" onClick={() => setSmsCandidate(null)} disabled={sendingSms} aria-label="Close SMS dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-bold text-slate-900">{smsCandidate.name} <span className="font-normal text-slate-500">· {smsCandidate.jobTitle || "Applicant"}</span></p>
              <p className="mt-1 text-slate-600">Phone: {smsCandidate.phone ? `${String(smsCandidate.phone).slice(0, 5)}***${String(smsCandidate.phone).slice(-4)}` : "Not provided"}</p>
            </div>
            <label className="mt-4 block text-sm font-bold text-slate-700">
              Message template
              <select
                value={smsTemplate}
                onChange={(event) => {
                  const next = event.target.value;
                  setSmsTemplate(next);
                  if (next === "interview") {
                    setSmsMessage(buildInterviewSmsMessage(smsCandidate, smsInterviewAt, smsMeetingType, smsMeetingLocation));
                  } else if (next === "documents") {
                    setSmsMessage(`Hello ${smsCandidate.name}, please send the requested documents for your ${smsCandidate.jobTitle} application.`);
                  } else {
                    setSmsMessage(`Hello ${smsCandidate.name}, there is an update to your ${smsCandidate.jobTitle} application. Please check your account.`);
                  }
                  setSmsValidationErrors({});
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
              >
                <option value="interview">Interview Invitation</option>
                <option value="documents">CV / Document Request</option>
                <option value="status">Application Status Update</option>
              </select>
            </label>
            {smsTemplate === "interview" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
                  Interview date and time
                  <input
                    type="datetime-local"
                    value={smsInterviewAt}
                    min={smsInterviewMinimum}
                    aria-invalid={Boolean(smsValidationErrors.interviewAt)}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSmsInterviewAt(next);
                      setSmsMessage(buildInterviewSmsMessage(smsCandidate, next, smsMeetingType, smsMeetingLocation));
                      setSmsValidationErrors((current) => ({ ...current, interviewAt: "" }));
                    }}
                    className={`mt-2 min-h-11 w-full rounded-xl border px-3 text-sm font-normal ${smsValidationErrors.interviewAt ? "border-rose-500" : "border-slate-200"}`}
                  />
                  {smsValidationErrors.interviewAt && <span className="mt-1 block text-xs font-medium text-rose-600">{smsValidationErrors.interviewAt}</span>}
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Meeting type
                  <select
                    value={smsMeetingType}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSmsMeetingType(next);
                      setSmsMessage(buildInterviewSmsMessage(smsCandidate, smsInterviewAt, next, smsMeetingLocation));
                    }}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
                  >
                    <option value="in_person">In-Person (Office / Bole)</option>
                    <option value="online">Online (Google Meet / Zoom Link)</option>
                  </select>
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  {smsMeetingType === "online" ? "Meeting link" : "Office location"}
                  <input
                    type={smsMeetingType === "online" ? "url" : "text"}
                    value={smsMeetingLocation}
                    maxLength={2000}
                    aria-invalid={Boolean(smsValidationErrors.meetingLocation)}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSmsMeetingLocation(next);
                      setSmsMessage(buildInterviewSmsMessage(smsCandidate, smsInterviewAt, smsMeetingType, next));
                      setSmsValidationErrors((current) => ({ ...current, meetingLocation: "" }));
                    }}
                    placeholder={smsMeetingType === "online" ? "https://meet.google.com/..." : "Office address or Bole"}
                    className={`mt-2 min-h-11 w-full rounded-xl border px-3 text-sm font-normal ${smsValidationErrors.meetingLocation ? "border-rose-500" : "border-slate-200"}`}
                  />
                  {smsValidationErrors.meetingLocation && <span className="mt-1 block text-xs font-medium text-rose-600">{smsValidationErrors.meetingLocation}</span>}
                </label>
              </div>
            )}
            <label className="mt-3 block text-sm font-bold text-slate-700">
              SMS message
              <textarea
                value={smsMessage}
                maxLength={160}
                aria-invalid={Boolean(smsValidationErrors.message)}
                onChange={(event) => {
                  setSmsMessage(event.target.value);
                  setSmsValidationErrors((current) => ({ ...current, message: "" }));
                }}
                rows={4}
                className={`mt-2 w-full resize-y rounded-xl border p-3 text-sm font-normal outline-none focus:border-blue-500 ${smsValidationErrors.message ? "border-rose-500" : "border-slate-200"}`}
              />
              {smsValidationErrors.message && <span className="mt-1 block text-xs font-medium text-rose-600">{smsValidationErrors.message}</span>}
            </label>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{smsMessage.length}/160 characters</span>
              <span>Sandbox delivery is used when SMS credentials are not configured.</span>
            </div>
            <div className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-100 p-3">
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">Communication history</h3>
              {smsHistoryLoading ? (
                <p className="text-xs text-slate-500">Loading history…</p>
              ) : smsHistory.length === 0 ? (
                <p className="text-xs text-slate-500">No SMS history for this application.</p>
              ) : smsHistory.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-700">{item.messageBody}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${String(item.deliveryStatus).toUpperCase() === "DELIVERED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {item.communicationType === "seeker_reply" ? "CANDIDATE RESPONSE" : item.deliveryStatus}
                    </span>
                    <span className="text-[11px] text-slate-500">{item.sentAt ? new Date(item.sentAt).toLocaleString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={sendingSms} onClick={() => setSmsCandidate(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                disabled={sendingSms || !smsCandidate.phone}
                onClick={async () => {
                  const errors = {};
                  if (smsTemplate === "interview") {
                    const interviewTime = new Date(smsInterviewAt).getTime();
                    if (!smsInterviewAt || !Number.isFinite(interviewTime) || interviewTime <= Date.now()) {
                      errors.interviewAt = "Please select a valid future date and time.";
                    }
                    if (!smsMeetingLocation.trim()) {
                      errors.meetingLocation = smsMeetingType === "online"
                        ? "Please provide the meeting link."
                        : "Please provide the office location.";
                    } else if (smsMeetingType === "online") {
                      try {
                        const meetingUrl = new URL(smsMeetingLocation.trim());
                        if (!["http:", "https:"].includes(meetingUrl.protocol)) throw new Error("Invalid meeting URL.");
                      } catch {
                        errors.meetingLocation = "Please provide a valid meeting link.";
                      }
                    }
                  }
                  if (smsMessage.trim().length < 5 || smsMessage.trim().length > 160) {
                    errors.message = "SMS message must be between 5 and 160 characters.";
                  }
                  setSmsValidationErrors(errors);
                  if (Object.keys(errors).length) return;

                  setSendingSms(true);
                  try {
                    const { data } = await api.post(`/employer/applications/${encodeURIComponent(String(smsCandidate.applicationId))}/sms`, {
                      message: smsMessage.trim(),
                      template: smsTemplate,
                      interviewAt: smsTemplate === "interview" ? new Date(smsInterviewAt).toISOString() : undefined,
                      meetingType: smsTemplate === "interview" ? smsMeetingType : undefined,
                      meetingLocation: smsTemplate === "interview" ? smsMeetingLocation.trim() : undefined,
                    });
                    setSmsSentApplicationIds((current) => new Set([...current, String(smsCandidate.applicationId)]));
                    setSmsCandidate(null);
                    const cleanedPhone = String(smsCandidate.phone).replace(/[()\s-]/g, "");
                    const maskedPhone = `${cleanedPhone.slice(0, 4)}-***${cleanedPhone.slice(-4)}`;
                    notify(data.notificationCreated === false
                      ? `SMS dispatched to ${maskedPhone}, but the in-app notification could not be saved.`
                      : `✓ SMS successfully dispatched to ${maskedPhone}!`);
                  } catch (error) {
                    notify(error.response?.data?.message || "Unable to send SMS.", "error");
                  } finally {
                    setSendingSms(false);
                  }
                }}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingSms ? "Sending…" : "Send Real-Time SMS"}
              </button>
            </div>
          </section>
        </div>
      )}
      <div className={`min-h-[calc(100dvh-5rem)] max-w-full ${shell} flex flex-col sm:min-h-[calc(100dvh-6rem)]`}>
        <div className="flex min-w-0 flex-1">
          {!standalonePostJob && (
            <EmployerSidebar
              active={active}
              onSelect={selectStage}
              onReportIssue={() => setPlatformReportOpen(true)}
              onLogout={handleLogout}
              applicationsCount={applications.length}
              unreadMessages={unreadMessageCount}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              stages={stages}
            />
          )}
          <main className={`min-w-0 max-w-full flex-1 bg-[#f8fafc] ${standalonePostJob ? "p-3 sm:p-6 lg:p-10" : "p-3 sm:p-6 lg:p-8"}`}>
            <div className="mx-auto max-w-7xl">
              {active === "overview" ? (
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                        {welcomeName.trim().slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                          Welcome, {welcomeName}
                        </h1>
                        <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{formattedToday}</p>
                      </div>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs font-medium text-slate-500 sm:text-sm">
                      Review AI-matched candidates, track recruitment progress, and connect with top talent seamlessly.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <TelegramConnectCard compact />
                    <button
                      onClick={() => selectStage("post")}
                      className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]"
                    >
                      <span className="text-base font-bold">+</span>
                      <span>Post New Job</span>
                    </button>
                  </div>
                </div>
              ) : active !== "applications" ? (
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                  <div className="flex-1" />
                  <div className="flex flex-wrap items-center gap-2">
                    {active !== "settings" && <TelegramConnectCard compact />}
                    {active !== "post" && (
                      <button
                        onClick={() => selectStage("post")}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20"
                      >
                        <Plus className="h-4 w-4" /> Post New Job
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {active === "overview" && (
                <>

                  <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "ACTIVE JOBS", value: stats.activeJobs, badge: "Active now", filter: "ACTIVE_JOBS", icon: BriefcaseBusiness, color: "text-blue-600", bg: "bg-blue-50", badgeColor: "bg-blue-50 text-blue-700" },
                      { label: "TOTAL APPLICANTS", value: stats.totalApplicants, badge: "All candidates", filter: "ALL", icon: Users, color: "text-blue-600", bg: "bg-blue-50", badgeColor: "bg-blue-50 text-blue-700" },
                      { label: "PENDING (NEW)", value: stats.pending, badge: "Unreviewed", filter: "Pending", icon: Clock3, color: "text-amber-600", bg: "bg-amber-50", badgeColor: "bg-amber-50 text-amber-700" },
                      { label: "IN REVIEW", value: stats.review, badge: "Screening", filter: "InReview", icon: SearchCheck, color: "text-indigo-600", bg: "bg-indigo-50", badgeColor: "bg-indigo-50 text-indigo-700" },
                      { label: "HIGH AI MATCHES (≥80%)", value: stats.highMatch, badge: "Top talent", filter: "HIGH_AI", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50", badgeColor: "bg-purple-50 text-purple-700" },
                      { label: "SHORTLISTED", value: stats.shortlisted, badge: "Candidate pool", filter: "Shortlisted", icon: Star, color: "text-blue-600", bg: "bg-blue-50", badgeColor: "bg-blue-50 text-blue-700" },
                      { label: "INTERVIEWS SCHEDULED", value: stats.interviews, badge: "Upcoming", filter: "Interview", icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50", badgeColor: "bg-emerald-50 text-emerald-700" },
                      { label: "HIRED", value: stats.hired, badge: "Accepted", filter: "Hired", icon: Trophy, color: "text-green-700", bg: "bg-green-100", badgeColor: "bg-green-100 text-green-800" },
                    ].map((stat) => (
                      <button
                        key={stat.label}
                        type="button"
                        aria-pressed={activeMetric === stat.filter}
                        onClick={() => {
                          if (stat.filter === "ACTIVE_JOBS") {
                            setActiveFilter("ALL");
                            setActiveMetric((current) => current === stat.filter ? null : stat.filter);
                            setHighlightActiveJobs(true);
                            document.getElementById("active-jobs-section")?.scrollIntoView({ behavior: "smooth" });
                            return;
                          }
                          const isAlreadyActive = activeMetric === stat.filter;
                          setActiveFilter(isAlreadyActive ? "ALL" : stat.filter);
                          setActiveMetric(isAlreadyActive ? null : stat.filter);
                          setHighlightActiveJobs(false);
                          setStatus("all");
                          document.getElementById("applicants-table-section")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={getMetricCardClassName(activeMetric === stat.filter)}
                      >
                        <div className="flex w-full items-start justify-between gap-3">
                          <span className="text-[11px] font-bold tracking-wider text-slate-500 normal-case">{stat.label}</span>
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metricCardIconClassName} ${stat.bg} ${stat.color}`}>
                            <stat.icon className="h-5 w-5" />
                          </span>
                        </div>
                        <div>
                          <div className="text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</div>
                          <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${stat.badgeColor}`}>{stat.badge}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div id="active-jobs-section" className={`mb-8 scroll-mt-28 rounded-3xl border bg-white p-6 shadow-xs transition-all duration-500 sm:p-7 ${highlightActiveJobs ? "border-blue-300 ring-2 ring-blue-500 shadow-md" : "border-slate-200/80"}`}>
                    <div className="mb-6 text-center">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight text-slate-900">Your Job Postings</h3>
                        <p className="mt-1 text-sm text-slate-500">Track applicant flow, manage active listings, and share public links.</p>
                      </div>
                    </div>

                    {jobs.length > 0 ? (
                      <div className="space-y-6">
                        {jobs.map((job) => {
                          const approvalStatus = getJobApprovalStatus(job);
                          const jobStatus = String(job.status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
                          const isLive = approvalStatus === "approved" && ["active", "published", "open"].includes(jobStatus);
                          const publishableStatuses = ["draft", "pending", "pending_approval", "pending_review", "under_review", "in_review", "review"];
                          const isPublishable = !isLive && approvalStatus !== "rejected" && publishableStatuses.includes(jobStatus);
                          const applicantCount = Number(job.applicantsCount ?? job.applicants_count ?? job.application_count ?? 0);
                          const viewCount = Number(job.view_count ?? 0);
                          const deadline = job.application_deadline || job.deadline;
                          const daysRemaining = deadline
                            ? Math.ceil((new Date(deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
                            : null;
                          const deadlineLabel = daysRemaining === null
                            ? "No expiry date"
                            : daysRemaining < 0
                              ? `Expired ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? "day" : "days"} ago`
                              : `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining`;
                          const salaryLabel = job.is_negotiable || job.is_salary_negotiable
                            ? "Negotiable"
                            : job.salary_min || job.salary_max
                              ? `${job.currency || "ETB"} ${job.salary_min || ""}${job.salary_min && job.salary_max ? " - " : ""}${job.salary_max || ""}`
                              : "Not specified";
                          return (
                          <article key={job.id} className="mb-6 space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:shadow-md sm:p-7">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h4 className="text-xl font-black capitalize tracking-tight text-slate-900 sm:text-2xl">{job.title}</h4>
                                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-slate-500">
                                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                                  <span>{normalizeCompanyName(job.company_name || job.companyName) || companyName}</span>
                                  <span aria-hidden="true">•</span>
                                  <span>{job.sector || job.department || job.category || "General"}</span>
                                  <span aria-hidden="true">•</span>
                                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                                  <span>{job.location || job.city || "Location not specified"}</span>
                                </div>
                              </div>
                              <span className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-sm ${isLive ? "border-emerald-200/60 bg-emerald-50 text-emerald-700" : approvalStatus === "rejected" ? "border-rose-200 bg-rose-50 text-rose-700" : approvalStatus === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                                <span className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-emerald-500" : approvalStatus === "rejected" ? "bg-rose-500" : approvalStatus === "pending" ? "bg-amber-500" : "bg-slate-400"}`} />
                                {isLive ? "Active & Live" : approvalStatus === "rejected" ? "Needs Revision" : approvalStatus === "pending" ? "Pending Admin Review" : "Paused"}
                              </span>
                            </div>
                            {approvalStatus === "pending" && (
                              <p className="-mt-3 text-xs font-medium text-amber-800">
                                Publish this job now to make it live on Explore Jobs.
                              </p>
                            )}
                            {approvalStatus === "rejected" && (
                              <p className="-mt-3 text-xs font-medium text-rose-700">
                                This listing needs revision before it can appear on Explore Jobs.
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{job.job_type || job.jobType || "Work type not specified"}</span>
                              <span className="rounded-lg border border-purple-100 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">{job.work_mode || "Work mode not specified"}</span>
                              <span className="rounded-lg border border-slate-200/60 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{Number(job.vacancies || 1)} Open {Number(job.vacancies || 1) === 1 ? "Position" : "Positions"}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-600">
                                <CircleDollarSign className="h-3.5 w-3.5 text-slate-400" /> Salary: {salaryLabel}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-slate-700">
                                <Users className="h-3.5 w-3.5 text-blue-600" /> <strong>{applicantCount} Applicants</strong>
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-600">
                                <Eye className="h-3.5 w-3.5 text-slate-400" /> {approvalStatus === "approved" ? `${viewCount} Views` : "Views after approval"}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${daysRemaining !== null && daysRemaining < 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200/60 bg-amber-50 text-amber-700"}`}>
                                <Clock3 className="h-3.5 w-3.5" /> {deadlineLabel}
                              </span>
                            </div>

                            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:items-center">
                              {isPublishable ? (
                                <button type="button" onClick={() => publishJobNow(job)} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-500 sm:w-auto">
                                  <Globe2 className="h-4 w-4 shrink-0" /> Publish Now
                                </button>
                              ) : (
                                <button type="button" onClick={() => {
                                  setSelectedJobFilter(String(job.id));
                                  window.requestAnimationFrame(() => document.getElementById("applicants-table-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                                }} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto">
                                  <Users className="h-4 w-4 shrink-0" /> View Applicants ({applicantCount})
                                </button>
                              )}
                              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row sm:flex-wrap sm:justify-end">
                                <button
                                  type="button"
                                  disabled={approvalStatus !== "approved"}
                                  onClick={() => {
                                    const shareUrl = `${window.location.origin}/jobs/${job.id}`;
                                    if (!navigator.clipboard?.writeText) {
                                      notify("Clipboard access is unavailable.", "error");
                                      return;
                                    }
                                    navigator.clipboard.writeText(shareUrl)
                                      .then(() => notify("Job link copied to clipboard."))
                                      .catch(() => notify("Unable to copy the job link.", "error"));
                                  }}
                                  className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                  title={approvalStatus === "approved" ? "Copy Job Link" : "Available after admin approval"}
                                >
                                  <Link2 className="h-3.5 w-3.5" /> Share Link
                                </button>
                                <button type="button" onClick={() => editJob(job)} className={`inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto ${approvalStatus === "rejected" ? "border-rose-200 text-rose-700" : ""}`}>
                                  <Pencil className="h-3.5 w-3.5" /> {approvalStatus === "rejected" ? "Edit & Resubmit" : "Edit Role"}
                                </button>
                                <button type="button" onClick={() => toggleJob(job)} className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 sm:w-auto">
                                  <X className="h-3.5 w-3.5" /> Close Listing
                                </button>
                              </div>
                            </div>
                          </article>
                          );
                        })}
                      </div>
                    ) : (
                                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                                        {jobsLoading ? (
                                          <p className="text-sm text-slate-500">Loading your job postings...</p>
                                        ) : jobsLoadError ? (
                                          <p role="alert" className="text-sm font-medium text-rose-600">{jobsLoadError}</p>
                                        ) : (
                                          <>
                                            <p className="text-sm font-medium text-slate-700">No job postings yet.</p>
                                            <p className="mt-1 text-sm text-slate-500">Post your first role to start building your hiring pipeline.</p>
                                            <button
                                              onClick={() => selectStage("post")}
                                              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                            >
                                              <Plus className="h-4 w-4" /> Post New Role
                                            </button>
                                          </>
                                        )}
                                      </div>
                    )}
                  </div>

                  {renderApplications(filtered)}
                </>
              )}

              {active === "profile" && (
                <CompanyLegal
                  company={company}
                  onSaveSuccess={(payload) => {
                    setCompany((current) => ({ ...current, ...payload }));
                    setActive("overview");
                  }}
                />
              )}
              {active === "post" && (
                <div className="mx-auto w-full max-w-5xl px-0 sm:px-2 lg:px-0">
                  {standalonePostJob && (
                    <button
                      type="button"
                      onClick={() => selectStage("overview")}
                      className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100 lg:-ml-8"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Dashboard
                    </button>
                  )}
                  <div className={`rounded-2xl border p-4 shadow-sm sm:p-6 lg:p-8 ${wizard === 3 ? "lg:min-h-[620px]" : ""} ${card}`}>
                    <div className="mb-8 text-center sm:text-left">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        {postWizardHeaders[wizard]?.title}
                      </h1>
                        <p className="mx-auto mt-1.5 max-w-2xl text-sm font-normal leading-relaxed text-slate-500 sm:mx-0 sm:text-base">
                        {postWizardHeaders[wizard]?.subtitle}
                      </p>
                    </div>
                      <div className="mb-8 flex items-start gap-2 sm:items-center sm:gap-4">
                      {["Job Information", "Live Preview", "Publish"].map(
                        (label, index) => (
                          <div
                            key={label}
                              className={`flex min-w-0 flex-1 flex-col items-center gap-2 text-center text-sm font-medium leading-tight sm:flex-row sm:text-left ${wizard === index + 1 ? "font-semibold text-blue-600" : "text-slate-600"}`}
                          >
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${wizard >= index + 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
                            >
                              {index + 1}
                            </span>
                            <span className="min-w-0">{label}</span>
                          </div>
                        ),
                      )}
                    </div>
                    {wizard === 1 && (
                      <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-6 lg:grid-cols-2">
                        <Field label="Job Title" modern>
                          <input
                            id="title"
                            aria-invalid={Boolean(step1Errors.title)}
                            placeholder="e.g. Senior Frontend Developer, Marketing Specialist..."
                            className={`${inputClass(dark, true)} ${step1Errors.title ? "border-red-500 focus:border-red-600 focus:ring-red-500/10" : ""}`}
                            value={job.title}
                            onChange={(e) => {
                              setJob({ ...job, title: e.target.value });
                              clearStep1Error("title");
                            }}
                          />
                          {step1Errors.title && <p className="mt-1.5 text-xs font-semibold text-red-600">{step1Errors.title}</p>}
                        </Field>
                        <Field label="Company / Organization Name" modern>
                          <input
                            id="company_name"
                            aria-invalid={Boolean(step1Errors.company_name)}
                            placeholder="Enter the company or organization name"
                            className={`${inputClass(dark, true)} ${step1Errors.company_name ? "border-red-500 focus:border-red-600 focus:ring-red-500/10" : ""}`}
                            value={job.company_name}
                            onChange={(event) => {
                              setJob({ ...job, company_name: event.target.value });
                              clearStep1Error("company_name");
                            }}
                          />
                          {step1Errors.company_name && <p className="mt-1.5 text-xs font-semibold text-red-600">{step1Errors.company_name}</p>}
                        </Field>
                        <div className="grid min-w-0 grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                          <Field label="Sector" modern>
                            <SearchableSelect
                              value={job.department}
                              onChange={(department) => {
                                setJob({
                                  ...job,
                                  department,
                                  department_other: department === "other" ? job.department_other : "",
                                });
                              }}
                              options={[...jobSectors, { value: "other", label: "Other" }]}
                              placeholder="Select sector..."
                              searchPlaceholder="Search sector..."
                              className={selectInputClass(dark, true)}
                            />
                            {job.department === "other" && (
                              <input
                                type="text"
                                value={job.department_other}
                                onChange={(event) => setJob({ ...job, department_other: event.target.value })}
                                placeholder="Please specify other..."
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                              />
                            )}
                          </Field>
                        </div>
                        <Field label="Employment Type" modern>
                          <SearchableSelect
                            value={job.job_type}
                            onChange={(job_type) =>
                              setJob({
                                ...job,
                                job_type,
                                job_type_other: job_type === "other" ? job.job_type_other : "",
                              })
                            }
                            options={employmentTypeOptions}
                            placeholder="Select Job Type..."
                            searchable={false}
                            className={selectInputClass(dark, true)}
                          />
                          {job.job_type === "other" && (
                            <input
                              type="text"
                              value={job.job_type_other}
                              onChange={(event) => setJob({ ...job, job_type_other: event.target.value })}
                              placeholder="Please specify other..."
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                            />
                          )}
                        </Field>
                        <Field label="Work Mode" modern>
                          <SearchableSelect
                            value={job.work_mode}
                            onChange={(work_mode) =>
                              setJob({
                                ...job,
                                work_mode,
                                work_mode_other: work_mode === "other" ? job.work_mode_other : "",
                              })
                            }
                            options={workModeOptions}
                            placeholder="Select Work Mode..."
                            searchable={false}
                            className={selectInputClass(dark, true)}
                          />
                          {job.work_mode === "other" && (
                            <input
                              type="text"
                              value={job.work_mode_other}
                              onChange={(event) => setJob({ ...job, work_mode_other: event.target.value })}
                              placeholder="Please specify other..."
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                            />
                          )}
                        </Field>
                        <Field label="Job Location" modern>
                          <input
                            id="location"
                            aria-invalid={Boolean(step1Errors.location)}
                            className={`${inputClass(dark, true)} ${step1Errors.location ? "border-red-500 focus:border-red-600 focus:ring-red-500/10" : ""}`}
                            value={job.location}
                            placeholder="e.g. Addis Ababa, Bole"
                            onChange={(e) => {
                              setJob({ ...job, location: e.target.value });
                              clearStep1Error("location");
                            }}
                          />
                          {step1Errors.location && <p className="mt-1.5 text-xs font-semibold text-red-600">{step1Errors.location}</p>}
                        </Field>
                        <Field label="Work Address (Optional)" modern>
                          <input
                            id="work_address"
                            value={job.work_address}
                            placeholder="Street address, office, or worksite"
                            onChange={(event) => setJob({ ...job, work_address: event.target.value })}
                            className={inputClass(dark, true)}
                          />
                        </Field>
                        <Field label="Gender Preference" modern>
                          <SearchableSelect
                            value={job.gender_preference}
                            onChange={(gender_preference) => setJob({ ...job, gender_preference })}
                            options={genderPreferenceOptions}
                            placeholder="Select Gender Preference..."
                            searchable={false}
                            className={selectInputClass(dark, true)}
                          />
                        </Field>
                        <Field label="Compensation Currency" modern>
                          <SearchableSelect
                            value={job.currency}
                            onChange={(currency) => setJob({ ...job, currency })}
                            options={["ETB", "USD"]}
                            placeholder="Select Currency..."
                            searchable={false}
                            className={selectInputClass(dark, true)}
                          />
                        </Field>
                        <Field label="Salary Type" modern>
                          <select
                            id="salary_type"
                            name="salary_type"
                            required
                            aria-invalid={Boolean(step1Errors.salary_type)}
                            className={`${inputClass(dark, true)} ${step1Errors.salary_type ? "border-red-500 focus:border-red-600 focus:ring-red-500/10" : ""}`}
                            value={job.salary_type}
                            onChange={(event) => {
                              setJob({ ...job, salary_type: event.target.value });
                              clearStep1Error("salary_type");
                            }}
                          >
                            <option value="" disabled>Select salary type</option>
                            <option value="Monthly">Monthly (Per Month)</option>
                            <option value="Yearly">Yearly / Annual (Per Year)</option>
                            <option value="Hourly">Hourly (Per Hour)</option>
                            <option value="Fixed">Fixed / Project-based</option>
                            <option value="Negotiable">Negotiable</option>
                          </select>
                          {step1Errors.salary_type && <p className="mt-1.5 text-xs font-semibold text-red-600">{step1Errors.salary_type}</p>}
                        </Field>
                        <div className="min-w-0 lg:col-span-2">
                          <label
                            htmlFor="salary_min"
                            className="mb-2 block text-[15px] font-semibold text-slate-800"
                          >
                            Salary Range ({job.currency || "ETB"})
                          </label>
                          <div className="flex min-w-0 items-center">
                            <input
                              id="salary_min"
                              type="number"
                              min="0"
                              step="any"
                              aria-label="Minimum salary"
                              aria-invalid={Boolean(salaryError)}
                              className={`${inputClass(dark, true)} min-w-0 ${salaryError ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200" : ""}`}
                              value={job.salary_min}
                              onChange={(e) => {
                                setJob({ ...job, salary_min: e.target.value });
                                setSalaryError("");
                              }}
                              placeholder="Min (e.g. 20,000)"
                            />
                            <span className="self-center px-2 font-medium text-slate-400">
                              to
                            </span>
                            <input
                              id="salary_max"
                              type="number"
                              min="0"
                              step="any"
                              aria-label="Maximum salary"
                              aria-invalid={Boolean(salaryError)}
                              className={`${inputClass(dark, true)} min-w-0 ${salaryError ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200" : ""}`}
                              value={job.salary_max}
                              onChange={(e) => {
                                setJob({ ...job, salary_max: e.target.value });
                                setSalaryError("");
                              }}
                              placeholder="Max (e.g. 35,000)"
                            />
                          </div>
                          {salaryError && (
                            <p className="mt-1.5 text-xs font-medium text-rose-500">
                              {salaryError}
                            </p>
                          )}
                        </div>
                        <label className="lg:col-span-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={job.is_negotiable}
                            onChange={(event) => setJob({ ...job, is_negotiable: event.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                          />
                          <span className="text-sm font-semibold text-slate-800 select-none cursor-pointer">Salary is Negotiable / Attractive</span>
                          {job.is_negotiable && <span className="ml-auto text-xs font-semibold text-slate-500">Salary amounts are optional</span>}
                        </label>
                        <Field label="Minimum Experience" modern>
                          <SearchableSelect
                            value={job.min_experience}
                            onChange={(min_experience) => setJob({ ...job, min_experience })}
                            options={[
                              { value: "0", label: "No Experience (Fresh Graduate)" },
                              { value: "1", label: "1 Year" },
                              { value: "2", label: "2 Years" },
                              { value: "3", label: "3-5 Years" },
                              { value: "5", label: "5-8 Years" },
                              { value: "8", label: "8+ Years" },
                            ]}
                            placeholder="Select Experience..."
                            searchable={false}
                            className={selectInputClass(dark, true)}
                          />
                        </Field>
                        <Field label="Experience Level (Optional)" modern>
                          <SearchableSelect
                            value={job.experience_level}
                            onChange={(experience_level) => setJob({ ...job, experience_level })}
                            options={[
                              { value: "entry-level", label: "Entry-level" },
                              { value: "mid-level", label: "Mid-level" },
                              { value: "senior-level", label: "Senior-level" },
                              { value: "executive", label: "Executive" },
                            ]}
                            placeholder="Select Experience Level..."
                            searchable={false}
                            className={selectInputClass(dark, true)}
                          />
                        </Field>
                        <Field label="Required Education" modern>
                          <SearchableSelect
                            value={job.required_education}
                            onChange={(required_education) =>
                              setJob({
                                ...job,
                                required_education,
                                education_qualification:
                                  required_education === "other"
                                    ? job.required_education_other
                                    : required_education,
                                required_education_other:
                                  required_education === "other" ? job.required_education_other : "",
                              })
                            }
                            options={educationOptions}
                            placeholder="Select Education Level..."
                            searchable={false}
                            className={selectInputClass(dark, true)}
                          />
                          {job.required_education === "other" && (
                            <input
                              type="text"
                              value={job.required_education_other}
                              onChange={(event) => setJob({
                                ...job,
                                required_education_other: event.target.value,
                                education_qualification: event.target.value,
                              })}
                              placeholder="Please specify other..."
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                            />
                          )}
                        </Field>
                        <Field label="Vacancies / Positions" modern>
                          <input
                            id="vacancies"
                            type="number"
                            min="1"
                            step="1"
                            aria-invalid={Boolean(step1Errors.vacancies)}
                            className={`${inputClass(dark, true)} ${step1Errors.vacancies ? "border-red-500 focus:border-red-600 focus:ring-red-500/10" : ""}`}
                            value={job.vacancies}
                            onChange={(event) => {
                              setJob({ ...job, vacancies: event.target.value });
                              if (Number.isInteger(Number(event.target.value)) && Number(event.target.value) >= 1) clearStep1Error("vacancies");
                            }}
                            placeholder="e.g. 1, 3, 5"
                          />
                          {step1Errors.vacancies && <p className="mt-1.5 text-xs font-semibold text-red-600">{step1Errors.vacancies}</p>}
                        </Field>
                        <div className="lg:col-span-2">
                          <Field label="Benefits & Perks (Optional)" modern>
                            <textarea
                              rows="2"
                              value={job.benefits}
                              onChange={(event) => setJob({ ...job, benefits: event.target.value })}
                              placeholder="e.g. Transport Allowance, Health Insurance, Performance Bonus"
                              className={`${inputClass(dark, true)} resize-y leading-relaxed`}
                            />
                          </Field>
                        </div>
                        <Field label="Application Deadline (E.C.)" modern>
                          <div className="relative">
                            <div className="flex min-w-0 gap-2">
                              <input
                                id="application_deadline"
                                type="text"
                                inputMode="numeric"
                                placeholder="Enter DD/MM/YYYY in the Ethiopian calendar (E.C.)"
                                maxLength={10}
                                aria-label="Deadline in Ethiopian calendar, day month year"
                                aria-invalid={Boolean(step1Errors.application_deadline)}
                                className={`${inputClass(dark, true)} min-w-0 flex-1 ${step1Errors.application_deadline ? "border-red-500 focus:border-red-600 focus:ring-red-500/10" : ""}`}
                                value={formatJobDeadline(job.application_deadline)}
                                onChange={(e) => {
                                  setJob({
                                    ...job,
                                    application_deadline: e.target.value,
                                  });
                                  if (normalizeJobDeadline(e.target.value)) clearStep1Error("application_deadline");
                                }}
                              />
                              <button
                                type="button"
                                aria-label="Choose Ethiopian calendar deadline"
                                aria-expanded={deadlineCalendarOpen}
                                onClick={() => {
                                  const selectedDate = normalizeJobDeadline(job.application_deadline);
                                  const referenceDate = selectedDate
                                    ? new Date(`${selectedDate}T12:00:00Z`)
                                    : new Date(`${getAddisAbabaDate()}T12:00:00Z`);
                                  setDeadlineCalendarMonth(getEthiopianDateParts(referenceDate));
                                  setDeadlineCalendarOpen((open) => !open);
                                }}
                                className="flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <CalendarDays className="h-4 w-4" />
                              </button>
                            </div>
                            {deadlineCalendarOpen && (() => {
                              const { year, month } = deadlineCalendarMonth;
                              const monthStart = ethiopianDateToGregorian(year, month, 1);
                              const firstWeekday = new Date(`${monthStart}T00:00:00Z`).getUTCDay();
                              const monthLength = getEthiopianMonthLength(year, month);
                              const selectedDate = normalizeJobDeadline(job.application_deadline);
                              const changeMonth = (amount) => {
                                setDeadlineCalendarMonth((current) => {
                                  const monthIndex = current.month - 1 + amount;
                                  const nextYear = current.year + Math.floor(monthIndex / 13);
                                  return { year: nextYear, month: ((monthIndex % 13) + 13) % 13 + 1, day: 1 };
                                });
                              };
                              return (
                                <div className="absolute left-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                                  <div className="mb-3 flex items-center justify-between gap-2">
                                    <button type="button" onClick={() => changeMonth(-1)} className="rounded-lg px-3 py-1.5 text-lg font-semibold text-slate-600 hover:bg-slate-100" aria-label="Previous Ethiopian month">‹</button>
                                    <p className="text-sm font-bold text-slate-800">{ETHIOPIAN_MONTH_NAMES[month - 1]} {year} E.C.</p>
                                    <button type="button" onClick={() => changeMonth(1)} className="rounded-lg px-3 py-1.5 text-lg font-semibold text-slate-600 hover:bg-slate-100" aria-label="Next Ethiopian month">›</button>
                                  </div>
                                  <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">
                                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((weekday) => <span key={weekday} className="py-1">{weekday}</span>)}
                                  </div>
                                  <div className="grid grid-cols-7 gap-1 text-center">
                                    {Array.from({ length: firstWeekday + monthLength }, (_, index) => {
                                      if (index < firstWeekday) return <span key={`empty-${index}`} />;
                                      const day = index - firstWeekday + 1;
                                      const selectedIsoDate = new Date(Date.parse(`${monthStart}T00:00:00Z`) + (day - 1) * 86400000).toISOString().slice(0, 10);
                                      const isSelected = selectedIsoDate === selectedDate;
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          aria-pressed={isSelected}
                                          onClick={() => {
                                            setJob((current) => ({ ...current, application_deadline: selectedIsoDate }));
                                            clearStep1Error("application_deadline");
                                            setDeadlineCalendarOpen(false);
                                          }}
                                          className={`h-9 rounded-lg text-sm transition ${isSelected ? "bg-[var(--brand-primary)] font-bold text-white" : "text-slate-700 hover:bg-blue-50"}`}
                                        >
                                          {day}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          {step1Errors.application_deadline && <p className="mt-1.5 text-xs font-semibold text-red-600">{step1Errors.application_deadline}</p>}
                        </Field>
                        <div className="lg:col-span-2">
                          <Field label="Required Skills" modern>
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                                  Click to add:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {skillSuggestions.map((skill) => {
                                    const alreadySelected = selectedSkills.some(
                                      (selectedSkill) =>
                                        selectedSkill.toLowerCase() === skill.toLowerCase(),
                                    );
                                    return (
                                      <button
                                        key={skill}
                                        type="button"
                                        disabled={alreadySelected}
                                        onClick={() => addSkills([skill])}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                          alreadySelected
                                            ? "cursor-default border-slate-200 bg-slate-100 text-slate-400"
                                            : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                                        }`}
                                      >
                                        {skill}{alreadySelected ? " Added" : " +"}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              {selectedSkills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {selectedSkills.map((skill) => (
                                    <span
                                      key={skill.toLowerCase()}
                                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                                    >
                                      {skill}
                                      <button
                                        type="button"
                                        onClick={() => removeSkill(skill)}
                                        aria-label={`Remove ${skill}`}
                                        className="rounded-full text-blue-600 hover:text-blue-900"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <input
                                id="required_skills"
                                type="text"
                                aria-invalid={Boolean(step1Errors.required_skills)}
                                className={`${inputClass(dark, true)} ${step1Errors.required_skills ? "border-red-500 focus:border-red-600 focus:ring-red-500/10" : ""}`}
                                value={skillInput}
                                onChange={(event) => handleSkillInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    submitSkillInput();
                                  } else if (event.key === ",") {
                                    event.preventDefault();
                                    submitSkillInput();
                                  }
                                }}
                                placeholder="Type any skill and press Enter (or click suggestions above)..."
                              />
                              {step1Errors.required_skills && <p className="mt-1.5 text-xs font-semibold text-red-600">{step1Errors.required_skills}</p>}
                            </div>
                          </Field>
                        </div>
                        <div className="lg:col-span-2">
                          <Field label="Job Description" modern>
                            <textarea
                              id="description"
                              rows="8"
                              aria-invalid={Boolean(step1Errors.description)}
                              className={`${inputClass(dark, true)} resize-y leading-relaxed ${step1Errors.description ? "border-red-500 focus:border-red-600 focus:ring-red-500/10" : ""}`}
                              value={job.description}
                              onChange={(e) => {
                                setJob({ ...job, description: e.target.value });
                                clearStep1Error("description");
                              }}
                            />
                            {step1Errors.description && <p className="mt-1.5 text-xs font-semibold text-red-600">{step1Errors.description}</p>}
                          </Field>
                        </div>
                      </div>
                    )}
                    {wizard === 2 && (
                      <div className="min-w-0 rounded-2xl border border-slate-200 p-5 sm:p-7">
                        <p className="text-sm font-medium text-blue-600">
                          Candidate preview
                        </p>
                        <h3 className="mt-3 break-words text-xl font-semibold text-slate-900 sm:text-2xl">
                          {job.title || "Your new job title"}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {normalizeCompanyName(job.company_name || job.companyName) || companyName} • {job.location || "Location"} • {job.work_mode}
                        </p>
                        <div className="mt-6 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                          {job.description ||
                            "Your enhanced job description will appear here."}
                        </div>
                      </div>
                    )}
                    {wizard === 3 && (
                      <div className="flex min-h-80 flex-col justify-center py-12">
                        <h3 className="text-center text-2xl font-semibold text-slate-900">
                          Ready to publish?
                        </h3>
                        <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-slate-600">
                          Choose whether this role should be saved as a draft, scheduled for a future launch, or published immediately.
                        </p>

                        <div className="mt-8 flex flex-col justify-center gap-4 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-6">
                          <button
                            disabled={isSubmitting}
                            onClick={() => saveJob("draft")}
                            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            {submittingAction === "draft" ? "Saving..." : "Save as Draft"}
                          </button>
                          <button
                            onClick={() => {
                              resetPublishScheduleForm(true);
                              setShowPublishSchedule(true);
                            }}
                            disabled={loading || isSubmitting}
                            className="w-full rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--brand-primary)]/20 transition-all hover:bg-[var(--brand-primary-hover)] sm:w-auto"
                          >
                            Schedule Post
                          </button>
                          <button
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                            onClick={handlePublish}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-soft)] px-5 py-3 text-sm font-medium text-[var(--brand-deep)] shadow-sm shadow-[var(--brand-primary)]/10 transition-all hover:bg-[var(--brand-soft-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            {submittingAction === "published" ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Publishing...</> : "Publish Job Now"}
                          </button>
                        </div>
                      </div>
                    )}

                    {wizard < 3 && (
                      <div className="mt-5 flex justify-end">
                        <button
                          onClick={wizard === 1 ? handleContinueToPreview : () => setWizard((value) => value + 1)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow sm:w-auto"
                        >
                          Continue <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {active === "jobs" && (
                <EmployerJobsManagement
                  jobs={jobs}
                  applications={applications}
                  normalizeJobStatus={normalizeJobStatus}
                  jobStatusFilter={jobStatusFilter}
                  setJobStatusFilter={setJobStatusFilter}
                  jobSearchQuery={jobSearchQuery}
                  setJobSearchQuery={setJobSearchQuery}
                  editJob={editJob}
                  publishJobNow={publishJobNow}
                  toggleJob={toggleJob}
                  closeJob={closeJob}
                  deleteJob={deleteJob}
                  duplicateJob={duplicateJob}
                  navigate={navigate}
                  notify={notify}
                  jobsLoading={jobsLoading}
                  jobsLoadError={jobsLoadError}
                  onRetry={retryRefreshEmployerJobs}
                />
              )}

              {["applications", "shortlist", "hired"].includes(
                active,
              ) && (
                <div className="min-h-screen space-y-8 bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8">
                  {active === "applications" && (
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                            Talent Pipeline &amp; AI Matches
                          </h1>
                        </div>
                        <p className="mt-1.5 max-w-2xl text-sm font-normal leading-relaxed text-slate-500">
                          Evaluate AI-ranked applicants, manage hiring stages across your pipeline, and fast-track top talent to interviews.
                        </p>
                      </div>
                      {active === "applications" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <TelegramConnectCard compact />
                          <button
                            type="button"
                            onClick={() => selectStage("post")}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                          >
                            <Plus className="h-4 w-4" /> Post New Job
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {applicationPipelineFilters.map((filter) => {
                      const Icon = filter.icon;
                      const selectedFilter = status === filter.value;
                      return (
                        <button
                          key={filter.value}
                          type="button"
                          aria-pressed={selectedFilter}
                          onClick={() => {
                            setStatus(filter.value);
                            setActiveFilter("ALL");
                            setActiveMetric(null);
                            setSelectedApplicationIds([]);
                            document.getElementById("applicants-table-section")?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }}
                          className={getMetricCardClassName(selectedFilter)}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 sm:text-sm">
                              {filter.label}
                            </span>
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${metricCardIconClassName} ${filter.tone}`}>
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          </span>
                          <span className="my-2 block text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                            {pipelineCardCounts[filter.value] || 0}
                          </span>
                          <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${filter.badgeTone}`}>
                            {filter.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs sm:flex-row sm:items-center">
                    <label className="relative min-w-0 flex-1">
                      <span className="sr-only">Search candidates by name, email, or skill keywords</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className={`${inputClass(dark)} border-0 bg-transparent pl-10 shadow-none focus:ring-0`}
                        placeholder="Search candidates by name, email, or skill keywords..."
                        value={search}
                        onChange={(event) => {
                          setSearch(event.target.value);
                          setSelectedApplicationIds([]);
                        }}
                      />
                    </label>
                    <label className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                      <span className="whitespace-nowrap text-xs font-semibold text-slate-500">Filter by Job:</span>
                      <select
                        className="max-w-52 border-0 bg-transparent py-1.5 text-sm font-semibold text-slate-700 outline-none focus:ring-0"
                        value={selectedJobFilter}
                        onChange={(event) => {
                          setSelectedJobFilter(event.target.value);
                          setSelectedApplicationIds([]);
                        }}
                      >
                        <option value="all">All Jobs ({activeJobs.length})</option>
                        {activeJobs.map((jobItem) => (
                          <option key={jobItem.id} value={jobItem.id}>{jobItem.title}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => exportApplicationsCsv(filtered.filter((item) =>
                        selectedJobFilter === "all"
                          || String(item.job_id ?? item.jobId ?? item.job?.id ?? "") === String(selectedJobFilter),
                      ))}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FileText className="h-4 w-4" />Export CSV
                    </button>
                  </div>
                  {active === "matching" && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        ["Skills Match", 45],
                        ["Experience Match", 35],
                        ["Education Match", 20],
                      ].map(([label, weight]) => (
                        <div
                          className={`rounded-2xl border p-4 ${card}`}
                          key={label}
                        >
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-2 text-2xl font-semibold">{weight}%</p>
                          <div className="mt-3 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${weight}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {active === "shortlist" && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                      <h3 className="font-semibold text-blue-900">
                        Shortlist ready for action
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        Move high-signal candidates into interviews or export
                        your shortlist.
                      </p>
                    </div>
                  )}
                  {renderApplications(
                    active === "shortlist"
                      ? filtered.filter((item) => item.status === "shortlisted")
                      : active === "hired"
                        ? filtered.filter((item) => item.status === "hired")
                        : filtered,
                  )}
                </div>
              )}

              {active === "matching" && (
                <AICandidateMatching initialJobId={matchingJobId} />
              )}

              {active === "hired" && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      {
                        label: "Offers sent",
                        value: offers.length,
                        tone: "text-violet-600",
                      },
                      {
                        label: "Onboarding tasks",
                        value: onboarding.length,
                        tone: "text-emerald-600",
                      },
                      {
                        label: "Active hires",
                        value: pipeline.filter(
                          (item) => item.status === "hired",
                        ).length,
                        tone: "text-cyan-600",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={`rounded-2xl border p-5 ${card}`}
                      >
                        <p className="text-xs font-semibold normal-case tracking-[0.2em] text-slate-500">
                          {stat.label}
                        </p>
                        <p className={`mt-3 text-3xl font-semibold ${stat.tone}`}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <section className={`rounded-2xl border p-5 ${card}`}>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-xl font-semibold">Offer pipeline</h3>
                        <span className="text-xs font-bold normal-case tracking-[0.2em] text-slate-400">
                          Live
                        </span>
                      </div>
                      <div className="space-y-3">
                        {offers.length ? (
                          offers.map((offer) => (
                            <div
                              key={offer.id || offer.applicationId}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {offer.candidateName ||
                                      offer.candidateName ||
                                      "Candidate"}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {offer.jobTitle || "Role"} ·{" "}
                                    {offer.offeredSalary
                                      ? `$${offer.offeredSalary}`
                                      : "Salary pending"}
                                  </p>
                                </div>
                                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold normal-case text-violet-700">
                                  {offer.status || "sent"}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    handleFinalizeEmployee(offer.applicationId)
                                  }
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                                >
                                  Finalize hire
                                </button>
                                <button
                                  onClick={() =>
                                    setSelected({
                                      id: offer.applicationId,
                                      name: offer.candidateName,
                                      email: "",
                                      jobTitle: offer.jobTitle,
                                      matchScore: 0,
                                    })
                                  }
                                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                                >
                                  View details
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                            No offers have been sent yet. Candidates from the
                            Applications tab can be moved into the offer stage.
                          </div>
                        )}
                      </div>
                    </section>
                    <section className={`rounded-2xl border p-5 ${card}`}>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-xl font-semibold">
                          Onboarding checklist
                        </h3>
                        <span className="text-xs font-bold normal-case tracking-[0.2em] text-slate-400">
                          {onboarding.filter((task) => task.isCompleted).length}
                          /{onboarding.length || 0}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {onboarding.length ? (
                          onboarding.map((task) => (
                            <label
                              key={task.id}
                              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900">
                                  {task.taskTitle ||
                                    task.title ||
                                    "Onboarding task"}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {task.candidateName || "Candidate"} ·{" "}
                                  {task.jobTitle || "Role"}
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                checked={Boolean(task.isCompleted)}
                                onChange={(event) =>
                                  handleTaskToggle(
                                    task.id,
                                    event.target.checked,
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </label>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                            No onboarding tasks yet. Finalize a candidate to
                            generate the active employee workflow.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              )}
              {active === "interviews" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  {interviews.length ? (
                    interviews.map((item, index) => (
                      <div
                        className={`rounded-2xl border p-5 ${card}`}
                        key={item.id || index}
                      >
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-8 w-8 text-violet-600" />
                          <div>
                            <h3 className="font-semibold">
                              {item.candidate_name || item.candidateName}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {item.job_title} Ã‚Â·{" "}
                              {new Date(item.scheduled_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => notify("Scorecard opened")}
                          className="mt-5 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"
                        >
                          Open Scorecard
                        </button>
                      </div>
                    ))
                  ) : (
                    <div
                      className={`rounded-2xl border p-10 text-center ${card}`}
                    >
                      <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
                      <h3 className="mt-3 font-semibold">
                        No interviews scheduled
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Schedule an interview directly from an application.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {active === "summary" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <TopCandidatesList
                    jobId={matchingJobId}
                    onSelectCandidate={setAiCandidate}
                    onShortlist={(candidate) =>
                      updateApplication(candidate.applicationId, "shortlisted")
                    }
                    onSchedule={(candidate) => {
                      setSelected({
                        ...candidate,
                        id: candidate.applicationId,
                        candidateId: candidate.candidateId,
                      });
                      setShowSchedule(true);
                    }}
                  />
                </div>
              )}
              {active === "talent-pool" && <TalentPool />}
              {active === "messages" && <EmployerMessages />}
              {active === "notifications" && <EmployerNotifications />}
              {active === "settings" && <EmployerSettings />}
              {active === "reviews" && <EmployerReputationCenter companyId={company.id} />}
            </div>
          </main>
        </div>
        <Toast toast={toast} onClose={() => setToast(null)} />
        {platformReportOpen && <UniversalReportModal isOpen reporterRole="employer" targetType="platform" targetId={null} targetTitle="platform issue" currentUser={user} onClose={() => setPlatformReportOpen(false)} />}
        {reportCandidate && <UniversalReportModal isOpen reporterRole="employer" targetType="candidate" targetId={reportCandidate.candidateId} targetTitle={reportCandidate.name || reportCandidate.candidateName || "candidate"} currentUser={user} onClose={() => setReportCandidate(null)} />}
        {selected && (() => {
          const matchDetails = getCandidateMatchDetails(selected);
          const educationEntries = Array.isArray(selected.education) ? selected.education : selected.education ? [selected.education] : [];
          const experienceEntries = Array.isArray(selected.experience) ? selected.experience : selected.experience ? [selected.experience] : [];
          const candidateSkills = Array.isArray(selected.candidateSkills) ? selected.candidateSkills : [];
          const reasoning = selected.aiRecommendation || selected.aiMatchSummary
            || (matchDetails.matchedSkills.length
              ? `${matchDetails.matchedSkills.length} verified candidate skill${matchDetails.matchedSkills.length === 1 ? "" : "s"} match the job requirements. Review the experience and education evidence alongside the skill gaps before making a decision.`
              : "There is not yet enough evaluation data to provide an AI summary.");
          return (
            <div
              className={`fixed inset-0 z-[60] flex justify-end bg-slate-950/55 transition-opacity duration-200 ${candidateDrawerOpen ? "opacity-100" : "opacity-0"}`}
              onMouseDown={(event) => { if (event.target === event.currentTarget) closeCandidateDrawer(); }}
            >
              <aside
                role="dialog"
                aria-modal="true"
                aria-label={`${selected.name || "Candidate"} profile`}
                onClick={(event) => event.stopPropagation()}
                className={`flex h-full w-full max-w-2xl transform flex-col bg-white shadow-2xl transition-transform duration-200 ease-out ${candidateDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
              >
                <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 text-xl font-black text-blue-700">
                      {selected.avatarUrl
                        ? <img src={selected.avatarUrl} alt="" className="h-full w-full object-cover" />
                        : (selected.name || "Candidate").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Candidate profile</p>
                      <h2 className="mt-1 truncate text-2xl font-black text-slate-900">{selected.name || "Candidate"}</h2>
                      <p className="mt-1 text-sm leading-5 text-slate-600">
                        Applied for {selected.jobTitle || "Open role"} <span className="text-slate-400">·</span> {formatApplicationDate(selected.appliedAt || selected.applied_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {selected.resumeUrl && (
                        <a href={selected.resumeUrl} download={selected.resumeFileName || true} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:inline-flex">
                          <Download className="h-4 w-4" />Download CV
                        </a>
                      )}
                      <button type="button" aria-label="Close candidate profile" onClick={closeCandidateDrawer} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{selected.email || "Email not provided"}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{selected.location || "Location not provided"}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{selected.educationLevel || (educationEntries.length ? formatCandidateEntry(educationEntries[0]) : "Education not provided")}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <BriefcaseBusiness className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{selected.experienceLevel || (experienceEntries.length ? formatCandidateEntry(experienceEntries[0]) : "Experience not provided")}</span>
                    </div>
                  </div>
                </header>

                <nav className="flex shrink-0 gap-6 overflow-x-auto border-b border-slate-200 px-5 sm:px-7" role="tablist" aria-label="Candidate profile sections">
                  {[
                    ["overview", "Overview"],
                    ["resume", "Submitted Resume / CV"],
                    ["notes", "Hiring Notes"],
                  ].map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={candidateDrawerTab === key} onClick={() => setCandidateDrawerTab(key)} className={`whitespace-nowrap border-b-2 py-3 text-sm font-semibold transition ${candidateDrawerTab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                      {label}
                    </button>
                  ))}
                </nav>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                  {candidateDrawerTab === "overview" && (
                    <div className="space-y-5">
                      <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall match</p>
                            <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{matchDetails.overall === null ? "Not evaluated" : `${Math.round(matchDetails.overall)}%`}</p>
                            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${matchDetails.overall !== null && matchDetails.overall >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                              {matchDetails.overall === null ? "Score unavailable" : matchDetails.estimatedOverall ? "Evidence-based estimate" : "AI Match"}
                            </span>
                          </div>
                          <Sparkles className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="mt-5 space-y-4">
                          <CandidateScoreProgress label="Skills Match" score={matchDetails.skills} description={`${matchDetails.matchedSkills.length} of ${selected.requiredSkills?.length || 0} verified job skills matched`} />
                          <CandidateScoreProgress label="Experience Match" score={matchDetails.experience} description={selected.experienceLevel || "No experience match score recorded"} />
                          <CandidateScoreProgress label="Job Title Match" score={matchDetails.title} description="Evidence-based overlap between candidate and job titles" />
                          <CandidateScoreProgress label="Education Match" score={matchDetails.education} description={selected.requiredEducation ? `Required: ${selected.requiredEducation}` : "No education match score recorded"} />
                        </div>
                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Match reasoning</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{reasoning}</p>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-bold text-slate-900">Candidate summary</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{selected.headline || selected.candidateSummary || selected.seeker_cover_letter || "No candidate summary has been provided."}</p>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-bold text-slate-900">Verified skills</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {candidateSkills.length
                            ? candidateSkills.map((skill) => {
                              const name = typeof skill === "string" ? skill : skill?.skill_name || skill?.name;
                              if (!name) return null;
                              const matched = matchDetails.matchedSkills.some((item) => item.toLowerCase() === name.toLowerCase());
                              return <span key={name} className={`rounded-full border px-3 py-1 text-xs font-semibold ${matched ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{name}</span>;
                            })
                            : <span className="text-sm text-slate-500">No verified skills available.</span>}
                        </div>
                        {!!selected.missingSkills?.length && (
                          <>
                            <p className="mt-4 text-xs font-bold text-slate-500">Skills to develop</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selected.missingSkills.map((skill) => <span key={skill} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{skill}</span>)}
                            </div>
                          </>
                        )}
                      </section>

                      {[
                        ["Education & Certifications", educationEntries, GraduationCap],
                        ["Work Experience", experienceEntries, BriefcaseBusiness],
                      ].map(([label, entries, Icon]) => (
                        <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Icon className="h-4 w-4 text-blue-600" />{label}</h3>
                          {entries.length ? (
                            <ol className="mt-4 space-y-3 border-l border-slate-200 pl-4">
                              {entries.map((entry, index) => (
                                <li key={`${label}-${index}`} className="relative">
                                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 ring-1 ring-blue-200" />
                                  <p className="text-sm font-semibold text-slate-800">{formatCandidateEntry(entry) || "Details not available"}</p>
                                </li>
                              ))}
                            </ol>
                          ) : <p className="mt-3 text-sm text-slate-500">No {label.toLowerCase()} details available.</p>}
                        </section>
                      ))}
                      {selected.candidateId && <button type="button" onClick={() => setReportCandidate(selected)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"><ShieldAlert className="h-4 w-4" />Report candidate</button>}
                    </div>
                  )}

                  {candidateDrawerTab === "resume" && (
                    selected.resumeUrl ? (
                      <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                          <span className="truncate text-sm font-semibold text-slate-700">{selected.resumeFileName || "Submitted resume"}</span>
                          <a href={selected.resumeUrl} download={selected.resumeFileName || true} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><Download className="h-4 w-4" />Download</a>
                        </div>
                        <iframe title={`${selected.name || "Candidate"} submitted resume`} src={selected.resumeUrl} className="min-h-[480px] flex-1 bg-white" />
                      </div>
                    ) : (
                      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <FileText className="h-10 w-10 text-slate-400" />
                        <h3 className="mt-3 font-bold text-slate-800">Resume unavailable</h3>
                        <p className="mt-1 text-sm text-slate-500">No submitted CV is attached to this application.</p>
                      </div>
                    )
                  )}

                  {candidateDrawerTab === "notes" && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="text-sm font-bold text-slate-900">Private hiring notes</h3>
                      <p className="mt-1 text-sm text-slate-500">Notes are visible only to your employer account and are not shared with the candidate.</p>
                      <textarea value={candidateNotes} onChange={(event) => setCandidateNotes(event.target.value)} rows={12} maxLength={10000} placeholder="Add screening observations, interview feedback, or reminders..." className="mt-4 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-400">{candidateNotes.length}/10,000</span>
                        <button type="button" disabled={savingCandidateNotes} onClick={saveCandidateHiringNotes} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                          <Save className="h-4 w-4" />{savingCandidateNotes ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                    </section>
                  )}
                </div>

                <footer className="sticky bottom-0 z-10 flex shrink-0 flex-wrap gap-2 border-t border-slate-200 bg-white/95 px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:px-7">
                  <button type="button" onClick={shortlistDrawerCandidate} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">
                    <Star className="h-4 w-4" />Shortlist
                  </button>
                  <button type="button" onClick={() => setShowSchedule(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
                    <CalendarDays className="h-4 w-4" />Schedule Interview
                  </button>
                  <button type="button" onClick={() => { setMessageCandidate(selected); setInitialMessage(""); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    <MessageCircle className="h-4 w-4" />Message
                  </button>
                  <button type="button" onClick={() => { setRejectFeedbackApplication(selected); setRejectFeedback(""); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50">
                    <X className="h-4 w-4" />Reject
                  </button>
                </footer>
              </aside>
            </div>
          );
        })()}
        {showSchedule && selected && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
            <form
              onSubmit={scheduleInterview}
              className={`w-full max-w-lg space-y-5 rounded-3xl p-6 shadow-2xl ${card}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Schedule Interview</h2>
                <button type="button" onClick={() => setShowSchedule(false)}>
                  <X />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date">
                  <input
                    required
                    type="date"
                    className={inputClass(dark)}
                    value={schedule.date}
                    onChange={(e) =>
                      setSchedule({ ...schedule, date: e.target.value })
                    }
                  />
                </Field>
                <Field label="Time">
                  <input
                    required
                    type="time"
                    className={inputClass(dark)}
                    value={schedule.time}
                    onChange={(e) =>
                      setSchedule({ ...schedule, time: e.target.value })
                    }
                  />
                </Field>
                <Field label="Meeting Type">
                  <select
                    className={inputClass(dark)}
                    value={schedule.type}
                    onChange={(e) =>
                      setSchedule({ ...schedule, type: e.target.value })
                    }
                  >
                    <option value="video">Video</option>
                    <option value="in-person">In-person</option>
                  </select>
                </Field>
                <Field label="Meeting Link">
                  <input
                    className={inputClass(dark)}
                    value={schedule.link}
                    onChange={(e) =>
                      setSchedule({ ...schedule, link: e.target.value })
                    }
                    placeholder="https://meet.google.com/..."
                  />
                </Field>
              </div>
              <Field label="Agenda Notes">
                <textarea
                  rows="4"
                  className={inputClass(dark)}
                  value={schedule.notes}
                  onChange={(e) =>
                    setSchedule({ ...schedule, notes: e.target.value })
                  }
                />
              </Field>
              <button className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">
                Confirm & Schedule
              </button>
            </form>
          </div>
        )}
        {rejectFeedbackApplication && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4">
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-feedback-title"
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await updateApplication(
                  rejectFeedbackApplication.id,
                  "rejected",
                  rejectFeedback.trim(),
                );
                if (saved) {
                  setRejectFeedbackApplication(null);
                  setRejectFeedback("");
                }
              }}
              className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div>
                <h2 id="reject-feedback-title" className="text-lg font-bold text-slate-900">
                  Reject {rejectFeedbackApplication.name || "candidate"} with feedback
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a concise note that will be included in the candidate's application update.
                </p>
              </div>
              <textarea
                autoFocus
                required
                rows={4}
                value={rejectFeedback}
                onChange={(event) => setRejectFeedback(event.target.value)}
                maxLength={2000}
                placeholder="Share constructive feedback..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setRejectFeedbackApplication(null); setRejectFeedback(""); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={!rejectFeedback.trim() || String(updatingApplicationId) === String(rejectFeedbackApplication.id)} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                  Reject & Notify Candidate
                </button>
              </div>
            </form>
          </div>
        )}
        {messageCandidate && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4">
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="candidate-message-title"
              onSubmit={sendInitialCandidateMessage}
              className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div>
                <h2 id="candidate-message-title" className="text-lg font-bold text-slate-900">
                  Message {messageCandidate.name || "candidate"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Send a private message to start or continue a conversation.</p>
              </div>
              <textarea
                autoFocus
                required
                rows={4}
                maxLength={5000}
                value={initialMessage}
                onChange={(event) => setInitialMessage(event.target.value)}
                placeholder="Write your message..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex justify-end gap-2">
                <button type="button" disabled={sendingInitialMessage} onClick={() => { setMessageCandidate(null); setInitialMessage(""); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={!initialMessage.trim() || sendingInitialMessage} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {sendingInitialMessage ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        )}
        {showPublishSchedule && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              resetPublishScheduleForm(false);
              setShowPublishSchedule(false);
            }
          }}>
            <section role="dialog" aria-modal="true" aria-labelledby="publish-schedule-title" className={`my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-3xl border p-5 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-8 lg:max-w-2xl ${card}`}>
              <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
                <div>
                  <h2 id="publish-schedule-title" className="text-xl font-semibold sm:text-2xl">Schedule Job Publication</h2>
                  <p className="mt-1 text-xs font-semibold text-blue-700">East Africa Time · Addis Ababa (UTC+3)</p>
                </div>
                <button type="button" onClick={() => {
                  resetPublishScheduleForm(false);
                  setShowPublishSchedule(false);
                }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close schedule dialog">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-6 max-w-2xl text-sm leading-6 text-slate-500">Choose when this job should become available to candidates.</p>
              <div className="space-y-5">
                <Field label="Publication date (EAT)">
                  <div className="flex min-w-0 gap-2">
                    <input
                      autoFocus
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={10}
                      placeholder="DD/MM/YYYY"
                      aria-label="Publication date in DD/MM/YYYY format"
                      value={scheduleDateInput}
                      onChange={(event) => {
                        const displayDate = event.target.value;
                        setScheduleDateInput(displayDate);
                        setScheduleDraft((current) => ({ ...current, date: parseScheduleDate(displayDate) }));
                      }}
                      className={`${inputClass(dark)} min-w-0 flex-1`}
                    />
                    <input
                      ref={publishScheduleDatePickerRef}
                      type="date"
                      min={getAddisAbabaDate()}
                      value={scheduleDraft.date}
                      onChange={(event) => {
                        const isoDate = event.target.value;
                        setScheduleDateInput(formatScheduleDate(isoDate));
                        setScheduleDraft((current) => ({ ...current, date: isoDate }));
                      }}
                      className="pointer-events-none absolute h-px w-px opacity-0"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const picker = publishScheduleDatePickerRef.current;
                        try {
                          if (picker?.showPicker) picker.showPicker();
                          else picker?.click();
                        } catch {
                          picker?.click();
                        }
                      }}
                      className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      aria-label="Open calendar picker"
                    >
                      <CalendarDays className="h-4 w-4" />
                      <span className="hidden sm:inline">Calendar</span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Enter DD/MM/YYYY or choose a date from the calendar.</p>
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                  <Field label="Period">
                    <select
                      value={scheduleDraft.period}
                      onChange={(event) => {
                        const period = event.target.value;
                        setScheduleDraft((current) => ({
                          ...current,
                          period,
                          hour: ETHIOPIAN_TIME_PERIODS[period].hours.includes(Number(current.hour))
                            ? current.hour
                            : String(ETHIOPIAN_TIME_PERIODS[period].hours[0]),
                        }));
                      }}
                      className={inputClass(dark)}
                    >
                      {Object.entries(ETHIOPIAN_TIME_PERIODS).map(([value, option]) => (
                        <option key={value} value={value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Hour">
                    <select
                      value={scheduleDraft.hour}
                      onChange={(event) => setScheduleDraft((current) => ({ ...current, hour: event.target.value }))}
                      className={inputClass(dark)}
                    >
                      {ETHIOPIAN_TIME_PERIODS[scheduleDraft.period].hours.map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Minute">
                    <select
                      value={scheduleDraft.minute}
                      onChange={(event) => setScheduleDraft((current) => ({ ...current, minute: event.target.value }))}
                      className={inputClass(dark)}
                    >
                      {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")).map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-800" aria-live="polite">
                  <Clock3 className="h-4 w-4 shrink-0" />
                  <span>{scheduleDraft.hour}:{scheduleDraft.minute} {ETHIOPIAN_TIME_PERIODS[scheduleDraft.period].label} (EAT {getEthiopianScheduleTime(scheduleDraft).preview} / UTC+3)</span>
                </div>
              </div>
              {publishScheduleError && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{publishScheduleError}</p>}
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end sm:gap-3">
                <button type="button" onClick={() => {
                  resetPublishScheduleForm(false);
                  setShowPublishSchedule(false);
                }} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="button" onClick={handleConfirmPublishSchedule} disabled={loading} className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Scheduling..." : "Confirm & Schedule"}</button>
              </div>
            </section>
          </div>
        )}
      </div>
      {globalSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 pt-24" role="dialog" aria-modal="true" aria-label="Search workspace">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 p-4">
              <Search className="h-5 w-5 text-slate-400" />
              <input autoFocus value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} onKeyDown={(event) => event.key === "Escape" && setGlobalSearchOpen(false)} placeholder="Search employees, jobs, skills..." className="min-w-0 flex-1 text-sm font-semibold text-slate-800 outline-none" />
              <button type="button" onClick={() => setGlobalSearchOpen(false)} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="max-h-96 overflow-y-auto p-3">
              {!globalQuery.trim() && <p className="p-6 text-center text-sm text-slate-500">Search your employees, jobs, and application records.</p>}
              {globalQuery.trim() && !globalSearchResults.length && <p className="p-6 text-center text-sm text-slate-500">No employees or jobs found.</p>}
              {globalSearchResults.map((result, index) => <button type="button" key={`${result.type}-${result.title}-${index}`} onClick={result.action} className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-blue-50"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold normal-case tracking-wide text-slate-500">{result.type}</span><span><span className="block text-sm font-bold text-slate-800">{result.title}</span><span className="mt-0.5 block text-xs text-slate-500">{result.detail}</span></span></button>)}
            </div>
          </div>
        </div>
      )}
      {logoutOpen && (
        <LogoutFlowModals
          user={logoutSession?.user}
          token={logoutSession?.token}
          logout={logout}
          setSession={setSession}
          navigate={(path, options) => navigate(path === "/login" ? "/" : path, options)}
          onClose={() => setLogoutOpen(false)}
        />
      )}
    </>
  );
}
