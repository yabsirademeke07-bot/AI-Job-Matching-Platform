import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, BriefcaseBusiness, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, FileSearch, MessageSquareText, ShieldCheck, Sparkles, Users } from "lucide-react";

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

const showcaseSlides = [
  { title: "Clean Tech Studio", label: "STEP 01", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=90", prompt: "An inspiring young female software engineer working comfortably at an elegant wooden desk in a bright sunlit minimalist tech studio, ultra-clean aesthetic, natural daylight streaming through large architectural windows, sleek laptop, potted plants, high detail, photorealistic professional photography. (Aspect Ratio: 16:9)" },
  { title: "Team Collaboration", label: "STEP 02", image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=90", prompt: "A creative diverse group of young tech professionals collaborating in a warm modern loft office, engaging in an authentic discussion around a wooden table with laptops, soft natural lighting, stylish Scandinavian interior design, candid, photorealistic. (Aspect Ratio: 16:9)" },
  { title: "Neural Job Matching", label: "STEP 03", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=90", prompt: "Sophisticated and clean visual representation of digital talent and career matching, elegant luminous cyan and violet geometric data paths intersecting with human touchpoints in a minimalist architectural space, luxury tech editorial style, ultra-sharp detail. (Aspect Ratio: 16:9)" },
  { title: "Developer Environment", label: "STEP 04", image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=90", prompt: "A modern software developer reviewing code on dual ultra-wide displays in an aesthetic loft studio with lush green plants, warm ambient lighting, clean aesthetic, highly detailed, photorealistic editorial photography. (Aspect Ratio: 16:9)" },
  { title: "Direct Interview", label: "STEP 05", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=90", prompt: "A professional job interview in an elegant sunlit glass office with indoor plants, a smiling friendly hiring manager and an enthusiastic candidate conversing warmly, natural daylight, authentic interaction, photorealistic, premium corporate aesthetic. (Aspect Ratio: 16:9)" },
  { title: "Placement & Growth", label: "STEP 06", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=90", prompt: "A happy young tech developer smiling joyfully in a stylish modern open-space office with colleagues celebrating in the soft background, holding a sleek tablet, warm golden hour sunlight through floor-to-ceiling windows, photorealistic, authentic candid emotion. (Aspect Ratio: 16:9)" },
];

function ShowcaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const activeSlide = showcaseSlides[activeIndex];

  useEffect(() => {
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % showcaseSlides.length), 4500);
    return () => window.clearInterval(timer);
  }, []);

  const move = (direction) => setActiveIndex((index) => (index + direction + showcaseSlides.length) % showcaseSlides.length);
  const copyPrompt = async () => {
    await navigator.clipboard?.writeText(activeSlide.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-[16/10] w-full max-w-[540px] overflow-hidden rounded-3xl border border-blue-100 bg-slate-950 shadow-2xl shadow-blue-100/60">
        {showcaseSlides.map((slide, index) => <img key={slide.title} src={slide.image} alt={slide.title} className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${index === activeIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"}`} />)}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7"><p className="text-[10px] font-black tracking-[0.2em] text-blue-200">{activeSlide.label}</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">{activeSlide.title}</h2></div>
        <button type="button" onClick={() => move(-1)} aria-label="Previous image" className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-900 shadow-lg transition hover:bg-white"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => move(1)} aria-label="Next image" className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-900 shadow-lg transition hover:bg-white"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Current image prompt</p><p className="mt-1 text-xs leading-5 text-slate-600">{activeSlide.prompt}</p></div><button type="button" onClick={copyPrompt} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-blue-700 shadow-sm">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy Prompt"}</button></div>
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">{showcaseSlides.map((slide, index) => <button type="button" key={`${slide.title}-thumb`} onClick={() => setActiveIndex(index)} aria-label={`Show ${slide.title}`} className={`h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-16 sm:w-24 ${index === activeIndex ? "border-blue-600 shadow-md" : "border-transparent opacity-65 hover:opacity-100"}`}><img src={slide.image} alt={`${slide.title} thumbnail`} className="h-full w-full object-cover" /></button>)}</div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${((activeIndex + 1) / showcaseSlides.length) * 100}%` }} /></div>
    </div>
  );
}

export default function PlatformAboutView({ onNavigate }) {
  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 text-slate-900 shadow-xl shadow-blue-100/50 sm:p-8 lg:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <ShowcaseCarousel />
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
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Prepared image prompts</p><h2 className="mt-1 text-2xl font-black text-slate-900">Six visual directions for the platform</h2></div><p className="text-xs text-slate-500">Copy any prompt for image generation.</p></div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400"><th className="px-3 py-3">Step</th><th className="px-3 py-3">Direction</th><th className="px-3 py-3">Prompt</th><th className="px-3 py-3">Action</th></tr></thead><tbody>{showcaseSlides.map((slide, index) => <tr key={`prompt-${slide.title}`} className="border-b border-slate-100 align-top"><td className="px-3 py-4 text-xs font-black text-blue-600">0{index + 1}</td><td className="px-3 py-4 text-sm font-bold text-slate-800">{slide.title}</td><td className="max-w-xl px-3 py-4 text-xs leading-5 text-slate-500">{slide.prompt}</td><td className="px-3 py-4"><button type="button" onClick={async () => { await navigator.clipboard?.writeText(slide.prompt); }} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"><Copy className="h-3.5 w-3.5" /> Copy</button></td></tr>)}</tbody></table></div>
      </article>

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