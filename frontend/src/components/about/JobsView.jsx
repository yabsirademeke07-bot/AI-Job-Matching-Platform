import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { beginApplication } from "../../utils/applicationFlow";
import api from "../../services/api";
import { Bookmark, BriefcaseBusiness, Building2, Clock3, MapPin, Search } from "lucide-react";

const categories = ["All Categories", "Software Development", "Design", "Data & Analytics", "Marketing", "Finance", "Healthcare", "Education"];

export default function JobsView() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("All locations");
  const [type, setType] = useState("All job types");
  const [category, setCategory] = useState("All Categories");
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem("aboutSavedJobs") || "[]"));

  useEffect(() => {
    let active = true;
    api.get("/jobs", { params: { limit: 50 } })
      .then(({ data }) => {
        if (active) setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      })
      .catch((requestError) => {
        if (active) {
          console.error("Unable to load jobs:", requestError);
          setError(requestError.response?.data?.message || "Unable to load jobs. Please try again.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const toggleSaved = (id) => setSaved((current) => {
    const key = String(id);
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    localStorage.setItem("aboutSavedJobs", JSON.stringify(next));
    return next;
  });

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const jobCategory = job.sector || job.category || "";
      const jobType = job.job_type || job.jobType || "";
      const jobLocation = job.location || "";
      const searchable = [job.title, job.company_name, job.companyName, job.required_skills, job.description]
        .map((value) => Array.isArray(value) ? value.join(" ") : String(value || ""))
        .join(" ")
        .toLowerCase();
      return (!text || searchable.includes(text))
        && (location === "All locations" || jobLocation.toLowerCase().includes(location.toLowerCase()))
        && (type === "All job types" || jobType.toLowerCase().includes(type.toLowerCase()))
        && (category === "All Categories" || jobCategory.toLowerCase().includes(category.toLowerCase()));
    });
  }, [jobs, query, location, type, category]);

  const apply = (job) => beginApplication(job.title, job, navigate, { isAuthenticated, role: user?.role, sourcePage: "/about/jobs", returnPath: "/about/jobs" });
  return <section className="space-y-6"><header className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"><span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700"><BriefcaseBusiness className="h-3.5 w-3.5" /> Explore jobs</span><h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Find opportunities that match your skills and career goals.</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Search current employer-posted opportunities and filter by job details.</p></header><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by job title, skill, or company..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><select value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>All locations</option><option>Addis Ababa</option><option>Remote</option><option>Hybrid</option></select><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>All job types</option><option>Full-time</option><option>Part-time</option><option>Contract</option></select><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">{categories.map((item) => <option key={item}>{item}</option>)}</select></div></div>{loading ? <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading open jobs...</p> : error ? <p className="rounded-xl bg-rose-50 p-8 text-center text-sm text-rose-700">{error}</p> : filtered.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">ምንም ክፍት ስራዎች አልተገኙም (No active jobs posted yet)</p> : <><h2 className="text-xl font-black text-slate-900">All Available Jobs <span className="text-sm font-semibold text-slate-400">({filtered.length})</span></h2><div className="grid gap-4 md:grid-cols-2">{filtered.map((job) => <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">{job.title}</h3><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-500"><Building2 className="h-3.5 w-3.5" /> {job.company_name || job.companyName || "Company"}</p></div><button type="button" onClick={() => toggleSaved(job.id)} className={saved.includes(String(job.id)) ? "text-rose-500" : "text-slate-400 hover:text-rose-500"} aria-label={`Save ${job.title}`}><Bookmark className="h-5 w-5" fill={saved.includes(String(job.id)) ? "currentColor" : "none"} /></button></div><div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location || "Location not specified"}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{job.job_type || job.jobType || "Job type not specified"}</span></div><div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => navigate(`/jobs/${encodeURIComponent(String(job.id))}`)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">View Details</button><button type="button" onClick={() => apply(job)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">Apply Now</button></div></article>)}</div></>}</section>;
}
