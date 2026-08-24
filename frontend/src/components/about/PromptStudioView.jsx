import { Bot, FileText, MessageSquareText, Sparkles, Wand2 } from "lucide-react";

const promptCards = [
  { title: "Generate Cover Letter", description: "Create tailored cover letters that match a specific role and your background.", icon: FileText },
  { title: "Improve CV", description: "Enhance your CV wording, structure, and impact for better recruiter visibility.", icon: Sparkles },
  { title: "Interview Questions", description: "Prepare role-specific interview questions and strong answer strategies.", icon: MessageSquareText },
  { title: "Job Application Prompt", description: "Generate refined application prompts for job portals and recruiter outreach.", icon: Wand2 },
  { title: "Custom AI Prompt", description: "Draft bespoke AI instructions for niche tasks and specific career goals.", icon: Bot },
];

export default function PromptStudioView() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
          <Wand2 className="h-3.5 w-3.5" />
          Prompt Studio
        </div>

        <h2 className="text-3xl font-bold text-slate-900">AI Career Tools</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {promptCards.map(({ title, description, icon: Icon }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
              <Sparkles className="h-4 w-4" /> Ready
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
