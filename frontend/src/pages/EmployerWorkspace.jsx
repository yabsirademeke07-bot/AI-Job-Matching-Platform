import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
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
  FileText,
  Globe2,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Moon,
  PauseCircle,
  Plus,
  Search,
  ShieldAlert,
  Settings,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  PIPELINE_STATUS_OPTIONS,
  getPipelineStatusClasses,
  getPipelineStatusLabel,
  normalizePipelineStatus,
} from "../utils/pipelineStatus";
import CompanyReviews from "../components/company/CompanyReviews";
import CompanyQA from "../components/company/CompanyQA";
import UniversalReportModal from "../components/UniversalReportModal";
import TalentPool from "../components/employer/TalentPool";
import TopCandidatesList from "../components/employer/TopCandidatesList";
import AICandidateMatching from "../components/employer/AICandidateMatching";
import DashboardMetricCards from "../components/employer/DashboardMetricCards";
import ApplicationsTable from "../components/employer/ApplicationsTable";
import EmployerSidebar from "../components/employer/EmployerSidebar";
import {
  EmployerMessages,
  EmployerNotifications,
  EmployerSettings,
} from "../components/employer/EmployerEngagementViews";
import CompanyLegal from "../components/employer/CompanyLegal";
import LogoutFlowModals from "../components/LogoutFlowModals";
import { EmployerHeader } from "../components/layout/EmployerHeader";
import SearchableSelect from "../components/ui/SearchableSelect";

const stages = [
  ["overview", "Dashboard", LayoutDashboard],
  ["profile", "Company & Legal", Building2],
  ["post", "Post Job", Plus],
  ["jobs", "My Jobs", BriefcaseBusiness],
  ["applications", "Applications", ClipboardList],
  ["matching", "AI Matching", Target],
  ["shortlist", "Shortlist", Star],
  ["interviews", "Interviews", CalendarDays],
  ["hired", "Hire & Onboarding", UserCheck],
  ["talent-pool", "Talent Pool / General Applicants", Users],
  ["reviews", "Reviews Management", MessageCircle],
  ["messages", "Messages", MessageCircle],
  ["notifications", "Notifications", Bell],
  ["settings", "Settings", Settings],
  ["summary", "AI Candidate Summary", Sparkles],
];

const getJobApprovalStatus = (job) => {
  const approvalStatus = String(job.approval_status || job.approvalStatus || "").toLowerCase();
  if (["pending", "approved", "rejected"].includes(approvalStatus)) return approvalStatus;
  if (String(job.status || "").toLowerCase() === "rejected") return "rejected";
  return job.is_approved === true || job.is_approved === 1 ? "approved" : "pending";
};

const jobSectors = [
  "Agriculture",
  "Architecture & Urban Planning",
  "Beauty & Grooming",
  "Brokerage & Case Closing",
  "Chemical & Biomedical Engineering",
  "Construction & Civil Engineering",
  "Creative Art & Design",
  "Customer Service & Care",
  "Documentation & Writing",
  "Event Management & Organization",
  "Food & Drink Preparation / Service",
  "Healthcare",
  "Hospitality & Tourism",
  "Human Resource & Talent Management",
  "Information Technology",
  "Installation & Maintenance",
  "Janitorial & Office Services",
  "Labor & Masonry",
  "Logistics & Supply Chain",
  "Mechanical & Electrical Engineering",
  "Multimedia Content Production",
  "Pharmaceutical",
  "Psychiatry, Psychology & Social Work",
  "Sales & Promotion",
  "Secretarial & Office Management",
  "Security & Safety",
  "Retail & Office Support",
  "Software Design & Development",
  "Transportation & Delivery",
  "Veterinary",
  "Woodwork & Carpentry",
  "Fashion / Clothing & Textile",
  "Media & Entertainment",
  "Environmental, Mining & Energy Engineering",
  "Law & Legal Advocacy",
  "Marketing",
  "Journalism & Communication",
  "Business Administration & Operations",
  "Research Services",
  "Data Science & Analytics",
  "Teaching & Education",
  "Tutoring, Training & Mentorship",
  "Gardening & Landscaping",
  "Horticulture",
  "Livestock & Animal Husbandry",
  "Manufacturing & Production",
  "Purchasing & Procurement",
  "Translation & Transcription",
  "Accounting & Finance",
  "Advisory & Consultancy",
  "Aeronautics & Aerospace",
];

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

const UNIVERSAL_SKILL_SUGGESTIONS = [
  "Communication",
  "Problem Solving",
  "Teamwork",
  "Time Management",
  "Leadership",
];

