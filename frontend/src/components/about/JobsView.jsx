import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { beginApplication } from '../../utils/applicationFlow';
import { BriefcaseBusiness, Clock3, MapPin, Search, Star, Bookmark } from "lucide-react";

const jobs = [
  {
    id: 'about-job-1',
    title: "Senior Frontend Engineer",
    company: "Beti Labs",
    location: "Remote",
    type: "Full-time",
    match: 96,
    salary: "$2,500 - $3,200 / mo",
    keywords: ["React", "JavaScript", "UI/UX"],
    description: "Build polished customer-facing experiences and help improve product workflows across the platform.",
  },
  {
    id: 'about-job-2',
    title: "Full Stack Product Engineer",
    company: "Amanu Digital",
    location: "Hybrid",
    type: "Full-time",
    match: 92,
    salary: "$2,200 - $2,900 / mo",
    keywords: ["Node.js", "MySQL", "React"],
    description: "Lead product engineering across API development, database integration, and responsive frontend delivery.",
  },
  {
    id: 'about-job-3',
    title: "React Developer",
    company: "NexaWorks",
    location: "On-site",
    type: "Contract",
    match: 88,
    salary: "$1,800 - $2,300 / mo",
    keywords: ["React", "JavaScript", "Component Design"],
    description: "Create clean frontend experiences and maintain a consistent design system across multiple products.",
  },
];

const filters = ["All", "Remote", "Hybrid", "Contract", "Full-time"];

export default function JobsView() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filteredJobs = jobs.filter((job) => {
    const matchesFilter = selectedFilter === "All" || job.type === selectedFilter || job.location === selectedFilter;
    const query = search.toLowerCase();
    const matchesSearch =
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.keywords.some((keyword) => keyword.toLowerCase().includes(query));

    return matchesFilter && matchesSearch;
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          Jobs
        </div>

        <h2 className="text-3xl font-bold text-slate-900">Search and Apply</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles or companies"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedFilter === filter ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <article key={job.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{job.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>{job.company}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-slate-500" /> {job.location}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">AI Match {job.match}%</span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">{job.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {job.type}
              </span>
              <span>{job.salary}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {job.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
                  {keyword}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => beginApplication(job.id, job, navigate, { isAuthenticated, role: user?.role, sourcePage: '/about', returnPath: '/about' })} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Apply Now
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Bookmark className="h-4 w-4" /> Save Job
              </button>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                Top match
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
