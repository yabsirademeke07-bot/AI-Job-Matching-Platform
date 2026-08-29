import { ArrowRight, BrainCircuit, BriefcaseBusiness, CheckCircle2, FileSearch, Laptop, MapPin, MessageSquareText, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";

const features = [
  [BrainCircuit, "AI Job Matching", "Compare skills, experience, education, title, and preferences to produce a clear match score."],
  [FileSearch, "CV Analysis", "Turn resume information into structured skills and qualifications that improve job discovery."],
  [BriefcaseBusiness, "Smart Recommendations", "Surface relevant opportunities and help job seekers focus on roles that fit."],
  [CheckCircle2, "Application Tracking", "Keep applications, statuses, interviews, and next steps organized in one place."],
  [MessageSquareText, "Employer Communication", "Support direct communication between candidates and hiring teams."],
  [ShieldCheck, "Trusted Workflows", "Give employers and administrators tools for responsible recruitment management."],
];

const roles = [
  [Users, "Job Seekers", "Upload a CV, discover suitable jobs, understand skill gaps, and apply with confidence."],
  [BriefcaseBusiness, "Employers", "Post opportunities, review suitable candidates, manage applications, and schedule interviews."],
  [ShieldCheck, "Administrators", "Manage users and jobs while monitoring the platform and supporting a trusted marketplace."],
];

const heroImageUrl = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

export default function PlatformAboutView({ onNavigate }) {
  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 text-slate-900 shadow-xl shadow-blue-100/50 sm:p-8 lg:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5">
            <img src={heroImageUrl} alt="AI hiring platform team" className="absolute inset-0 h-full w-full object-cover opacity-85" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_rgba(255,255,255,0.06)_35%,_rgba(2,6,23,0.4)_100%)]" />
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-100/70" />
            <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-cyan-100/60" />
            <div className="relative flex min-h-[320px] items-center justify-center">
              <div className="absolute left-2 top-2 w-52 rounded-[22px] border border-slate-100 bg-white/90 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:left-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner"><FileSearch className="h-4 w-4" /></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Step 01</p>
                    <p className="text-[17px] font-black text-slate-800">CV / Profile</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">React</span>
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Node.js</span>
                </div>
              </div>
              <div className="absolute right-2 top-16 w-44 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-lg backdrop-blur-sm sm:right-4"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><BrainCircuit className="h-4 w-4" /></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 02</p><p className="text-xs font-black text-slate-800">AI Analysis</p></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-4/5 rounded-full bg-violet-500" /></div></div>
              <div className="relative z-10 mt-8 flex h-44 w-40 flex-col items-center justify-end rounded-2xl border border-slate-100 bg-white/90 pb-3 shadow-xl backdrop-blur-sm"><div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-blue-50 shadow-md"><img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=280&q=90" alt="Job seeker profile" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><div className="mt-[-2px] flex h-9 w-20 items-center justify-center rounded-t-lg border-2 border-blue-500 bg-blue-100 text-blue-600 shadow-sm"><Laptop className="h-6 w-6" aria-hidden="true" /></div><span className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Job seeker</span></div>
              <div className="absolute bottom-2 left-2 w-48 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-lg backdrop-blur-sm sm:left-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 03</p><p className="text-xs font-black text-slate-800">Job Matching</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">95%</span></div><p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><MapPin className="h-3 w-3" /> Best fit found</p></div>
              <div className="absolute bottom-10 right-2 w-44 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-lg backdrop-blur-sm sm:right-4"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><BriefcaseBusiness className="h-4 w-4" /></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 04</p><p className="text-xs font-black text-slate-800">Recommended Jobs</p></div></div></div>
            </div>
          </div>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700"><Sparkles className="h-3.5 w-3.5" /> About the platform</div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Smart Job Matching Powered by AI</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Our platform helps job seekers discover opportunities that match their skills, experience, and career goals. Using AI-powered analysis, we provide personalized job recommendations and match scores.</p>
            <button type="button" onClick={() => onNavigate?.("jobs")} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">Explore opportunities <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Our mission</p><h2 className="mt-2 text-2xl font-black text-slate-900">Make job searching smarter, faster, and more personal.</h2><p className="mt-3 text-sm leading-7 text-slate-600">We help people find meaningful work and help employers discover qualified talent through transparent, data-informed matching.</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Our vision</p><h2 className="mt-2 text-2xl font-black text-slate-900">Better matches for every career journey.</h2><p className="mt-3 text-sm leading-7 text-slate-600">A fairer, more efficient job marketplace where every recommendation explains why a role fits and what to improve next.</p></article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BrainCircuit className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">How it works</p><h2 className="mt-1 text-2xl font-black text-slate-900">From profile to opportunity</h2></div></div>
        <div className="mt-6 grid gap-3 md:grid-cols-5">{["CV / Profile", "Skills & Experience", "AI Analysis", "Match Score", "Recommended Jobs"].map((step, index) => <div key={step} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">{index + 1}</span><p className="mt-3 text-sm font-bold text-slate-700">{step}</p></div>)}</div>
        <p className="mt-5 text-sm text-slate-500">The matching model weighs skills at 40%, experience at 25%, education at 15%, job title at 10%, and location or preference at 10%.</p>
      </article>

      <div><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">What you can do here</p><h2 className="mt-1 text-2xl font-black text-slate-900">Platform features</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, description]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-blue-600" /><h3 className="mt-4 font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</div></div>

      <div><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Built for the full ecosystem</p><h2 className="mt-1 text-2xl font-black text-slate-900">Who can use the platform?</h2></div><div className="grid gap-4 md:grid-cols-3">{roles.map(([Icon, title, description]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-emerald-600" /><h3 className="mt-4 font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</div></div>
    </section>
  );
}