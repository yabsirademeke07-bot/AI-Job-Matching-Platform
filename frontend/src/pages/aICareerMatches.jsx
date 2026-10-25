import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, MapPin, WalletCards } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { getAllJobs } from "../services/jobService";
import { useAuth } from "../context/AuthContext";
import { calculateJobMatch } from "../utils/aiMatcher";
import { beginApplication } from "../utils/applicationFlow";

const formatPostedDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
};

const asList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" ? item.trim() : String(item?.skill_name || item?.name || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? asList(parsed) : value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
    } catch {
      return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const readStoredProfile = () => {
  try {
    return JSON.parse(localStorage.getItem("userProfile") || "{}");
  } catch {
    return {};
  }
};

const isActiveApprovedJob = (job) => {
  const status = String(job?.status || "").toLowerCase();
  const approval = String(job?.approval_status || job?.approvalStatus || "").toLowerCase();
  const deadline = job?.deadline || job?.application_deadline || job?.deadlineDate;
  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const deadlineString = deadline instanceof Date
    ? [
      deadline.getFullYear(),
      String(deadline.getMonth() + 1).padStart(2, "0"),
      String(deadline.getDate()).padStart(2, "0"),
    ].join("-")
    : String(deadline || "").slice(0, 10);
  const deadlineIsValid = !deadline || /^\d{4}-\d{2}-\d{2}$/.test(deadlineString);
  const deadlineIsCurrent = !deadline || (deadlineIsValid && deadlineString >= todayString);
  const isActive = job?.is_active === undefined
    || job.is_active === true
    || Number(job.is_active) === 1;
  return ["active", "published", "approved"].includes(status)
    && approval === "approved"
    && isActive
    && deadlineIsCurrent;
};

const getMatchTierInfo = (index) => {
  const tiers = [
    {
      rank: "#1",
      label: "Best Match",
      badgeClass: "border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-green-500/15 text-emerald-700",
    },
    {
      rank: "#2",
      label: "High Match",
      badgeClass: "border-blue-500/30 bg-blue-500/15 text-blue-700",
    },
    {
      rank: "#3",
      label: "Good Match",
      badgeClass: "border-sky-500/30 bg-slate-500/10 text-slate-700",
    },
  ];
  return tiers[index] || { rank: "", label: "", badgeClass: "" };
};

export default function AICareerMatches() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [availabilityNotice, setAvailabilityNotice] = useState(location.state?.availabilityNotice || "");
  const [candidateProfile, setCandidateProfile] = useState(() => readStoredProfile());

  useEffect(() => {
    if (!availabilityNotice) return undefined;
    const timeoutId = window.setTimeout(() => setAvailabilityNotice(""), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [availabilityNotice]);

  useEffect(() => {
    let active = true;
    const loadRecommendations = async () => {
      try {
        const [allJobs, profileResult, applicationsResult] = await Promise.all([
          getAllJobs(),
          api.get("/seeker/profile/full").catch(() => null),
          api.get("/seeker/applications").catch(() => null),
        ]);
        if (!active) return;

        const profileResponse = profileResult?.data || {};
        const persistedProfile = profileResponse.profile || {};
        const storedProfile = readStoredProfile();
        const profileSkills = asList(profileResponse.skills?.length ? profileResponse.skills : persistedProfile.skills);
        const experience = Array.isArray(profileResponse.experience) && profileResponse.experience.length
          ? profileResponse.experience
          : Array.isArray(storedProfile.experience) && storedProfile.experience.length
            ? storedProfile.experience
            : Array.isArray(user?.experience) ? user.experience : [];
        const userProfile = {
          ...user,
          ...storedProfile,
          ...persistedProfile,
          id: user?.id || user?.userId || user?.user_id,
          skills: profileSkills.length
            ? profileSkills
            : asList(storedProfile.skills).length ? asList(storedProfile.skills) : asList(user?.skills),
          experience,
          experienceYears: persistedProfile.experienceYears
            ?? persistedProfile.experience_years
            ?? storedProfile.experienceYears
            ?? storedProfile.experience_years
            ?? user?.experienceYears
            ?? user?.experience_years,
          educationLevel: persistedProfile.education_level
            || persistedProfile.educationLevel
            || storedProfile.educationLevel
            || storedProfile.education_level
            || user?.educationLevel
            || user?.education_level,
          headline: persistedProfile.headline || storedProfile.headline || storedProfile.preferredJob || user?.headline || "",
          jobCategory: persistedProfile.job_category || persistedProfile.jobCategory || storedProfile.jobCategory || user?.jobCategory || "",
        };
        setCandidateProfile(userProfile);

        const appliedJobIds = new Set(
          (Array.isArray(applicationsResult?.data?.applications) ? applicationsResult.data.applications : [])
            .map((application) => String(application.job_id || application.jobId || "")),
        );
        const recommendations = (Array.isArray(allJobs) ? allJobs : [])
          .filter(isActiveApprovedJob)
          .map((job) => {
            const { score, matchedSkills } = calculateJobMatch(job, userProfile);
            return {
              ...job,
              matchScore: score,
              matchedSkills,
              isApplied: Boolean(job.isApplied) || appliedJobIds.has(String(job.id)),
            };
          })
          .sort((left, right) => right.matchScore - left.matchScore);
        setJobs(recommendations);
        setLoadError("");
      } catch (error) {
        if (active) setLoadError(error?.response?.data?.message || error?.message || "Unable to load live job matches.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadRecommendations();
    return () => { active = false; };
  }, [user]);

  const matches = useMemo(() => jobs
    .map((job) => ({
      job,
      score: Number.isFinite(Number(job.matchScore)) ? Number(job.matchScore) : 0,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3), [jobs]);

  const candidateName = candidateProfile.full_name || candidateProfile.fullName || user?.full_name || user?.name || user?.email || "Job Seeker";

  const handleApply = (job) => {
    beginApplication(job.id ?? job.jobId ?? job.job_id, navigate, {
      isAuthenticated: Boolean(localStorage.getItem("token")),
      role: user?.role || user?.userType,
      otpVerified: user?.is_verified || user?.isVerified || user?.otpVerified,
      sourcePage: location.pathname,
      returnPath: location.pathname,
      selectedJob: job,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">AI Career Match Results</h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 sm:text-sm">Live job opportunities and match details for {candidateName}.</p>
        </header>
        {availabilityNotice && (
          <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {availabilityNotice}
          </p>
        )}
        <h2 className="mb-5 text-lg font-black text-slate-900 sm:text-xl">Recommended Roles</h2>
        {loading ? (
          <div role="status" className="rounded-3xl border border-slate-200 bg-white p-12 text-center font-bold text-slate-500">Loading live job matches...</div>
        ) : loadError ? (
          <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center text-sm font-bold text-rose-700">{loadError}<button type="button" onClick={() => window.location.reload()} className="mx-auto mt-4 block rounded-xl bg-rose-600 px-4 py-2 text-white">Try again</button></div>
        ) : matches.length ? (
          <div>
            {matches.map(({ job, score }, index) => {
              const tier = getMatchTierInfo(index);
              const company = job.company || job.companyName || job.company_name || "Company not provided";
              const postedDate = formatPostedDate(job.created_at || job.createdAt);
              const matchedSkills = Array.isArray(job.matchedSkills) ? job.matchedSkills : [];
              return (
                <article key={job.id} className="mb-4 flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-blue-300 hover:shadow-md sm:flex-row sm:items-center sm:p-6">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                      {job.company_logo || job.logo_url ? <img src={job.company_logo || job.logo_url} alt={`${company} logo`} className="h-full w-full object-cover" /> : company.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide ${tier.badgeClass}`}>{tier.rank} {tier.label}</span>
                      <button type="button" onClick={() => navigate(`/jobs/${job.id}`, { state: { job } })} className="mt-2 block break-words text-left text-lg font-bold text-slate-900 transition hover:text-blue-600 sm:text-xl">{job.title}</button>
                      <p className="mt-0.5 text-sm font-medium text-slate-500">{company}{postedDate && <><span className="px-2 text-slate-300">·</span>Posted {postedDate}</>}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><MapPin className="h-4 w-4 text-blue-600" />{job.location || "Location not specified"}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><WalletCards className="h-4 w-4 text-blue-600" />{job.salary || "Salary not provided"}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><BriefcaseBusiness className="h-4 w-4 text-blue-600" />{job.type || job.job_type || "Job type not specified"}</span>
                      </div>
                      {matchedSkills.length > 0 && <div className="mt-3"><p className="mb-1.5 text-xs font-bold text-slate-600">Matched skills:</p><div className="flex flex-wrap gap-1.5">{matchedSkills.slice(0, 6).map((skill) => <span key={skill} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">{skill}</span>)}</div></div>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:w-52 sm:items-end">
                    <span className={`w-fit rounded-full border px-3 py-1 text-sm font-extrabold ${score >= 80 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : score >= 60 ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{score}% Match</span>
                    {job.isApplied ? (
                      <span className="text-sm font-bold text-emerald-700">Application submitted</span>
                    ) : (
                      <button type="button" onClick={() => handleApply(job)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700">
                        Apply
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">No job matches are available yet. Complete your profile and upload a CV to receive match scores.</div>
        )}
        <div className="mt-8 flex justify-center border-t border-slate-200 pt-6"><button id="explore-all-jobs-btn" type="button" onClick={() => navigate("/jobs")} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-blue-700"><span>Explore All Jobs</span><ArrowRight className="h-4 w-4" /></button></div>
      </div>
    </main>
  );
}