const SECTOR_SKILLS_MAP = {
  Agriculture: ["Crop Management", "Soil Fertility", "Irrigation Systems", "Pest Control", "Agribusiness"],
  "Architecture & Urban Planning": ["AutoCAD", "Revit", "3D Rendering", "Urban Zoning", "Blueprint Drafting"],
  "Beauty & Grooming": ["Hair Styling", "Skincare Treatments", "Cosmetology", "Sanitation & Hygiene", "Client Consultation"],
  "Brokerage & Case Closing": ["Deal Negotiation", "Property Valuation", "Contract Closing", "Client Advisory", "Market Analysis"],
  "Chemical & Biomedical Engineering": ["Process Engineering", "Laboratory Diagnostics", "Quality Control", "Biomedical Equipment", "Chemical Safety"],
  "Construction & Civil Engineering": ["Site Supervision", "Structural Analysis", "AutoCAD Civil", "Quantity Surveying", "Project Scheduling"],
  "Creative Art & Design": ["Graphic Design", "Adobe Photoshop & Illustrator", "Branding", "UI/UX Design", "Visual Arts"],
  "Customer Service & Care": ["Customer Relations", "Conflict Resolution", "CRM Software", "Help Desk Support", "Active Listening"],
  "Documentation & Writing": ["Technical Writing", "Content Creation", "Editing & Proofreading", "Report Preparation", "Document Archiving"],
  "Event Management & Organization": ["Event Planning", "Vendor Coordination", "Budget Management", "Event Logistics", "Guest Hospitality"],
  "Food & Drink Preparation / Service": ["Culinary Preparation", "Food Safety (HACCP)", "Menu Planning", "Barista & Beverage", "Kitchen Management"],
  Healthcare: ["Patient Care", "Clinical Diagnosis", "Vital Signs Monitoring", "Emergency Care", "Medical Records"],
  "Hospitality & Tourism": ["Front Desk Operations", "Guest Relations", "Hotel Management", "Tour Guiding", "Reservation Systems"],
  "Human Resource & Talent Management": ["Talent Acquisition", "Employee Relations", "Payroll Processing", "Labor Law Compliance", "Performance Management"],
  "Information Technology": ["Network Administration", "System Maintenance", "Cybersecurity", "IT Support", "Cloud Services"],
  "Installation & Maintenance": ["Preventive Maintenance", "Troubleshooting", "Electrical Wiring", "Equipment Repair", "Safety Protocols"],
  "Janitorial & Office Services": ["Facility Sanitization", "Cleaning Supplies Safety", "Waste Management", "Inventory Restocking", "Building Care"],
  "Labor & Masonry": ["Bricklaying", "Concrete Mixing", "Plastering", "Scaffolding", "Physical Safety"],
  "Logistics & Supply Chain": ["Inventory Management", "Warehouse Operations", "Freight Coordination", "Customs Clearance", "Route Planning"],
  "Mechanical & Electrical Engineering": ["Circuit Design", "PLC Programming", "HVAC Maintenance", "Machine Overhaul", "AutoCAD Electrical"],
  "Multimedia Content Production": ["Video Editing", "Adobe Premiere & After Effects", "Motion Graphics", "Audio Engineering", "Camera Operations"],
  Pharmaceutical: ["Prescription Dispensing", "Pharmacology", "Drug Safety", "Inventory Auditing", "Patient Counseling"],
  "Psychiatry, Psychology & Social Work": ["Mental Health Counseling", "Psychological Assessment", "Crisis Intervention", "Case Management", "Community Advocacy"],
  "Sales & Promotion": ["Direct Sales", "Client Prospecting", "Deal Negotiation", "Sales Pipeline Management", "Product Pitching"],
  "Secretarial & Office Management": ["Office Administration", "Calendar Management", "Executive Assistance", "Correspondence Drafting", "Filing Systems"],
  "Security & Safety": ["Surveillance Operations", "Access Control", "Risk Assessment", "Emergency Response", "Physical Security"],
  "Retail & Office Support": ["POS Operations", "Shelf Merchandising", "Customer Assistance", "Cash Handling", "Stock Replenishment"],
  "Software Design & Development": ["React / Frontend", "Node.js / Backend", "Python", "SQL & Databases", "API Integration", "Git"],
  "Transportation & Delivery": ["Commercial Driving", "Fleet Management", "Navigation & GPS", "Cargo Handling", "Vehicle Safety Inspection"],
  Veterinary: ["Animal Health & Diagnosis", "Vaccination", "Surgical Assistance", "Animal Welfare", "Veterinary Pharmacology"],
  "Woodwork & Carpentry": ["Joinery", "Cabinet Making", "Power Tool Handling", "Blueprint Reading", "Wood Finishing"],
  "Fashion / Clothing & Textile": ["Pattern Making", "Garment Construction", "Fabric Sourcing", "Fashion Illustration", "Quality Inspection"],
  "Media & Entertainment": ["Broadcasting", "Audio/Visual Production", "Scriptwriting", "Public Relations", "Stage Management"],
  "Environmental, Mining & Energy Engineering": ["EIA Assessment", "Geological Surveying", "Renewable Energy", "Mine Safety", "Waste Treatment"],
  "Law & Legal Advocacy": ["Legal Research", "Contract Drafting", "Litigation Support", "Corporate Compliance", "Court Procedures"],
  Marketing: ["Digital Marketing", "SEO / SEM", "Brand Strategy", "Market Research", "Social Media Campaigns"],
  "Journalism & Communication": ["Investigative Reporting", "News Writing", "Media Ethics", "Interviewing", "Press Releases"],
  "Business Administration & Operations": ["Operations Management", "Strategic Planning", "Process Optimization", "KPI Tracking", "Budget Supervision"],
  "Research Services": ["Quantitative & Qualitative Analysis", "Data Collection", "SPSS / R Analysis", "Field Surveys", "Report Compilation"],
  "Data Science & Analytics": ["Python / R", "SQL Data Extraction", "Power BI / Tableau", "Machine Learning", "Statistical Modeling"],
  "Teaching & Education": ["Curriculum Development", "Classroom Management", "Lesson Planning", "Student Assessment", "Pedagogical Techniques"],
  "Tutoring, Training & Mentorship": ["One-on-One Instruction", "Capacity Building", "Workshop Facilitation", "Progress Tracking", "Adaptive Teaching"],
  "Gardening & Landscaping": ["Landscape Design", "Lawn Maintenance", "Plant Propagation", "Pruning & Irrigation", "Soil Conditioning"],
  Horticulture: ["Greenhouse Management", "Crop Cultivation", "Floriculture", "Plant Pathology", "Post-Harvest Handling"],
  "Livestock & Animal Husbandry": ["Dairy & Poultry Management", "Animal Nutrition", "Breeding Techniques", "Disease Prevention", "Farm Operations"],
  "Manufacturing & Production": ["Assembly Line Oversight", "Lean Manufacturing", "Quality Assurance (QA)", "Machinery Operation", "Safety Standards"],
  "Purchasing & Procurement": ["Vendor Evaluation", "Purchase Order Management", "Price Negotiation", "Contract Sourcing", "Supply Cost Optimization"],
  "Translation & Transcription": ["English-Amharic Translation", "Audio Transcription", "Localization", "Proofreading", "Cross-Cultural Communication"],
  "Accounting & Finance": ["IFRS Standards", "Peachtree / QuickBooks", "Financial Statement Analysis", "Tax Auditing & Declaration", "Budgeting"],
  "Advisory & Consultancy": ["Management Consulting", "Risk Analysis", "Feasibility Studies", "Policy Advisory", "Organizational Assessment"],
  "Aeronautics & Aerospace": ["Avionics Systems", "Aircraft Maintenance", "Flight Regulations", "Aerodynamics Analysis", "Safety Protocols"],
};

const parseSkills = (value) =>
  (Array.isArray(value) ? value : String(value || "").split(","))
    .map((skill) => String(skill).trim())
    .filter(Boolean);

