import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, Building2, Check, ArrowRight, Sparkles } from "lucide-react";
import { getNextApplicationStep, getPendingApplication } from "../utils/applicationFlow";
import { useAuth } from "../context/AuthContext";

const RoleSelection = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");
  const pendingJobId = new URLSearchParams(window.location.search).get('jobId') || getPendingApplication()?.jobId || '';

  const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

  const handleRoleSubmit = async (roleToSubmit) => {
    const role = roleToSubmit || selectedRole;

    if (!role) {
      setError("Please select an account role to continue");
      return;
    }

    try {
      // Persist the role locally immediately so the next protected route can render.
      const storedUser = localStorage.getItem("user");
      const existingUser = storedUser ? JSON.parse(storedUser) : {};
      const userId = existingUser.id || existingUser.userId;

      const updatedUser = {
        ...existingUser,
        role: role === "seeker" ? "job_seeker" : role,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSession({ token: localStorage.getItem("token"), user: updatedUser });

      // Sync the choice with the backend when an authenticated user ID is available.
      if (userId) {
        const response = await fetch(`${API_URL.replace(/\/$/, "")}/set-role`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("token") ? { Authorization: "Bearer " + localStorage.getItem("token") } : {}),
          },
          body: JSON.stringify({ userId, role }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Unable to save your role");
        }
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) localStorage.setItem("token", data.token);
        setSession({ token: data.token || localStorage.getItem("token"), user: data.user || updatedUser });
      }

      if (role === "employer") {
        navigate("/employee-info");
      } else if (pendingJobId) {
        navigate(getNextApplicationStep(pendingJobId));
      } else {
        navigate("/personal-info");
      }
    } catch (err) {
      console.error("Error updating user role:", err);
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const localRole = role === "seeker" ? "job_seeker" : role;
      localStorage.setItem("user", JSON.stringify({ ...storedUser, role: localRole }));
      localStorage.setItem("token", localStorage.getItem("token") || "frontend-demo-token");
      setSession({ token: localStorage.getItem("token"), user: { ...storedUser, role: localRole } });
      navigate(localRole === "employer" ? "/employee-info" : "/personal-info");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100/80 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center p-6 md:p-12 lg:p-16 font-sans">
      <div className="w-full max-w-7xl bg-white rounded-3xl p-6 md:p-10 lg:p-14 shadow-2xl border border-slate-200/80">

        {/* Main split: Intro + Role Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left: Intro / Headline */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">Welcome to SmartRecruit</h1>
                <p className="mt-2 text-[16px] md:text-[17px] text-slate-600 max-w-xl">
                  Choose how you want to use the platform. Create a polished profile, get matched with relevant roles, or post jobs and evaluate candidates using AI-powered tools.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-[15px] md:text-[16px] text-slate-700 font-medium">Why choose SmartRecruit?</p>
              <ul className="space-y-2 text-[15px] md:text-[16px] text-slate-600 list-inside">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> AI resume parsing & matching</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> Intelligent candidate recommendations</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> Secure, fast hiring workflows</li>
              </ul>
            </div>

          </div>

          {/* Right: Role Cards */}
          <div className="lg:col-span-7">
            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl font-medium text-center border border-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Job Seeker Card */}
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedRole('seeker'); setError(''); } }}
                onClick={() => { setSelectedRole('seeker'); setError(''); }}
                className={`relative flex flex-col justify-between p-6 md:p-8 rounded-3xl border transition-transform duration-200 ease-in-out cursor-pointer shadow-sm hover:shadow-lg focus:shadow-lg outline-none ${
                  selectedRole === 'seeker'
                    ? 'border-blue-600 bg-gradient-to-b from-white to-blue-50 transform scale-[1.01] shadow-blue-500/20'
                    : 'border-slate-200 bg-white hover:-translate-y-1'
                }`}
              >
                <div>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${selectedRole === 'seeker' ? 'bg-gradient-to-tr from-blue-600 to-indigo-500' : 'bg-slate-100 text-slate-600'}`}>
                      <UserCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-900">Job Seeker</h3>
                      <p className="mt-1 text-[15px] text-slate-600 max-w-xs">Build your profile, upload CV, and get matched with opportunities.</p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3 text-[15px] text-slate-700">
                    <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> Personal details & skill mapping</li>
                    <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> One-click CV upload & AI Analysis</li>
                    <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> Smart Job Seeker Dashboard</li>
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${selectedRole === 'seeker' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {selectedRole === 'seeker' ? 'Selected' : 'Select'}
                    </span>
                    {selectedRole === 'seeker' && (
                      <span className="text-xs text-slate-500">You're choosing this role</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setSelectedRole('seeker'); handleRoleSubmit('seeker'); }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition cursor-pointer ${selectedRole === 'seeker' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Active badge */}
                {selectedRole === 'seeker' && (
                  <div className="absolute -top-3 -right-3">
                    <div className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow">Active</div>
                  </div>
                )}
              </div>

              {/* Employer Card */}
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedRole('employer'); setError(''); } }}
                onClick={() => { setSelectedRole('employer'); setError(''); }}
                className={`relative flex flex-col justify-between p-6 md:p-8 rounded-3xl border transition-transform duration-200 ease-in-out cursor-pointer shadow-sm hover:shadow-lg focus:shadow-lg outline-none ${
                  selectedRole === 'employer'
                    ? 'border-blue-600 bg-gradient-to-b from-white to-blue-50 transform scale-[1.01] shadow-blue-500/20'
                    : 'border-slate-200 bg-white hover:-translate-y-1'
                }`}
              >
                <div>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${selectedRole === 'employer' ? 'bg-gradient-to-tr from-blue-600 to-indigo-500' : 'bg-slate-100 text-slate-600'}`}>
                      <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-900">Employer / Hiring Manager</h3>
                      <p className="mt-1 text-[15px] text-slate-600 max-w-xs">Post jobs, screen candidates, and leverage AI hiring insights.</p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3 text-[15px] text-slate-700">
                    <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> Company profile & contact details</li>
                    <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> Post & manage hiring requirements</li>
                    <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" /> Access Employer Dashboard</li>
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${selectedRole === 'employer' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {selectedRole === 'employer' ? 'Selected' : 'Select'}
                    </span>
                    {selectedRole === 'employer' && (
                      <span className="text-xs text-slate-500">You're choosing this role</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setSelectedRole('employer'); handleRoleSubmit('employer'); }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition cursor-pointer ${selectedRole === 'employer' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Active badge */}
                {selectedRole === 'employer' && (
                  <div className="absolute -top-3 -right-3">
                    <div className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow">Active</div>
                  </div>
                )}
              </div>

            </div>

            {/* Mobile stacked Continue button */}
            <div className="mt-6 md:hidden">
              <button
                type="button"
                onClick={() => handleRoleSubmit()}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default RoleSelection;
