import { Code2, Database, Layers3, Palette, Rocket } from "lucide-react";

const skills = [
  { name: "JavaScript", level: "Expert", value: 95 },
  { name: "React", level: "Expert", value: 95 },
  { name: "Node.js", level: "Advanced", value: 90 },
  { name: "MySQL", level: "Advanced", value: 88 },
  { name: "Python", level: "Intermediate", value: 78 },
  { name: "Communication", level: "Advanced", value: 90 },
];

export default function SkillsView() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
          <Code2 className="h-3.5 w-3.5" />
          Skills
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Core Technical Skills
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {skills.map(({ name, level, value }) => (
          <div key={name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{level}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${value}%` }} />
            </div>
            <div className="mt-2 text-right text-xs font-medium text-slate-500">{value}%</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Palette className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Frontend</h3>
          <p className="mt-2 text-sm text-slate-600">React, JavaScript, UI architecture, responsive design.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Backend</h3>
          <p className="mt-2 text-sm text-slate-600">Node.js, API development, MySQL, data modeling.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Rocket className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Soft Skills</h3>
          <p className="mt-2 text-sm text-slate-600">Communication, problem solving, collaboration, product thinking.</p>
        </div>
      </div>
    </section>
  );
}