const blankJob = {
  title: "",
  department: "",
  department_other: "",
  job_type: "",
  job_type_other: "",
  work_mode: "",
  work_mode_other: "",
  gender_preference: "",
  location: "",
  salary_min: "",
  salary_max: "",
  is_negotiable: false,
  min_experience: "",
  required_education: "",
  required_education_other: "",
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

async function fetchEmployerApplications(ownedJobs) {
  const applicationGroups = await Promise.all(
    ownedJobs.map((item) =>
      api
        .get(`/employer/jobs/${item.id}/applications`)
        .then((response) => response.data.applicants || []),
    ),
  );
  return applicationGroups.flat().map((item) => ({
    ...item,
    id: item.application_id || item.applicationId,
    candidateId: item.candidateId || item.job_seeker_id,
    name: item.candidateName || item.full_name || item.name,
    email: item.email,
    phone: item.phone,
    location: item.candidateLocation || item.candidate_location,
    jobTitle:
      ownedJobs.find((jobItem) => String(jobItem.id) === String(item.job_id))
        ?.title || item.jobTitle,
    matchScore: Number(item.aiMatchScore ?? item.ai_match_score ?? 0),
    matchedSkills: item.matchedSkills || [],
    missingSkills: item.missingSkills || [],
    status: item.status,
  }));
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
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
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
  const [wizard, setWizard] = useState(1);
  const [selected, setSelected] = useState(null);
  const [reportCandidate, setReportCandidate] = useState(null);
  const [platformReportOpen, setPlatformReportOpen] = useState(false);
  const [aiCandidate, setAiCandidate] = useState(null);
  const [matchingJobId, setMatchingJobId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [activeMetric, setActiveMetric] = useState(null);
  const [highlightActiveJobs, setHighlightActiveJobs] = useState(false);
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [dark, setDark] = useState(false);
  const toastTimeoutRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    const intervalId = window.setInterval(loadUnreadNotifications, 30000);
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
  }, [applications, globalQuery, jobs]);
  const handleLogout = () => {
    setLogoutSession({ token, user });
    setLogoutOpen(true);
  };

  const handleHeaderLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    logout();
    navigate("/", { replace: true });
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
    if (!String(job.location || "").trim()) errors.location = "Location is required";
    if (!String(job.application_deadline || "").trim()) errors.application_deadline = "Application deadline is required";
    else if (!normalizeJobDeadline(job.application_deadline)) errors.application_deadline = "Enter a valid date in DD/MM/YYYY format.";
    if (!String(job.required_skills || "").trim()) errors.required_skills = "Please enter at least one required skill";
    if (!String(job.description || "").trim()) errors.description = "Job description is required";
    if (!Number.isInteger(Number(job.vacancies)) || Number(job.vacancies) < 1) errors.vacancies = "Enter at least 1 vacancy.";
    if (salaryValidationErrors.minimum) errors.salary_min = salaryValidationErrors.minimum;
    if (salaryValidationErrors.maximum) errors.salary_max = salaryValidationErrors.maximum;
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
    const firstInvalidField = ["title", "location", "application_deadline", "required_skills", "description", "salary_min", "salary_max", "vacancies"]
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
    const handleScheduleClick = (event) => {
      const buttonLabel = event.target.closest("button")?.textContent?.trim();
      if (
        buttonLabel === "Save as Draft" ||
        buttonLabel === "Publish Job Now"
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!loading && validateJob())
          saveJob(buttonLabel === "Publish Job Now" ? "published" : "draft");
      }
    };
    document.addEventListener("click", handleScheduleClick, true);
    return () =>
      document.removeEventListener("click", handleScheduleClick, true);
  });
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
        const latestJobs = response?.data?.jobs ?? response?.data;
        if (!Array.isArray(latestJobs)) {
          throw new Error("Employer jobs response was not a list.");
        }
        if (!mounted) return;
        setJobsLoadError("");
        setJobs(latestJobs);
        setJobsLoading(false);
        if (latestJobs.length) {
          setMatchingJobId((current) => current || String(latestJobs[0].id));
        }
        try {
          setApplications(await fetchEmployerApplications(latestJobs));
        } catch (error) {
          console.error("Unable to load applications for employer jobs:", error);
        }
        try {
          const { data } = await api.get("/employer/talent-pool/shortlist");
          if (mounted) setShortlistedCandidates(data?.candidates || []);
        } catch (error) {
          console.error("Unable to load employer shortlist:", error);
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
    window.addEventListener("employer-talent-pool:updated", refreshJobs);
    const intervalId = window.setInterval(refreshJobs, 10000);
    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshJobs);
      window.removeEventListener("employer-talent-pool:updated", refreshJobs);
      window.clearInterval(intervalId);
    };
  }, [token]);
  const activeJobs = useMemo(
    () =>
      jobs.filter((job) =>
        ["published", "active"].includes(String(job.status || "").toLowerCase()),
      ),
    [jobs],
  );
  const publishedJobs = useMemo(
    () =>
      jobs.filter((job) =>
        ["active", "published", "pending", "pending_approval", "rejected"].includes(
          normalizeJobStatus(job.status),
        ),
      ),
    [jobs],
  );
  const scheduledJobs = useMemo(
    () =>
      jobs.filter(
        (job) => normalizeJobStatus(job.status) === "scheduled",
      ),
    [jobs],
  );
  const draftJobs = useMemo(
    () =>
      jobs.filter(
        (job) => normalizeJobStatus(job.status) === "draft",
      ),
    [jobs],
  );
  useEffect(() => {
    if (
      selectedJobFilter !== "all" &&
      !activeJobs.some(
        (job) => String(job.id) === String(selectedJobFilter),
      )
    ) {
      setSelectedJobFilter("all");
    }
  }, [activeJobs, selectedJobFilter]);
  const talentPoolShortlistRows = useMemo(() => {
    const applicationShortlistIds = new Set(
      applications
        .filter((item) => normalizePipelineStatus(item.status) === "shortlisted")
        .map((item) => String(item.candidateId || item.job_seeker_id || "")),
    );
    return shortlistedCandidates
      .filter((candidate) => !applicationShortlistIds.has(String(candidate.candidateId)))
      .map((candidate) => ({
        ...candidate,
        id: `talent-pool-${candidate.candidateId}`,
        name: candidate.fullName || candidate.candidateName || "Candidate",
        candidateId: candidate.candidateId,
        jobTitle: "Talent Pool",
        status: "shortlisted",
        matchScore: Number(candidate.aiMatchScore || 0),
        appliedDate: candidate.savedAt,
        isTalentPoolShortlist: true,
      }));
  }, [applications, shortlistedCandidates]);
  const filtered = useMemo(() => {
    const rows = activeFilter === "ALL" || activeFilter === "Shortlisted"
      ? [...applications, ...talentPoolShortlistRows]
      : applications;
    return rows.filter(
        (item) =>
          (!search ||
            `${item.name} ${item.jobTitle}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (status === "all" || normalizePipelineStatus(item.status) === status) &&
          (activeFilter === "ALL" ||
            (activeFilter === "HIGH_AI" && getApplicantMatchScore(item) >= 80) ||
            (activeFilter === "ACTIVE_JOBS" &&
              activeJobs.some((jobItem) => String(jobItem.id) === String(item.job_id ?? item.jobId))) ||
            (activeFilter === "Pending" && normalizePipelineStatus(item.status) === "pending") ||
            (activeFilter === "Shortlisted" && normalizePipelineStatus(item.status) === "shortlisted") ||
            (activeFilter === "Interview" && normalizePipelineStatus(item.status) === "interviewed") ||
            (activeFilter === "Hired" && normalizePipelineStatus(item.status) === "hired")) &&
          Number(item.matchScore || 0) >= minScore,
      );
  }, [applications, jobs, activeJobs, search, status, activeFilter, minScore, talentPoolShortlistRows]);
  const shortlistedCandidateIds = new Set([
    ...applications
      .filter((item) => normalizePipelineStatus(item.status) === "shortlisted")
      .map((item) => String(item.candidateId || item.job_seeker_id || item.id)),
    ...shortlistedCandidates.map((candidate) => String(candidate.candidateId)),
  ]);
  const stats = {
    active: activeJobs.length,
    applicants: applications.length,
    high: applications.filter((item) => getApplicantMatchScore(item) >= 80).length,
    pending: applications.filter(
      (item) => normalizePipelineStatus(item.status) === "pending",
    ).length,
    shortlisted: shortlistedCandidateIds.size,
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
  const updateApplication = async (id, nextStatus) => {
    const normalizedStatus = normalizePipelineStatus(nextStatus);
    const previousApplication = applications.find(
      (item) => String(item.id) === String(id),
    );
    if (!previousApplication) return;

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
    try {
      await api.patch(`/employer/applications/${id}/status`, {
        status: normalizedStatus,
      });
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
      return;
    } finally {
      setUpdatingApplicationId(null);
    }
    notify(`Candidate moved to ${getPipelineStatusLabel(normalizedStatus)}`);
  };
  const handleApplicationStatusSelection = (candidate, nextStatus) => {
    if (nextStatus === "interviewed") {
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
  const handleSendOffer = async (
    application,
    offeredSalary = application.offeredSalary || "75000",
  ) => {
    try {
      await api.post("/employer/offers", {
        applicationId: application.id,
        candidateId:
          application.candidateId ||
          application.job_seeker_id ||
          application.candidate_id,
        offeredSalary: Number(offeredSalary) || null,
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
    const latestJobs = response?.data?.jobs ?? response?.data;
    if (!Array.isArray(latestJobs)) {
      throw new Error("Employer jobs response was not a list.");
    }
    setJobsLoadError("");
    setJobs(latestJobs);
    if (latestJobs.length) {
      setMatchingJobId((current) => current || String(latestJobs[0].id));
    }
    try {
      setApplications(await fetchEmployerApplications(latestJobs));
    } catch (error) {
      console.error("Unable to load applications for employer jobs:", error);
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
    const payload = {
      ...job,
      status: nextStatus === "scheduled" ? "scheduled" : nextStatus,
      description: job.description || "",
      department: job.department === "other" ? job.department_other.trim() : job.department,
      category: job.department === "other" ? job.department_other.trim() : job.department,
      sector: job.department === "other" ? job.department_other.trim() : job.department,
      job_type: job.job_type === "other" ? job.job_type_other.trim() : job.job_type,
      jobType: job.job_type === "other" ? job.job_type_other.trim() : job.job_type,
      work_mode: job.work_mode === "other" ? job.work_mode_other.trim() : job.work_mode,
      workMode: job.work_mode === "other" ? job.work_mode_other.trim() : job.work_mode,
      gender_preference: job.gender_preference,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      min_experience: job.min_experience,
      years_of_experience_min: job.min_experience,
      required_education: job.required_education === "other" ? job.required_education_other.trim() : job.required_education,
      is_negotiable: job.is_negotiable,
      vacancies: job.vacancies,
      benefits: job.benefits,
      applicationDeadline: normalizeJobDeadline(job.application_deadline),
      requiredSkills: job.required_skills,
      isScheduled: nextStatus === "scheduled",
      scheduledAt: scheduledAt || null,
      scheduledDate: scheduledAt || null,
    };
    setLoading(true);
    try {
      const response = editingJobId
        ? await api.put(`/employer/jobs/${editingJobId}`, payload)
        : await api.post("/employer/jobs", payload);
      const savedJob = response.data;
      const savedId = savedJob.id || savedJob.jobId;
      if (nextStatus === "published" || nextStatus === "scheduled") {
        await api.patch(`/employer/jobs/${savedId}/status`, {
            status: nextStatus === "scheduled" ? "scheduled" : "published",
        });
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
            ? "Job submitted for admin approval"
            : nextStatus === "scheduled"
              ? "Job scheduled successfully"
              : "Draft saved",
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
    }
  };
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
    const next = normalizedStatus === "active" ? "paused" : "published";

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

      notify(`Job ${next}`);
    } catch (requestError) {
      console.error("--> [STATUS ERROR DETAILS]:", requestError);
      const message =
        requestError?.response?.data?.error ||
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Failed to update job status.";

      notify(message, "error");
    }
  };
  const deleteJob = async (id) => {
    setJobs((current) => current.filter((item) => item.id !== id));
    try {
      await api.delete(`/employer/jobs/${id}`);
    } catch (requestError) {
      console.warn('Unable to delete job:', requestError);
    }
    notify("Job deleted");
  };
  const editJob = (item) => {
    setEditingJobId(item.id);
    const department = item.department || item.category || "";
    const jobType = item.job_type || "full-time";
    const workMode = item.work_mode || "hybrid";
    const genderPreference = item.gender_preference || item.genderPreference || "any";
    const requiredEducation = item.required_education || "any";
    setJob({
      title: item.title || "",
      department: getEditOptionValue(department, [...jobSectors, "other"]),
      department_other: getEditOptionValue(department, [...jobSectors, "other"]) === "other" ? department : "",
      job_type: getEditOptionValue(jobType, employmentTypeOptions),
      job_type_other: getEditOptionValue(jobType, employmentTypeOptions) === "other" ? jobType : "",
      work_mode: getEditOptionValue(workMode, workModeOptions),
      work_mode_other: getEditOptionValue(workMode, workModeOptions) === "other" ? workMode : "",
      gender_preference: getEditOptionValue(genderPreference, genderPreferenceOptions),
      location: item.location || "",
      salary_min: item.salary_min || "",
      salary_max: item.salary_max || "",
      is_negotiable: Boolean(item.is_negotiable ?? item.is_salary_negotiable),
      min_experience: item.min_experience === null || item.min_experience === undefined ? "" : String(item.min_experience),
      required_education: getEditOptionValue(requiredEducation, educationOptions),
      required_education_other: getEditOptionValue(requiredEducation, educationOptions) === "other" ? requiredEducation : "",
      vacancies: String(item.vacancies ?? item.vacancy_count ?? 1),
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
  const welcomeName = company.company_name || user?.company_name || user?.full_name || user?.name || "Employer";
  const formattedToday = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const title =
    active === "overview"
      ? `Welcome, ${employeeName}`
      : stages.find(([id]) => id === active)?.[1] || "Dashboard";
  const companyName = company.company_name || user?.full_name || "Your Company";
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
      if (selectedJobFilter === "all" || item.isTalentPoolShortlist) return true;
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

    const getStatusClass = (statusValue) =>
      getPipelineStatusClasses(statusValue);

    const getStatusLabel = (statusValue) =>
      getPipelineStatusLabel(statusValue);

    return (
      <div id="applicants-table-section" className="mb-8 scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span>Applicants & Shortlisted Talent</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {filteredCandidates.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Evaluate incoming resumes, AI compatibility scores, and take quick hiring actions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="whitespace-nowrap text-xs font-semibold text-slate-500">
              Filter by Job:
            </label>
            <select
              value={selectedJobFilter}
              onChange={(event) => setSelectedJobFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Posted Jobs ({activeJobs.length})</option>
              {activeJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>

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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-blue-200 bg-blue-50/80 text-[11px] font-bold normal-case tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-4 py-3.5">Applied Job Role</th>
                <th className="px-4 py-3.5 text-center">AI Match</th>
                <th className="px-4 py-3.5">Applied / Saved</th>
                <th className="px-4 py-3.5">Hiring Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleCandidates.length > 0 ? (
                visibleCandidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="transition-colors hover:bg-slate-50/60"
                  >
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
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-semibold ${candidate.isTalentPoolShortlist ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {candidate.isTalentPoolShortlist ? "Talent Pool shortlist" : candidate.jobTitle || "General Application"}
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
                      {candidate.isTalentPoolShortlist ? `Saved ${candidate.appliedDate ? new Date(candidate.appliedDate).toLocaleDateString() : "to shortlist"}` : candidate.appliedDate ||
                        candidate.applied_at ||
                        candidate.created_at ||
                        candidate.createdAt ||
                        "—"}
                    </td>

                    <td className="px-4 py-4">
                      {candidate.isTalentPoolShortlist ? <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">Shortlisted</span> : <select
                        aria-label={`Hiring status for ${candidate.name || "applicant"}`}
                        value={normalizePipelineStatus(candidate.status)}
                        disabled={String(updatingApplicationId) === String(candidate.id)}
                        onChange={(event) =>
                          handleApplicationStatusSelection(
                            candidate,
                            event.target.value,
                          )
                        }
                        className={`max-w-full cursor-pointer appearance-none rounded-md px-2.5 py-1.5 text-[11px] font-bold outline-none ring-1 ring-inset focus:ring-2 disabled:cursor-wait disabled:opacity-60 ${getStatusClass(candidate.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="interviewed">Interview</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelected(candidate)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          title="View Full Profile / CV"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => {
                            setSelected(candidate);
                            notify(`Opened chat for ${candidate.name}`);
                          }}
                          className="rounded-lg bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-100"
                          title="Send Message"
                        >
                          💬
                        </button>
                        {!candidate.isTalentPoolShortlist && <button
                          onClick={() => updateApplication(candidate.id, "rejected")}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Decline / Reject"
                        >
                          ✕
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-sm font-semibold text-slate-600">
                        No applicants found for this filter
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Select another job or post a new vacancy to receive applications.
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
      <div className={`min-h-[calc(100dvh-5rem)] max-w-full ${shell} flex flex-col sm:min-h-[calc(100dvh-6rem)]`}>
        <EmployerHeader
          currentTabTitle={title}
          breadcrumb={active === "overview" ? "Home / Dashboard" : `Home / ${title}`}
          showSearch={active !== "profile"}
          user={user}
          unreadNotificationsCount={unreadNotificationCount}
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
          sidebarOpen={sidebarOpen}
          onSearchClick={() => { setGlobalQuery(""); setGlobalSearchOpen(true); }}
          onOpenNotifications={() => setActive("notifications")}
          onOpenMessages={() => setActive("messages")}
          onLogout={handleHeaderLogout}
        />
        <div className="flex min-w-0 flex-1">
          <EmployerSidebar
            active={active}
            onSelect={selectStage}
            onLogout={handleLogout}
            applicationsCount={applications.length}
            unreadMessages={unreadMessageCount}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            stages={stages}
          />
          <main className={`min-w-0 max-w-full flex-1 bg-slate-50/50 ${standalonePostJob ? "p-3 sm:p-6 lg:p-10" : "p-3 sm:p-6 lg:p-8"}`}>
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
                    <button type="button" onClick={() => setPlatformReportOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700"><ShieldAlert className="h-4 w-4" />Report platform issue</button>
                    <button
                      onClick={() => selectStage("post")}
                      className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]"
                    >
                      <span className="text-base font-bold">+</span>
                      <span>Post New Job</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                  <div className="flex-1" />
                  {active !== "post" && (
                    <button
                      onClick={() => selectStage("post")}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20"
                    >
                      <Plus className="h-4 w-4" /> Post New Job
                    </button>
                  )}
                </div>
              )}

              {active === "overview" && (
                <>

                  <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {[
                      { label: "ACTIVE JOBS", value: stats.active, badge: "Active now", filter: "ACTIVE_JOBS", icon: BriefcaseBusiness, color: "text-blue-600", bg: "bg-blue-50" },
                      { label: "TOTAL APPLICANTS", value: stats.applicants, badge: "All candidates", filter: "ALL", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
                      { label: "PENDING REVIEW", value: stats.pending, badge: "Needs review", filter: "Pending", icon: Clock3, color: "text-blue-600", bg: "bg-blue-50" },
                      { label: "HIGH AI MATCHES (≥80%)", value: stats.high, badge: "Top talent", filter: "HIGH_AI", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
                      { label: "SHORTLISTED", value: stats.shortlisted, badge: "Candidate pool", filter: "Shortlisted", icon: Star, color: "text-sky-600", bg: "bg-sky-50" },
                      { label: "INTERVIEWS SCHEDULED", value: stats.interviews, badge: "Upcoming", filter: "Interview", icon: CalendarDays, color: "text-teal-600", bg: "bg-teal-50" },
                      { label: "HIRED", value: stats.hired, badge: "Accepted", filter: "Hired", icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50" },
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
                          setMinScore(0);
                          document.getElementById("applicants-table-section")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`flex min-h-[160px] cursor-pointer flex-col justify-between rounded-2xl border bg-white p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeMetric === stat.filter ? "border-blue-300 ring-2 ring-blue-500 shadow-md" : "border-slate-200/80"}`}
                      >
                        <div className="flex w-full items-start justify-between gap-3">
                          <span className="text-[11px] font-bold tracking-wider text-slate-500 normal-case">{stat.label}</span>
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon className="h-5 w-5" />
                          </span>
                        </div>
                        <div>
                          <div className="text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</div>
                          <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${stat.bg} ${stat.color}`}>{stat.badge}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div id="active-jobs-section" className={`mb-8 scroll-mt-28 rounded-3xl border bg-white p-6 shadow-xs transition-all duration-500 ${highlightActiveJobs ? "border-blue-300 ring-2 ring-blue-500 shadow-md" : "border-slate-200/80"}`}>
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">Your Job Postings</h3>
                        <p className="text-xs text-slate-400">Track admin approval, manage listings, and share approved public links.</p>
                      </div>
                      <button onClick={() => selectStage("post")} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                        + Add New Role
                      </button>
                    </div>

                    {jobs.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {jobs.map((job) => {
                          const approvalStatus = getJobApprovalStatus(job);
                          const approvalBadge = approvalStatus === "approved"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : approvalStatus === "rejected"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-amber-200 bg-amber-50 text-amber-800";
                          const approvalLabel = approvalStatus === "approved"
                            ? "🟢 Live on Explore Jobs"
                            : approvalStatus === "rejected"
                              ? "⚠️ Needs Revision"
                              : "⏳ Pending Admin Review";
                          return (
                          <div key={job.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-blue-300 hover:bg-white">
                            <div>
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-slate-800">{job.title}</h4>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${approvalBadge}`}>
                                  {approvalLabel}
                                </span>
                              </div>
                              {approvalStatus === "pending" && (
                                <p className="mb-2 text-xs font-medium text-amber-800">
                                  Awaiting admin verification before appearing on Explore Jobs.
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                {job.company_name || job.companyName || company.company_name || companyName} • {job.department || job.category || "General"} • {job.location || job.city || "Addis Ababa"}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{job.job_type || job.jobType || "Work type not specified"}</span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{job.work_mode || "Work mode not specified"}</span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{Number(job.vacancies || 1)} {Number(job.vacancies || 1) === 1 ? "position" : "positions"}</span>
                              </div>
                              <p className="mt-2 text-xs font-semibold text-slate-700">
                                {job.is_negotiable || job.is_salary_negotiable
                                  ? "Salary: Negotiable"
                                  : job.salary_min || job.salary_max
                                    ? `Salary: ${job.currency || "ETB"} ${job.salary_min || ""}${job.salary_min && job.salary_max ? " - " : ""}${job.salary_max || ""}`
                                    : "Salary not specified"}
                              </p>
                              {approvalStatus === "approved" ? (
                                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-blue-700">
                                  <span>👁 {Number(job.views_count || job.view_count || 0)} views</span>
                                  <span>👥 {Number(job.applicantsCount ?? job.applicants_count ?? 0)} applicants</span>
                                </p>
                              ) : (
                                <p className="mt-2 text-xs font-medium text-slate-500">
                                  Views analytics and public sharing unlock after approval.
                                </p>
                              )}
                              {(() => {
                                const deadline = job.application_deadline || job.deadline;
                                const daysRemaining = deadline
                                  ? Math.ceil((new Date(deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
                                  : null;
                                return <p className={`mt-2 text-xs font-medium ${daysRemaining !== null && daysRemaining < 0 ? "text-rose-600" : "text-slate-500"}`}>
                                  {daysRemaining === null
                                    ? "⏳ Active • No expiry date"
                                    : daysRemaining < 0
                                      ? `⏳ Expired • ${Math.abs(daysRemaining)} days ago`
                                      : `⏳ Active • ${daysRemaining} days remaining`}
                                </p>;
                              })()}
                            </div>

                            <div className="mt-4 flex items-center gap-2 border-t border-slate-200/60 pt-3 text-xs">
                              <button onClick={() => {
                                setSelectedJobFilter(String(job.id));
                                window.requestAnimationFrame(() => document.getElementById("applicants-table-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                              }} className="flex-1 rounded-xl bg-blue-50 py-1.5 font-bold text-blue-700 hover:bg-blue-100">
                                View Applicants
                              </button>
                              <button
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
                                className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                title={approvalStatus === "approved" ? "Copy Job Link" : "Available after admin approval"}
                              >
                                Share Link 🔗
                              </button>
                              <button onClick={() => editJob(job)} className={`rounded-xl border px-3 py-1.5 font-semibold hover:bg-slate-100 ${approvalStatus === "rejected" ? "border-rose-200 text-rose-700" : "border-slate-200 text-slate-600"}`}>
                                {approvalStatus === "rejected" ? "Edit & Resubmit" : "Edit Role"}
                              </button>
                              <button onClick={() => toggleJob(job)} className="rounded-xl border border-rose-200 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50">
                                Close Listing
                              </button>
                            </div>
                          </div>
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
                                            <p className="mt-1 text-sm text-slate-500">Click &apos;+ Add New Role&apos; to post your first vacancy.</p>
                                            <button
                                              onClick={() => selectStage("post")}
                                              className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 hover:shadow"
                                            >
                                              + Add New Role
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
                        <Field label="Sector" modern>
                          <SearchableSelect
                            value={job.department}
                            onChange={(department) =>
                              setJob({
                                ...job,
                                department,
                                department_other: department === "other" ? job.department_other : "",
                              })
                            }
                            options={[...jobSectors, { value: "other", label: "Other" }]}
                            placeholder="Select Sector..."
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
                        <Field label="Required Education" modern>
                          <SearchableSelect
                            value={job.required_education}
                            onChange={(required_education) =>
                              setJob({
                                ...job,
                                required_education,
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
                              onChange={(event) => setJob({ ...job, required_education_other: event.target.value })}
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
                          {companyName} • {job.location || "Location"} • {job.work_mode}
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
                            onClick={() => saveJob("draft")}
                            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-400 sm:w-auto"
                          >
                            Save as Draft
                          </button>
                          <button
                            onClick={() => {
                              resetPublishScheduleForm(true);
                              setShowPublishSchedule(true);
                            }}
                            disabled={loading}
                            className="w-full rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--brand-primary)]/20 transition-all hover:bg-[var(--brand-primary-hover)] sm:w-auto"
                          >
                            Schedule Post
                          </button>
                          <button
                            onClick={() => saveJob("published")}
                            className="w-full rounded-xl bg-[var(--brand-soft)] px-5 py-3 text-sm font-medium text-[var(--brand-deep)] shadow-sm shadow-[var(--brand-primary)]/10 transition-all hover:bg-[var(--brand-soft-hover)] sm:w-auto"
                          >
                            Publish Job Now
                          </button>
                        </div>
                      </div>
                    )}

                    {(wizard > 1 || wizard < 3) && (
                      <div className={`mt-5 flex gap-3 ${wizard === 1 ? "justify-end" : "justify-between"}`}>
                        {wizard > 1 && (
                          <button
                            type="button"
                            onClick={() => setWizard((value) => Math.max(1, value - 1))}
                            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                          >
                            Back
                          </button>
                        )}
                        {wizard < 3 && (
                          <button
                            type="button"
                            onClick={wizard === 1 ? handleContinueToPreview : () => setWizard((value) => value + 1)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow sm:w-auto"
                          >
                            Continue <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {active === "jobs" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                        My Job Listings
                      </h1>
                      <p className="mt-1 max-w-2xl text-xs font-medium text-slate-500 sm:text-sm">
                        Track and manage your published vacancies, monitor real-time applicant pipelines, and control hiring statuses.
                      </p>
                    </div>
                  </div>

                  <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "Total jobs",
                        value: jobs.length,
                        tone: "text-slate-900",
                        note: jobs.length > 0 ? `${jobs.length} roles in My Jobs` : "No job posts yet",
                      },
                      {
                        label: "Live / Open",
                        value: jobs.filter(
                          (item) => normalizeJobStatus(item.status) === "active",
                        ).length,
                        tone: "text-emerald-600",
                        note: "Accepting new applicants",
                      },
                      {
                        label: "Paused",
                        value: jobs.filter(
                          (item) => normalizeJobStatus(item.status) === "paused",
                        ).length,
                        tone: "text-amber-500",
                        note: "Temporarily on hold",
                      },
                      {
                        label: "Closed / Expired",
                        value: jobs.filter(
                          (item) =>
                            ["closed", "expired", "archived"].includes(
                              normalizeJobStatus(item.status),
                            ),
                        ).length,
                        tone: "text-slate-600",
                        note: "Hiring completed",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs transition-all hover:shadow-md"
                      >
                        <p className="block text-[11px] font-bold normal-case tracking-[0.18em] text-slate-400">
                          {stat.label}
                        </p>
                        <p className={`mt-2 text-4xl font-semibold tracking-tight ${stat.tone}`}>
                          {stat.value}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {stat.note}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs md:flex-row md:items-center">
                      <div>
                        <p className="text-xs font-bold normal-case tracking-[0.2em] text-slate-400">
                          My Jobs Overview
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-900">
                          Job management workspace
                        </h3>
                      </div>

                      <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={jobSearchQuery}
                          onChange={(event) => setJobSearchQuery(event.target.value)}
                          placeholder="Search listings by title or sector..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-white shadow-xs">
                      <div className="flex flex-col justify-between gap-4 border-b border-[var(--brand-border)] bg-[var(--brand-soft)] p-5 md:flex-row md:items-center">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">
                            Published & Active Jobs
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Live on Explore Jobs, managing applicants and hiring pipeline.
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-deep)]">
                          {publishedJobs.filter((item) => {
                            const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                            return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                          }).length} live vacancies
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold normal-case tracking-wider text-slate-600">
                            <tr>
                              <th className="px-6 py-4 text-slate-700">Job Role & Sector</th>
                              <th className="px-4 py-4 text-slate-700">Dates</th>
                              <th className="px-4 py-4 text-center text-slate-700">Applicant Pipeline</th>
                              <th className="px-4 py-4 text-slate-700">Status</th>
                              <th className="px-6 py-4 text-right text-slate-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {publishedJobs.filter((item) => {
                              const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                              return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                            }).length ? (
                              publishedJobs
                                .filter((item) => {
                                  const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                                  return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                                })
                                .map((item) => {
                                  const postedDate = item.created_at
                                    ? new Date(item.created_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "Recently";
                                  const deadlineValue = item.application_deadline || item.deadline || item.applicationDeadline || "No deadline";
                                  const deadlineDate =
                                    deadlineValue === "No deadline"
                                      ? "Ongoing"
                                      : new Date(deadlineValue).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        });
                                  const normalizedStatus = normalizeJobStatus(item.status);
                                  const totalApplicants = Number(item.total_applicants ?? item.applicantsCount ?? 0);
                                  const pendingCount = Number(item.pending_count ?? item.pendingCount ?? 0);
                                  const shortlistedCount = Number(item.shortlisted_count ?? item.shortlisted ?? 0);
                                  const hiredCount = Number(item.hired_count ?? item.hiredCount ?? 0);

                                  return (
                                    <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                                      <td className="px-6 py-4">
                                        <div>
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/employer/jobs/${item.id}/applicants`)}
                                            className="text-left text-sm font-semibold text-slate-900 hover:text-blue-700"
                                          >
                                            {item.title}
                                          </button>
                                          <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                              {item.sector || item.category || "General"}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                              • {item.work_mode || "Hybrid"} • {item.location || "Addis Ababa"}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-slate-600">
                                        <div>
                                          <p className="text-[11px] font-semibold text-slate-800">
                                            <span className="text-slate-400">Posted:</span> {postedDate}
                                          </p>
                                          <p className="mt-0.5 text-[11px] text-slate-500">
                                            <span className="text-slate-400">Deadline:</span> {deadlineDate}
                                          </p>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-center">
                                        {(() => {
                                          const jobApplications = applications.filter(
                                            (application) =>
                                              String(application.job_id ?? application.jobId ?? application.job?.id ?? "") === String(item.id),
                                          );
                                          const reviewCount = jobApplications.filter((application) => {
                                            const stage = normalizePipelineStatus(application.status);
                                            return ["applied", "under-review"].includes(stage);
                                          }).length;
                                          const shortlistedCountJob = jobApplications.filter((application) => normalizePipelineStatus(application.status) === "shortlisted").length;
                                          const interviewCount = jobApplications.filter((application) => normalizePipelineStatus(application.status) === "interview").length;
                                          const hiredCountJob = jobApplications.filter((application) => normalizePipelineStatus(application.status) === "hired").length;
                                          const rejectedCount = jobApplications.filter((application) => normalizePipelineStatus(application.status) === "rejected").length;
                                          const pipelineStages = [
                                            { label: "Review", count: reviewCount, tone: "bg-blue-100 text-blue-700" },
                                            { label: "Shortlisted", count: shortlistedCountJob, tone: "bg-violet-100 text-violet-700" },
                                            { label: "Interviewed", count: interviewCount, tone: "bg-amber-100 text-amber-700" },
                                            { label: "Hired", count: hiredCountJob, tone: "bg-emerald-100 text-emerald-700" },
                                            { label: "Rejected", count: rejectedCount, tone: "bg-rose-100 text-rose-700" },
                                          ];

                                          return (
                                            <div className="inline-flex max-w-full flex-wrap justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                                              {pipelineStages.map((stage) => (
                                                <span
                                                  key={`${item.id}-${stage.label}`}
                                                  className={`inline-flex items-center rounded-xl px-2 py-1 text-[10px] font-bold ${stage.tone}`}
                                                  title={`${stage.label} applicants`}
                                                >
                                                  {stage.label}: {stage.count}
                                                </span>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td className="px-4 py-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize ${getJobStatusClasses(normalizedStatus)}`}>
                                          <span className={`h-1.5 w-1.5 rounded-full ${normalizedStatus === "active" ? "bg-emerald-600" : normalizedStatus === "pending" || normalizedStatus === "pending_approval" ? "bg-amber-500" : "bg-slate-400"}`} />
                                          {normalizedStatus === "pending" || normalizedStatus === "pending_approval" ? "Pending Approval" : normalizedStatus === "active" ? "Active" : normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <button onClick={() => editJob(item)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                                            Edit
                                          </button>
                                          <button onClick={() => navigate(`/employer/jobs/${item.id}/applicants`)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                                            Applicants
                                          </button>
                                          <button onClick={() => toggleJob(item)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                                            Pause
                                          </button>
                                          <button onClick={() => deleteJob(item.id)} className="rounded-xl bg-red-50 p-2 text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                            ) : (
                              <tr>
                                <td colSpan="5" className="px-6 py-16 text-center">
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] text-lg text-[var(--brand-deep)]">
                                      
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">No published jobs yet</p>
                                    <p className="mt-1 max-w-sm text-xs text-slate-400">
                                      Publish a vacancy to make it visible on Explore Jobs and start collecting candidates.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-white shadow-xs">
                      <div className="flex flex-col justify-between gap-4 border-b border-[var(--brand-border)] bg-[var(--brand-soft)] p-5 md:flex-row md:items-center">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">
                            Scheduled Job Posts
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Queued future vacancies with scheduled release dates.
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-deep)]">
                          {scheduledJobs.filter((item) => {
                            const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                            return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                          }).length} queued posts
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold normal-case tracking-wider text-slate-600">
                            <tr>
                              <th className="px-6 py-4 text-slate-700">Vacancy</th>
                              <th className="px-4 py-4 text-slate-700">Release Schedule</th>
                              <th className="px-4 py-4 text-center text-slate-700">Applications</th>
                              <th className="px-4 py-4 text-slate-700">Status</th>
                              <th className="px-6 py-4 text-right text-slate-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {scheduledJobs.filter((item) => {
                              const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                              return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                            }).length ? (
                              scheduledJobs
                                .filter((item) => {
                                  const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                                  return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                                })
                                .map((item) => {
                                  const scheduledOn = item.scheduled_date || item.scheduledDate || item.application_deadline || item.deadline || "Not set";
                                  const releaseDate = scheduledOn === "Not set" ? "Not set" : new Date(scheduledOn).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  });
                                  const totalApplicants = Number(item.total_applicants ?? item.applicantsCount ?? 0);
                                  return (
                                    <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                                      <td className="px-6 py-4">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                          <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                              {item.sector || item.category || "General"}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                              {item.work_mode || "Hybrid"} • {item.location || "Addis Ababa"}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-slate-600">
                                        <p className="text-[11px] font-semibold text-slate-800">{releaseDate}</p>
                                      </td>
                                      <td className="px-4 py-4 text-center">
                                        <span className="rounded-xl bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                                          {totalApplicants} applicants
                                        </span>
                                      </td>
                                      <td className="px-4 py-4">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-deep)]">
                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                          Scheduled
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <button onClick={() => editJob(item)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                                            Edit
                                          </button>
                                          <button onClick={() => toggleJob(item)} className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">
                                            Publish Now
                                          </button>
                                          <button onClick={() => deleteJob(item.id)} className="rounded-xl bg-red-50 p-2 text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                            ) : (
                              <tr>
                                <td colSpan="5" className="px-6 py-16 text-center">
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] text-lg text-[var(--brand-deep)]">
                                      
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">No scheduled posts</p>
                                    <p className="mt-1 max-w-sm text-xs text-slate-400">
                                      Schedule a vacancy for a future release date and it will appear here automatically.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-white shadow-xs">
                      <div className="flex flex-col justify-between gap-4 border-b border-[var(--brand-border)] bg-[var(--brand-soft)] p-5 md:flex-row md:items-center">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">
                            Saved Draft Vacancies
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Unpublished drafts with instant one-click publish action.
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-deep)]">
                          {draftJobs.filter((item) => {
                            const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                            return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                          }).length} drafts
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold normal-case tracking-wider text-slate-600">
                            <tr>
                              <th className="px-6 py-4 text-slate-700">Draft Role</th>
                              <th className="px-4 py-4 text-slate-700">Last Updated</th>
                              <th className="px-4 py-4 text-slate-700">Status</th>
                              <th className="px-6 py-4 text-right text-slate-700">Quick Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {draftJobs.filter((item) => {
                              const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                              return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                            }).length ? (
                              draftJobs
                                .filter((item) => {
                                  const searchValue = `${item.title || ""} ${item.sector || item.category || ""} ${item.location || ""}`.toLowerCase();
                                  return !jobSearchQuery || searchValue.includes(jobSearchQuery.toLowerCase());
                                })
                                .map((item) => {
                                  const updatedDate = item.updated_at || item.created_at
                                    ? new Date(item.updated_at || item.created_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "Recently";
                                  return (
                                    <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                                      <td className="px-6 py-4">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                          <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                              {item.sector || item.category || "General"}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                              {item.work_mode || "Hybrid"} • {item.location || "Addis Ababa"}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-slate-600">
                                        <span className="text-[11px] font-semibold text-slate-800">{updatedDate}</span>
                                      </td>
                                      <td className="px-4 py-4">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-deep)]">
                                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                          Draft
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <button onClick={() => editJob(item)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                                            Edit
                                          </button>
                                          <button onClick={() => toggleJob(item)} className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">
                                            Publish Now
                                          </button>
                                          <button onClick={() => deleteJob(item.id)} className="rounded-xl bg-red-50 p-2 text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                            ) : (
                              <tr>
                                <td colSpan="4" className="px-6 py-16 text-center">
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] text-lg text-[var(--brand-deep)]">
                                      
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">No saved drafts</p>
                                    <p className="mt-1 max-w-sm text-xs text-slate-400">
                                      Save a vacancy as a draft to return and publish anytime.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {["applications", "shortlist", "hired"].includes(
                active,
              ) && (
                <div className="space-y-5">
                  <div
                    className={`flex flex-wrap gap-3 rounded-2xl border p-4 ${card}`}
                  >
                    <div className="relative min-w-56 flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        className={`${inputClass(dark)} pl-10`}
                        placeholder="Search candidates or roles"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className={inputClass(dark)}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {PIPELINE_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputClass(dark)}
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                    >
                      <option value="0">Any AI score</option>
                      <option value="65">65%+ score</option>
                      <option value="80">80%+ score</option>
                      <option value="90">90%+ score</option>
                    </select>
                  </div>
                  {active === "matching" && (
                    <div className="grid gap-4 md:grid-cols-4">
                      {[
                        ["Hard Skills Overlap", 40],
                        ["Experience Relevance", 30],
                        ["Education & Certs", 15],
                        ["Work Model & Location", 15],
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
                              style={{ width: `${weight * 2.5}%` }}
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
              {active === "reviews" && (
                <div className="space-y-8">
                  <CompanyReviews companyId={company.id || 1} employerView />
                  <CompanyQA companyId={company.id || 1} employerView />
                </div>
              )}
            </div>
          </main>
        </div>
        <Toast toast={toast} onClose={() => setToast(null)} />
        {platformReportOpen && <UniversalReportModal isOpen reporterRole="employer" targetType="platform" targetId={null} targetTitle="platform issue" currentUser={user} onClose={() => setPlatformReportOpen(false)} />}
        {reportCandidate && <UniversalReportModal isOpen reporterRole="employer" targetType="candidate" targetId={reportCandidate.candidateId} targetTitle={reportCandidate.name || reportCandidate.candidateName || "candidate"} currentUser={user} onClose={() => setReportCandidate(null)} />}
        {selected && (
          <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/50" onClick={() => setSelected(null)}>
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={`${selected.name || "Candidate"} profile`}
              onClick={(event) => event.stopPropagation()}
              className={`h-full w-full max-w-xl overflow-y-auto p-5 shadow-2xl sm:p-7 ${card}`}
            >
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div className="min-w-0">
                  <p className="text-xs font-bold normal-case tracking-widest text-blue-600">Candidate profile</p>
                  <h2 className="mt-1 truncate text-2xl font-semibold">{selected.name || "Candidate"}</h2>
                  <p className="text-sm text-slate-500">{selected.jobTitle || "Applied role"}</p>
                </div>
                <button type="button" aria-label="Close candidate profile" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X />
                </button>
              </div>
              {selected.candidateId && <button type="button" onClick={() => setReportCandidate(selected)} className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"><ShieldAlert className="h-4 w-4" />Report candidate</button>}
              <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr]">
                <ScoreRing score={selected.matchScore} size={90} />
                <div>
                  <h3 className="font-black">AI Match Breakdown</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Strong match based on skills and experience. Review the
                    skill gaps before the final decision.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.skills?.map((skill) => (
                      <span
                        className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <p className="rounded-xl bg-blue-50 p-3 font-semibold text-blue-800">Skills match: {selected.skills_match_score ?? "—"}{selected.skills_match_score !== null && selected.skills_match_score !== undefined ? "%" : ""}</p>
                  <p className="rounded-xl bg-violet-50 p-3 font-semibold text-violet-800">Experience match: {selected.experience_match_score ?? "—"}{selected.experience_match_score !== null && selected.experience_match_score !== undefined ? "%" : ""}</p>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-slate-600">Matching skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.matchedSkills?.length
                      ? selected.matchedSkills.map((skill) => <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700" key={skill}>{skill}</span>)
                      : <span className="text-xs text-slate-500">No matching skills recorded.</span>}
                  </div>
                  <p className="mt-4 text-xs font-bold text-slate-600">Missing required skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.missingSkills?.length
                      ? selected.missingSkills.map((skill) => <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700" key={skill}>{skill}</span>)
                      : <span className="text-xs text-slate-500">No missing skills recorded.</span>}
                  </div>
                </div>
              </div>

              <section className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ["Work history", selected.experience],
                  ["Education", selected.education],
                ].map(([label, entries]) => {
                  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
                  return <div className="rounded-2xl border border-slate-200 p-4" key={label}>
                    <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                    {list.length
                      ? <ul className="mt-3 space-y-2 text-sm text-slate-600">{list.map((entry, index) => <li key={`${label}-${index}`}>{formatCandidateEntry(entry) || "Details not available"}</li>)}</ul>
                      : <p className="mt-3 text-sm text-slate-500">No {label.toLowerCase()} details were extracted.</p>}
                  </div>;
                })}
              </section>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
                {!selected.isTalentPoolShortlist && <>
                  <button type="button" onClick={() => updateApplication(selected.id, "shortlisted")} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">
                    Shortlist
                  </button>
                  <button type="button" onClick={() => setShowSchedule(true)} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white">
                    Schedule Interview
                  </button>
                </>}
                {selected.resumeUrl && (
                  <a href={selected.resumeUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
                    View / Download Resume
                  </a>
                )}
              </div>
            </aside>
          </div>
        )}
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
