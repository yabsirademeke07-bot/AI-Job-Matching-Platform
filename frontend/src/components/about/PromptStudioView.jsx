import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, FileText, Sparkles, Target, Wand2 } from "lucide-react";
import api from "../../services/api";

const careerTools = [
  ["Analyze My CV", "/cv-extraction", FileText],
  ["Browse Open Jobs", "/jobs", BriefcaseBusiness],
  ["Review My Matches", "/ai-matches", Target],
  ["Improve My Profile", "/profile/edit", Wand2],
];

export default function PromptStudioView() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/jobs", { params: { page: 1, limit: 5 } })
      .then(({ data }) => {
        if (active) setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      })
      .catch((requestError) => {
        if (active) {
          console.error("Unable to load open jobs:", requestError);
          setError(requestError.response?.data?.message || "Unable to load open jobs.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return <section className="space-y-6">
    <header className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"><span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700"><Sparkles className="h-3.5 w-3.5" /> Career tools</span><h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Explore real opportunities and career tools.</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Open jobs and candidate-specific recommendations come from your account and the platform database.</p></header>
    <div className="grid gap-3 sm:grid-cols-2">{careerTools.map(([label, path, Icon]) => <button key={path} type="button" onClick={() => navigate(path)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50"><Icon className="h-4 w-4 text-blue-600" />{label}<ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></button>)}</div>
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><BriefcaseBusiness className="h-5 w-5 text-violet-600" />Open Jobs</h2>{loading ? <p className="text-sm text-slate-500">Loading open jobs...</p> : error ? <p className="text-sm text-rose-700">{error}</p> : jobs.length ? <div className="space-y-3">{jobs.map((job) => <button key={job.id} type="button" onClick={() => navigate(`/jobs/${encodeURIComponent(String(job.id))}`)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-left hover:bg-blue-50"><span className="text-sm font-bold text-slate-800">{job.title}</span><span className="text-xs text-slate-500">{job.company_name || "Company"}</span></button>)}</div> : <p className="text-sm text-slate-600">ምንም ክፍት ስራዎች አልተገኙም (No active jobs posted yet)</p>}</article>
  </section>;
}
