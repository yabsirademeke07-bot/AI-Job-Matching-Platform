import {
  BriefcaseBusiness,
  CalendarRange,
  CheckCircle2,
  MapPin,
  Sparkles,
} from "lucide-react";

const experiences = [
  {
    role: "Full Stack / Product Engineer",
    company: "Job Matching",
    location: "Remote",
    start: "2024",
    end: "Present",
    type: "Full-time",
    summary:
      "Built full-stack job matching flows using React and Node.js/Express for end-to-end product delivery.",
    responsibilities: [
      "Built full-stack job matching flows using React and Node.js/Express for end-to-end product delivery.",
      "Designed MySQL schemas and optimized relational queries to support reporting and operational workflows.",
      "Implemented REST APIs, validation layers, and secure authentication for production reliability.",
      "Partnered with design and product teammates to ship polished, maintainable interfaces.",
    ],
    tech: ["React", "Node.js", "Express", "MySQL", "Tailwind CSS", "Git"],
  },
  {
    role: "Frontend & React Developer",
    company: "Digital Product Studio",
    location: "Hybrid",
    start: "2023",
    end: "2024",
    type: "Full-time",
    summary:
      "Designed and built responsive interfaces for digital products with a strong focus on usability and maintainability.",
    responsibilities: [
      "Built reusable UI components and responsive product pages across several business workflows.",
      "Collaborated with designers and product teams to translate wireframes into polished front-end experiences.",
      "Improved interface consistency and performance across production-facing client projects.",
    ],
    tech: ["React", "JavaScript", "Tailwind", "UI/UX", "Vite", "CSS"],
  },
];

export default function ExperienceView() {
  return (
    <section className="space-y-8">
      <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            Career & Experience
          </span>
        </div>

        <h2 className="text-[2.5rem] font-bold leading-tight tracking-[-0.03em] text-slate-900">
          Professional Work History
        </h2>

        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
          My journey building scalable web applications, full stack architectures, and polished product experiences.
        </p>
      </div>

      <div className="space-y-6">
        {experiences.map((exp, index) => (
          <div key={index} className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>

              <div className="flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">{exp.role}</h3>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
                        {exp.company}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        {exp.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <CalendarRange className="h-3.5 w-3.5" />
                      {exp.start} - {exp.end}
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {exp.type}
                    </span>
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                  {exp.responsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap gap-2">
                  {exp.tech.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
