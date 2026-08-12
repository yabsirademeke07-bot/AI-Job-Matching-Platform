import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Building, MapPin, Briefcase, DollarSign, Calendar, ArrowLeft, LogIn, Send } from "lucide-react";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch Job Details
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/jobs/${id}`);
        setJob(response.data);
      } catch (err) {
        console.error("Error fetching job details:", err);
        setError("የስራ ዝርዝሩን መጫን አልተቻለም።");
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
    if (!isAuthenticated) {
      // Login ካላደረገ -> ወደ Login ገጽ ይወስደዋል (የነበረበትን path በ state ይይዛል)
      navigate("/login", { state: { from: location.pathname } });
    } else {
      // Login ካደረገ -> ቀጥታ ወደ CV Upload ገጽ ይወስደዋል
      navigate(`/upload-cv?jobId=${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-500 mb-4">{error || "ስራው አልተገኘም።"}</p>
        <button 
          onClick={() => navigate("/jobs")}
          className="inline-flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> ወደ Explore Jobs ተመለስ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} /> ወደ ኋላ ተመለስ
      </button>

      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-3">
              {job.type || "Full-time"}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{job.title}</h1>
            <p className="text-slate-600 flex items-center gap-2 mt-2">
              <Building size={16} /> {job.companyName || "Company Name"}
            </p>
          </div>

          {/* Dynamic Action Button (Login to Apply / Apply Now) */}
          <div>
            <button
              onClick={handleApplyAction}
              className={`w-full md:w-auto px-8 py-3.5 font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
                !isAuthenticated 
                  ? "bg-amber-600 hover:bg-amber-700 text-white"  // Login ላላደረገ
                  : "bg-blue-600 hover:bg-blue-700 text-white"    // Login ላደረገ
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin size={18} className="text-slate-400" />
            <span>{job.location || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Briefcase size={18} className="text-slate-400" />
            <span>{job.site || "On-site"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <DollarSign size={18} className="text-slate-400" />
            <span>{job.salary ? `${job.salary} ETB` : "Negotiable"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={18} className="text-slate-400" />
            <span>{job.deadline ? `Deadline: ${job.deadline}` : "Open"}</span>
          </div>
        </div>
      </div>

      {/* Main Content & Requirements (በግራ በኩል የሚታይ) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Job Overview</h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
              {job.description || "ምንም መግለጫ አልተካተተም።"}
            </p>
          </div>

          {job.requirements && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Requirements</h2>
              <ul className="space-y-2 text-slate-600">
                {Array.isArray(job.requirements) ? (
                  job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-500 mt-1 shrink-0" />
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
    </div>
  );
};

export default JobDetails;