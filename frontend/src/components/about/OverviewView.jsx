import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  Gauge,
  MapPin,
  Sparkles,
  Target,
} from "lucide-react";

const stats = [
  { label: "Profile completion", value: "82%", tone: "bg-blue-50 text-blue-700" },
  { label: "AI Match Score", value: "94%", tone: "bg-emerald-50 text-emerald-700" },
  { label: "Top Skills", value: "React / Node.js", tone: "bg-violet-50 text-violet-700" },
  { label: "Recent Applications", value: "12", tone: "bg-amber-50 text-amber-700" },
  { label: "Recommended Jobs", value: "7", tone: "bg-cyan-50 text-cyan-700" },
];

const recentApplications = [
  { company: "Beti", role: "Frontend Engineer", status: "Interview" },
  { company: "Amanu Labs", role: "Product Engineer", status: "Shortlisted" },
  { company: "NexaWorks", role: "Full Stack Developer", status: "Applied" },
];

const recommendedJobs = [
  { title: "Senior Frontend Engineer", match: "96%" },
  { title: "Full Stack Product Engineer", match: "92%" },
  { title: "React Developer", match: "89%" },
];

export default function OverviewView({ onNavigate }) {
  const handleProjects = () => onNavigate?.("projects");
  const handleExperience = () => onNavigate?.("experience");
  const handleContact = () => onNavigate?.("contact");

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-indigo-600">
          <Sparkles className="h-4 w-4" />
          Product engineer • full-stack builder • AI-ready problem solver
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          I build polished digital products that connect user needs with scalable engineering.
        </h2>

        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          I create responsive interfaces, efficient APIs, and reliable product workflows that help teams ship faster and users stay engaged.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleProjects}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            View projects
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={handleExperience}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Experience
          </button>

          <button
            onClick={handleContact}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Contact
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`inline-flex rounded-xl px-2.5 py-1.5 text-xs font-semibold ${stat.tone}`}>
              {stat.label}
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Top Skills</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {['JavaScript', 'React', 'Node.js', 'MySQL', 'Python', 'Communication'].map((skill) => (
              <span key={skill} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <Gauge className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">AI Match Overview</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>Skills match</span>
                <span>96%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 w-[96%] rounded-full bg-emerald-500" />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>Experience fit</span>
                <span>91%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 w-[91%] rounded-full bg-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <BriefcaseBusiness className="h-5 w-5 text-violet-600" />
            <h3 className="text-lg font-semibold">Recent Applications</h3>
          </div>
          <div className="space-y-3">
            {recentApplications.map((item) => (
              <div key={item.company + item.role} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.role}</p>
                  <p className="text-xs text-slate-500">{item.company}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <MapPin className="h-5 w-5 text-cyan-600" />
            <h3 className="text-lg font-semibold">Recommended Jobs</h3>
          </div>
          <div className="space-y-3">
            {recommendedJobs.map((job) => (
              <div key={job.title} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-700">{job.title}</p>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                  {job.match}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-slate-900">
          <Code2 className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">Career Snapshot</h3>
        </div>
        <p className="text-sm leading-7 text-slate-600">
          I focus on building user-centered web applications, improving product workflows, and integrating AI-powered experiences that deliver measurable business value.
        </p>
      </div>
    </section>
  );
}