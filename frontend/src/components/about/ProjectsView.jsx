import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Globe,
  Sparkles,
  ArrowUpRight,
  Rocket,
  FolderKanban,
} from "lucide-react";

const accentClasses = {
  indigo: {
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-600",
    border: "border-indigo-600",
    lightBg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300",
  },
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-600",
    border: "border-emerald-600",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  },
  violet: {
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-600",
    border: "border-violet-600",
    lightBg: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-600",
    border: "border-amber-600",
    lightBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  },
  cyan: {
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-600",
    border: "border-cyan-600",
    lightBg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300",
  },
  rose: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-600",
    border: "border-rose-600",
    lightBg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
  },
};

const categories = ["All", "Full Stack", "AI / Machine Learning", "Frontend"];

export default function ProjectsView({
  onNavigate,
  lang = "en",
  accent = "indigo",
  onOpenProjectModal,
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = [
    {
      id: 1,
      title: "Career Matching Platform",
      titleAm: "የስራ ግንኙነት መድረክ",
      subtitle: "Matching system",
      description: "A modern application for discovering jobs and matching candidates to employers.",
      descriptionAm: "የስራ እድሎችን ለማግኘት እና ተመራቂ ተጣጣሚዎችን ለማወዳደር የተዘጋጀ መድረክ።",
      category: "Full Stack",
      technologies: ["React", "Node", "MySQL"],
      metrics: "High impact",
      image: "/images/project-1.jpg",
      githubUrl: "#",
      demoUrl: "#",
    },
    {
      id: 2,
      title: "AI Productivity Suite",
      titleAm: "የአይ ምርታማነት ስብስብ",
      subtitle: "AI automation",
      description: "Workflow dashboards and intelligent automation for faster operational decisions.",
      descriptionAm: "ከአይ የተደገፉ እና የስራ ፍጥነትን የሚያሳድጉ መሳሪያዎች።",
      category: "AI / Machine Learning",
      technologies: ["AI", "React", "FastAPI"],
      metrics: "Automation",
      image: "/images/project-2.jpg",
      githubUrl: "#",
      demoUrl: "#",
    },
  ].filter((project) => {
    const matchesCat =
      selectedCategory === "All" || project.category === selectedCategory;

    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.titleAm.includes(searchQuery) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.technologies.some((tech) =>
        tech.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesCat && matchesSearch;
  });

  return (
    <div id="projects-view-container" className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/90 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${accentClasses[accent].lightBg}`}>
              {lang === "am" ? "የስራዎች ስብስብ" : "Featured Work"}
            </span>
            <span className="text-xs text-slate-400">Production Systems</span>
          </div>

          <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {lang === "am" ? "የተመረጡ ፕሮጀክቶች እና የቀጥታ ማሳያዎች" : "Featured Projects & Production Systems"}
          </h1>
        </div>

        <button
          onClick={() => onNavigate && onNavigate("about")}
          className="flex items-center gap-2 self-start rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === "am" ? "ወደ About ተመለስ" : "Back to Overview"}</span>
        </button>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "am" ? "በስም ወይም በቴክኖሎጂ ፈልግ..." : "Search by name, stack or keyword..."}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? `${accentClasses[accent].bg} text-white shadow-sm`
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-800/90"
          >
            <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-900 sm:h-52">
              <img
                src={project.image}
                alt={project.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute left-3 top-3 rounded-md bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white">
                {project.category}
              </div>

              {project.metrics && (
                <div className="absolute bottom-3 left-3 rounded-md border border-emerald-500/40 bg-emerald-950/85 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  {project.metrics}
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between space-y-3 p-5 sm:p-6">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {lang === "am" ? project.titleAm : project.title}
                </h2>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {project.subtitle}
                </p>

                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
                  {lang === "am" ? project.descriptionAm : project.description}
                </p>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex flex-wrap gap-1.5">
                  {project.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onOpenProjectModal && onOpenProjectModal(project)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <span>{lang === "am" ? "ዝርዝር እይ" : "Case Details"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                      title="Repository"
                    >
                      <BriefcaseBusiness className="h-4 w-4" />
                    </a>

                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                      title="Live Demo"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {lang === "am" ? "የእርስዎን ፕሮጀክት አብረን እንገንባ?" : "Have a custom system or product to build?"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === "am" ? "የስራ ጥያቄዎን ወይም ሀሳብዎን ለመላክ" : "Explore services or submit a project proposal."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate("services")}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
          >
            {lang === "am" ? "አገልግሎቶችን እይ" : "View Services"}
          </button>

          <button
            onClick={() => onNavigate && onNavigate("contact")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white ${accentClasses[accent].bg} transition-opacity hover:opacity-90`}
          >
            {lang === "am" ? "አግኙኝ (Contact)" : "Get in Touch"}
          </button>
        </div>
      </div>
    </div>
  );
}
