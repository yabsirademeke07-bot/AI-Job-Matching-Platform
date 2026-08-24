import React from "react";
import { BriefcaseBusiness, Code2, Database, Palette, Sparkles } from "lucide-react";

const services = [
  { title: "Web Development", description: "Responsive, modern web applications built with clean architecture and user-focused interfaces.", icon: Code2 },
  { title: "UI/UX Design", description: "Thoughtful product design, intuitive flows, and visually consistent user experiences.", icon: Palette },
  { title: "Database Development", description: "Schema design, query optimization, and reliable data structures for scalable applications.", icon: Database },
  { title: "API Development", description: "Secure and maintainable APIs for authentication, business logic, and system integration.", icon: Sparkles },
  { title: "AI Integration", description: "AI-assisted features and smart workflows to improve user productivity and decision-making.", icon: BriefcaseBusiness },
];

export default function ServicesView({ onNavigate }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          Services
        </div>

        <h2 className="text-3xl font-bold text-slate-900">What I Offer</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {services.map(({ title, description, icon: Icon }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate("contact")}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Start a Project
        </button>
      </div>
    </section>
  );
}
