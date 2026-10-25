import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Building2, FileSearch, Gauge, Layers3, Search, ShieldCheck, Target, Users } from "lucide-react";
import api from "../../services/api";

const steps = [[FileSearch, "Create Profile / Upload CV"], [Gauge, "AI Analyzes Skills & Experience"], [Target, "AI Calculates Match Score"], [BriefcaseBusiness, "Get Recommended Jobs"]];
const features = [[Target, "AI-Powered Matching", "Match skills, experience, and qualifications."], [Gauge, "Smart Match Score", "Understand why a job fits your profile."], [FileSearch, "CV Analysis", "Extract useful skills and experience from resumes."], [BriefcaseBusiness, "Personalized Recommendations", "Discover opportunities aligned with your goals."], [Search, "Smart Job Search", "Find roles by title, location, type, and salary."], [Layers3, "Application Tracking", "Follow every application and next step."]];
const users = [[Users, "Job Seeker", "Create a profile, upload a CV, get AI matches, apply, and track applications."], [Building2, "Employer", "Post jobs, manage applicants, find candidates, and schedule interviews."], [ShieldCheck, "Admin", "Manage users, employers, jobs, and platform activity."]];

export default function OverviewView({ onNavigate }) {
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const openJobs = () => onNavigate?.("jobs");

  useEffect(() => {
    let active = true;
    api.get("/jobs", { params: { page: 1, limit: 3 } })
      .then(({ data }) => {
        if (active) setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      })
      .catch((requestError) => {
        if (active) {
          console.error("Unable to load recommended jobs:", requestError);
          setJobsError(requestError.response?.data?.message || "Unable to load jobs.");
        }
      })
      .finally(() => {
        if (active) setJobsLoading(false);
      });
    return () => { active = false; };
  }, []);

  return <section className="space-y-8">
    <header className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Welcome to AI Job Match</p><h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">Find the right opportunities with AI-powered matching.</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">Connect your skills and career goals with relevant jobs through intelligent profile analysis, transparent match scores, and personalized recommendations.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={openJobs} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Search className="h-4 w-4" /> Explore Jobs <ArrowRight className="h-4 w-4" /></button></div></header>
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Target className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">How AI matching works</p><h2 className="mt-1 text-2xl font-black text-slate-900">From profile to opportunity</h2></div></div><div className="mt-6 grid gap-3 md:grid-cols-4">{steps.map(([Icon, label], index) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">{index + 1}</span><Icon className="mx-auto mt-4 h-5 w-5 text-blue-600" /><p className="mt-2 text-sm font-bold text-slate-700">{label}</p></div>)}</div></article>
    <div><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Built for better hiring</p><h2 className="mt-1 text-2xl font-black text-slate-900">Key platform features</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, description]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-blue-600" /><h3 className="mt-4 font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</div></div>
    <div><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">For everyone</p><h2 className="mt-1 text-2xl font-black text-slate-900">Who uses the platform?</h2></div><div className="grid gap-4 md:grid-cols-3">{users.map(([Icon, title, description]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-emerald-600" /><h3 className="mt-4 font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</div></div>
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-cyan-600" /><h2 className="text-xl font-black text-slate-900">Open Jobs</h2></div>{jobsLoading ? <p className="text-sm text-slate-500">Loading open jobs...</p> : jobsError ? <p className="text-sm text-rose-700">{jobsError}</p> : jobs.length ? <div className="space-y-3">{jobs.map((job) => <div key={job.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold text-slate-800">{job.title}</p><span className="text-xs text-slate-500">{job.company_name || "Company"}</span></div>)}</div> : <p className="text-sm text-slate-600">ምንም ክፍት ስራዎች አልተገኙም (No active jobs posted yet)</p>}<button type="button" onClick={openJobs} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">Explore All Jobs <ArrowRight className="h-4 w-4" /></button></article>
  </section>;
}
