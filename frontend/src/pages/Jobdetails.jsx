import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Building, MapPin, ArrowLeft, LogIn, Send, Sparkles, Loader2, Bookmark } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { beginApplication, getApplicationForJob, getApplyButtonState } from "../utils/applicationFlow";

const getReadableDescription = (description) => {
  if (!description) return "ምንም መግለጫ አልተካተተም።";
  if (typeof description !== "string") return String(description);

  const container = document.createElement("div");
  container.innerHTML = description;
  return container.textContent?.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim() || "ምንም መግለጫ አልተካተም።";
};

const asList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|\r|•|;/)
      .map((item) => item.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
};

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchLoading] = useState(false);
  const [matchScore] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Job details are passed from Explore Jobs and kept in frontend storage.
  useEffect(() => {
    if (!id) return;

    try {
      const previewJob = location.state?.job || JSON.parse(localStorage.getItem("jobDetailsPreview") || "null");
      if (previewJob && String(previewJob.id) === String(id)) {
        // The route preview is external browser state, so sync it into the page model.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setJob(previewJob);
      } else {
        setError("Open this job from Explore Jobs to view its details.");
      }
    } catch {
      setError("The job details could not be loaded.");
    } finally {
      setLoading(false);
      try {
        const savedJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
        setIsSaved(savedJobs.some((savedId) => String(savedId) === String(id)));
      } catch {
        setIsSaved(false);
      }
    }
  }, [id, location.state]);

  // 2. Click Logic for "Login to Apply" / "Apply Now"
  const handleApplyAction = () => {
    beginApplication(id, job, navigate, { isAuthenticated, role: user?.role, sourcePage: location.pathname, returnPath: location.pathname });
  };

  const handleCheckMatch = () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: location.pathname, intent: "match", jobId: id },
      });
      return;
    }

    navigate("/match-results", {
      state: { sourceJob: job },
    });
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    const shareText = `${job.title} - ${job.companyName || job.company || "Job opportunity"}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, "_blank", "noopener,noreferrer");
  };

  const handleToggleSave = () => {
    try {
      const savedJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
      const nextSavedJobs = isSaved
        ? savedJobs.filter((savedId) => String(savedId) !== String(id))
        : [...savedJobs, id];
      localStorage.setItem("savedJobs", JSON.stringify(nextSavedJobs));
      setIsSaved(!isSaved);
    } catch {
      setIsSaved(!isSaved);
    }
  };

  const matchBreakdown = job && {
    overall: job.matchBreakdown?.overall ?? job.matchScore ?? job.score ?? job.aiMatchScore,
    skills: job.matchBreakdown?.skills ?? job.skillsMatch,
    experience: job.matchBreakdown?.experience ?? job.experienceMatch,
    matchingSkills: job.matchBreakdown?.matchingSkills ?? job.matchingSkills ?? [],
    skillsToImprove: job.matchBreakdown?.skillsToImprove ?? job.skillsToImprove ?? [],
  };
  const backLabel = "Back to Explore Jobs";
  const existingApplication = job && getApplicationForJob(id);
  const applyButtonState = getApplyButtonState();
  const deadline = job?.deadlineDate || job?.application_deadline;
  const isExpired = deadline && new Date(deadline) < new Date();
  const responsibilities = asList(job?.responsibilities);
  const requirements = asList(job?.requirements);
  const skills = asList(job?.skills || job?.requiredSkills || job?.tags);
  const benefits = asList(job?.benefits);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#0871D1]"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="mb-4 text-[#B42318]">{error || "ስራው አልተገኘም።"}</p>
        <button
          onClick={() => navigate("/jobs")}
          className="inline-flex items-center gap-2 text-[#0871D1] hover:underline"
        >
          <ArrowLeft size={16} /> ወደ Explore Jobs ተመለስ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate("/explore-jobs")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={18} /> {backLabel}
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          {/* Header Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 lg:col-span-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="mb-3 inline-block rounded-full bg-[#EAF3FF] px-3 py-1 text-xs font-semibold text-[#0871D1]">
                  {job.type}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{job.title}</h1>
                {(job.companyName || job.company) && (
                  <p className="mt-2 flex items-center gap-2 text-slate-600">
                    <Building size={16} /> {job.companyName || job.company}
                  </p>
                )}
              </div>

            </div>

            {/* Quick Meta Stats */}
            <div className="mt-8 flex flex-wrap items-center justify-start gap-x-10 gap-y-4 border-t border-slate-100 pt-6 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={18} className="text-[#8FA5BA]" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-semibold text-[#8FA5BA]">Posted</span>
                <span>{job.postedAt || "Recently"}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
              <span className="mr-2 text-slate-500">Share:</span>
              {["Telegram"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleShare(label)}
                  className="rounded-lg bg-[#24A9E0] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 lg:col-span-3 lg:row-start-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Job Overview</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
              {[
                ["Employment", job.type],
                ["Experience", job.experienceLevel || job.experience],
                ["Location", job.location],
                ["Salary", job.salary],
                ["Deadline", job.deadline],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className="mt-1 font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="order-2 flex flex-col gap-5 lg:order-none lg:col-start-3 lg:row-start-3">
            <div className="order-2 relative z-10 rounded-2xl border-2 border-[#0871D1] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">{matchBreakdown?.overall != null ? 'Your AI Match' : 'How well do you match?'}</h2>
              {matchBreakdown?.overall != null && <>
                <div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-4xl font-black text-[#0871D1]">{matchBreakdown.overall}%</p><p className="text-xs font-bold text-slate-500">AI Match Score</p></div><div className="text-right text-sm">{matchBreakdown.skills != null && <p className="font-bold text-slate-700">Skills Match <span className="text-[#0871D1]">{matchBreakdown.skills}%</span></p>}{matchBreakdown.experience != null && <p className="mt-1 font-bold text-slate-700">Experience Match <span className="text-[#0871D1]">{matchBreakdown.experience}%</span></p>}</div></div>
                <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2"><div><p className="font-bold text-slate-700">Matching Skills</p><div className="mt-2 flex flex-wrap gap-1.5">{matchBreakdown.matchingSkills.map((skill) => <span key={skill} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{skill}</span>)}</div></div><div><p className="font-bold text-slate-700">Skills to Improve</p><div className="mt-2 flex flex-wrap gap-1.5">{matchBreakdown.skillsToImprove.map((skill) => <span key={skill} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{skill}</span>)}</div></div></div>
              </>}
              <p className="mt-3 leading-7 text-slate-600">
                {isAuthenticated
                  ? "Get an instant AI match score for this role - free, takes 3 minutes."
                  : "Complete your profile to see your personalized match score."}
              </p>
              <button
                type="button"
                onClick={handleCheckMatch}
                disabled={matchLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0871D1] px-5 py-3.5 text-lg font-bold text-white transition hover:bg-[#075EAE] disabled:opacity-70"
              >
                {matchLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {matchLoading ? "Checking..." : isAuthenticated ? "Check Your Match ->" : "Sign In to Continue"}
              </button>
              {matchScore !== null && <p className="mt-4 rounded-xl bg-[#EAF3FF] px-4 py-3 text-center font-bold text-[#0871D1]">{matchScore}% AI match score</p>}
              <p className="mt-4 text-center text-sm text-slate-500">Free · Powered by AI · Results shown instantly</p>
            </div>
            <div className="order-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Apply for this Job</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review the requirements and submit your application when you are ready.
              </p>
              {isExpired ? (
                <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                  Applications are closed.
                </p>
              ) : existingApplication ? (
                <button type="button" onClick={() => navigate(`/applications/${existingApplication.id}`, { state: { application: existingApplication } })} className="mt-5 w-full rounded-xl border border-emerald-600 px-5 py-3.5 font-bold text-emerald-700 transition hover:bg-emerald-50">
                  View Application
                </button>
              ) : (
                <button type="button" onClick={handleApplyAction} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0871D1] px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#075EAE]">
                  {applyButtonState.key === "login" ? <LogIn size={18} /> : <Send size={18} />}
                  {applyButtonState.label}
                </button>
              )}
              {!isExpired && !existingApplication && (
                <button type="button" onClick={handleToggleSave} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition ${isSaved ? "border-[#0871D1] bg-[#EAF3FF] text-[#075EAE]" : "border-slate-300 bg-white text-slate-700 hover:border-[#0871D1] hover:text-[#075EAE]"}`}>
                  <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Saved" : "Save this job"}
                </button>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-bold text-slate-900">Job Summary</h3>
              <div className="space-y-0 text-sm text-slate-600">
                {[
                  ["Sector", job.sector],
                  ["Experience", job.experienceLevel || job.experience],
                  ["Location", job.location],
                  ["Employment", job.type],
                  ["Deadline", job.deadline],
                  ["Education", job.educationLevel || job.education],
                ].filter(([, value]) => value).map(([label, value], index, items) => (
                  <div key={label} className={`grid grid-cols-[minmax(5rem,0.7fr)_minmax(0,1.3fr)] items-start gap-4 py-3 ${index < items.length - 1 ? "border-b border-slate-200" : ""}`}>
                    <span className="font-medium text-slate-500">{label}</span>
                    <span className="min-w-0 break-words text-right font-semibold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content & Requirements (በግራ በኩል የሚታይ) */}
          <div className="order-4 space-y-6 lg:order-none lg:col-span-2 lg:row-start-3">
            <div className="relative z-10 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="mb-4 text-xl font-bold text-slate-900">About the Job</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {getReadableDescription(job.description || job.fullDescription || job.shortDescription)}
              </p>
            </div>

            {responsibilities.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Responsibilities</h2>
                <ul className="list-disc space-y-3 pl-5 leading-7 text-slate-600 marker:text-[#0871D1]">
                  {responsibilities.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                </ul>
              </div>
            )}

            {requirements.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Requirements</h2>
                <ul className="list-disc space-y-3 pl-5 leading-7 text-slate-600 marker:text-[#0871D1]">
                  {requirements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                </ul>
              </div>
            )}

            {skills.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => <span key={`${skill}-${index}`} className="rounded-full bg-[#EAF3FF] px-3 py-1.5 text-sm font-semibold text-[#075EAE]">{skill}</span>)}
                </div>
              </div>
            )}

            {benefits.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Benefits & Additional Information</h2>
                <ul className="list-disc space-y-3 pl-5 leading-7 text-slate-600 marker:text-[#0871D1]">
                  {benefits.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default JobDetails;