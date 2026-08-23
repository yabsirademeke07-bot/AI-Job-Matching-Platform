import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Building, MapPin, Briefcase, DollarSign, Calendar, ArrowLeft, LogIn, Send, Sparkles, Loader2, MessageCircle, Copy } from "lucide-react";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { getApplicationSubmitPath, getNextApplicationStep, hasCompletedCv, hasCompletedProfile, setPendingApplication } from "../utils/applicationFlow";

const getReadableDescription = (description) => {
  if (!description) return "ምንም መግለጫ አልተካተተም።";
  if (typeof description !== "string") return String(description);

  const container = document.createElement("div");
  container.innerHTML = description;
  return container.textContent?.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim() || "ምንም መግለጫ አልተካተም።";
};

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchScore, setMatchScore] = useState(null);

  // 1. Fetch Job Details
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const previewJob = JSON.parse(localStorage.getItem('jobDetailsPreview') || 'null');
        if (previewJob && String(previewJob.id) === String(id)) {
          setJob(previewJob);
        } else {
          const response = await api.get(`/jobs/${id}`);
          setJob(response.data);
        }
      } catch (err) {
        console.error("Error fetching job details:", err);
        try {
          const previewJob = JSON.parse(localStorage.getItem('jobDetailsPreview') || 'null');
          if (previewJob && String(previewJob.id) === String(id)) setJob(previewJob);
          else setError("የስራ ዝርዝሩን መጫን አልተቻለም።");
        } catch {
          setError("የስራ ዝርዝሩን መጫን አልተቻለም።");
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  // 2. Click Logic for "Login to Apply" / "Apply Now"
  const handleApplyAction = () => {
    const role = (user?.role || '').toLowerCase();
    if (isAuthenticated && !['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(role)) {
      return;
    }
    setPendingApplication(id, job);
    if (!isAuthenticated) {
      // Login ካላደረገ -> ወደ Login ገጽ ይወስደዋል (የነበረበትን path በ state ይይዛል)
      navigate("/login", { state: { from: location.pathname, intent: "apply", jobId: id } });
    } else {
      const complete = hasCompletedCv() && hasCompletedProfile();
      navigate(complete ? getApplicationSubmitPath(id) : getNextApplicationStep(id));
    }
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

  const handleShare = (network) => {
    const shareUrl = window.location.href;
    const shareText = `${job.title} - ${job.companyName || job.company || "Job opportunity"}`;
    const shareLinks = {
      WhatsApp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      Telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    };

    if (network === "Copy Link") {
      navigator.clipboard?.writeText(shareUrl);
      return;
    }

    window.open(shareLinks[network], "_blank", "noopener,noreferrer");
  };

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
    <div className="min-h-screen bg-[#F4F3F0] px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={18} /> ወደ ኋላ ተመለስ
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Header Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 lg:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="mb-3 inline-block rounded-full bg-[#EAF3FF] px-3 py-1 text-xs font-semibold text-[#0871D1]">
                  {job.type || "Full-time"}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{job.title}</h1>
                <p className="mt-2 flex items-center gap-2 text-slate-600">
                  <Building size={16} /> {job.companyName || job.company || "Company Name"}
                </p>
              </div>

              {/* Dynamic Action Button (Login to Apply / Apply Now) */}
              <div>
                <button
                  onClick={handleApplyAction}
                  className={`w-full md:w-auto px-8 py-3.5 font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${"bg-[#0871D1] text-white hover:bg-[#075EAE]"
                    }`}
                >
                  {!isAuthenticated ? (
                    <>
                      <LogIn size={18} /> Login to Apply
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Apply Now
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Meta Stats */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 text-sm md:grid-cols-4">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={18} className="text-[#8FA5BA]" />
                <span>{job.location || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Briefcase size={18} className="text-[#8FA5BA]" />
                <span>{job.site || "On-site"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <DollarSign size={18} className="text-[#8FA5BA]" />
                <span>{job.salary ? `${job.salary} ETB` : "Negotiable"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar size={18} className="text-[#8FA5BA]" />
                <span>{job.deadline ? `Deadline: ${job.deadline}` : "Open"}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
              <span className="mr-2 text-slate-500">Share:</span>
              {[
                ["WhatsApp", "bg-[#20C86B]"],
                ["Telegram", "bg-[#24A9E0]"],
                ["LinkedIn", "bg-[#0967B8]"],
                ["Facebook", "bg-[#1877F2]"],
                ["Copy Link", "bg-slate-100 text-slate-800 border border-slate-200"],
              ].map(([label, color]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleShare(label)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 ${color}`}
                >
                  {label === "Copy Link" && <Copy className="mr-1 inline h-4 w-4" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="relative z-10 rounded-2xl border-2 border-[#0871D1] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">How well do you match?</h2>
              <p className="mt-3 leading-7 text-slate-600">Get an instant AI match score for this role - free, takes 3 minutes.</p>
              <button
                type="button"
                onClick={handleCheckMatch}
                disabled={matchLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0871D1] px-5 py-3.5 text-lg font-bold text-white transition hover:bg-[#075EAE] disabled:opacity-70"
              >
                {matchLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {matchLoading ? "Checking..." : "Check Your Match ->"}
              </button>
              {matchScore !== null && <p className="mt-4 rounded-xl bg-[#EAF3FF] px-4 py-3 text-center font-bold text-[#0871D1]">{matchScore}% AI match score</p>}
              <p className="mt-4 text-center text-sm text-slate-500">Free · Powered by AI · Results shown instantly</p>
            </div>
            <button type="button" onClick={handleApplyAction} className="w-full rounded-full border-2 border-[#0871D1] bg-white px-6 py-3.5 text-lg font-bold text-[#0871D1] transition hover:bg-[#EAF3FF]">
              {isAuthenticated ? "Apply Now ↗" : "Login to Apply ↗"}
            </button>
          </aside>

          {/* Main Content & Requirements (በግራ በኩል የሚታይ) */}
          <div className="space-y-6 lg:col-span-2">
            <div className="relative z-10 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Job Overview</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {getReadableDescription(job.description)}
              </p>
            </div>

            {job.requirements && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Requirements</h2>
                <ul className="space-y-2 text-slate-600">
                  {Array.isArray(job.requirements) ? (
                    job.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle size={16} className="mt-1 shrink-0 text-[#0871D1]" />
                        <span>{req}</span>
                      </li>
                    ))
                  ) : (
                    <p className="whitespace-pre-line">{job.requirements}</p>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Summary Side Panel (በቀኝ በኩል የሚታይ) */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Job Summary</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between border-b pb-2">
                  <span>Sector</span>
                  <span className="font-medium text-slate-900">{job.sector || "Tech"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Experience</span>
                  <span className="font-medium text-slate-900">{job.experienceLevel || "Mid Level"}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span>Education</span>
                  <span className="font-medium text-slate-900">{job.educationLevel || "Bachelor's"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3 lg:right-[390px]">
          <a href="https://wa.me/251900000000" target="_blank" rel="noreferrer" aria-label="Contact on WhatsApp" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#20C86B] text-white shadow-lg shadow-emerald-500/30"><MessageCircle className="h-7 w-7" /></a>
          <a href="/communication" aria-label="Open communication" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0871D1] text-white shadow-lg shadow-blue-500/30"><MessageCircle className="h-7 w-7" /></a>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;