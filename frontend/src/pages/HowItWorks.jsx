import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  Handshake,
  LockKeyhole,
  MessageCircle,
  Network,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  UserRound,
  UsersRound,
} from 'lucide-react';

const seekerSteps = [
  {
    number: '01',
    title: 'Create Your Profile',
    description: 'Job seekers create a profile, add their skills, experience, education and career preferences.',
    icon: UserRound,
    accent: 'brand-gradient',
    type: 'profile',
  },
  {
    number: '02',
    title: 'Find Opportunities',
    description: 'Search and filter jobs that match your skills, interests, salary requirements, and career goals.',
    icon: Search,
    accent: 'brand-gradient',
    type: 'search',
  },
  {
    number: '03',
    title: 'AI Matches You',
    description: 'Our AI neural engine analyzes your profile against job requirements to identify the highest affinity matches.',
    icon: BrainCircuit,
    accent: 'brand-gradient',
    type: 'ai',
  },
  {
    number: '04',
    title: 'Get Match Score & Recommendations',
    description: 'See your match score and receive AI-driven recommendations to make smarter decisions.',
    icon: Target,
    accent: 'brand-gradient',
    type: 'score',
  },
  {
    number: '05',
    title: 'Apply & Connect',
    description: 'Apply to jobs easily with one-click submissions and connect directly with hiring managers who are the right fit.',
    icon: Handshake,
    accent: 'brand-gradient',
    type: 'connect',
  },
];

const employerSteps = [
  {
    number: '01',
    title: 'Create Your Company Profile',
    description: 'Employers create a trusted company profile and define the roles, skills, and experience they need.',
    icon: BuildingIcon,
    accent: 'brand-gradient',
    type: 'profile',
  },
  {
    number: '02',
    title: 'Post Your Opportunity',
    description: 'Publish verified openings with clear requirements, compensation, work mode, and team context.',
    icon: BriefcaseBusiness,
    accent: 'brand-gradient',
    type: 'search',
  },
  {
    number: '03',
    title: 'AI Finds Your Best Fits',
    description: 'Our matching engine compares role requirements with qualified profiles across the platform.',
    icon: BrainCircuit,
    accent: 'brand-gradient',
    type: 'ai',
  },
  {
    number: '04',
    title: 'Review Match Insights',
    description: 'Compare transparent match scores, skills, and experience before shortlisting candidates.',
    icon: Target,
    accent: 'brand-gradient',
    type: 'score',
  },
  {
    number: '05',
    title: 'Connect & Hire',
    description: 'Message the right candidates, schedule interviews, and move each application through your pipeline.',
    icon: Handshake,
    accent: 'brand-gradient',
    type: 'connect',
  },
];

const pillars = [
  { title: 'Smart Matching', description: 'AI matches skills, experience, and job requirements accurately with zero keyword fluff.', icon: ShieldCheck, color: 'bg-blue-50 text-blue-600' },
  { title: 'Save Time', description: 'Find the right opportunities faster and reduce time-consuming manual searches.', icon: Timer, color: 'brand-soft text-brand' },
  { title: 'Better Decisions', description: 'Data-driven insights and transparent match scores help you choose the best fit.', icon: Sparkles, color: 'brand-soft text-brand' },
  { title: 'Secure & Private', description: 'Your data is safe with us. We value your privacy and maintain enterprise security.', icon: LockKeyhole, color: 'brand-soft text-brand' },
];

function BuildingIcon({ className }) {
  return <UsersRound className={className} />;
}

function Illustration({ type }) {
  if (type === 'profile') {
    return (
      <div className="relative rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white"><UserRound className="h-5 w-5" /></div>
          <div><p className="text-sm font-bold text-slate-900">Alex Morgan</p><p className="text-xs text-slate-500">Product Engineer</p></div>
          <BadgeCheck className="ml-auto h-5 w-5 text-emerald-500" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">React</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold brand-text">Node.js</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold brand-text">Product</span></div>
      </div>
    );
  }
  if (type === 'search') {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400"><Search className="h-4 w-4 text-indigo-500" /> Search roles, skills, or companies</div>
        <div className="mt-3 space-y-2"><div className="flex items-center gap-3 rounded-xl bg-indigo-50/70 p-3"><div className="rounded-lg bg-indigo-600 p-2 text-white"><BriefcaseBusiness className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">Senior Frontend Engineer</p><p className="text-[10px] text-slate-500">Remote · Addis Ababa</p></div><ChevronRight className="ml-auto h-4 w-4 text-indigo-400" /></div><div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-600"><CircleDollarSign className="h-4 w-4" /></div><div><p className="text-xs font-bold text-slate-800">Product Designer</p><p className="text-[10px] text-slate-500">Hybrid · Full time</p></div></div></div>
      </div>
    );
  }
  if (type === 'ai') {
    return (
      <div className="relative flex min-h-[154px] items-center justify-center overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="absolute h-24 w-24 rounded-full border border-dashed border-violet-300" /><div className="absolute h-40 w-40 rounded-full border border-dashed border-indigo-200" />
        <div className="absolute left-8 top-8 rounded-lg bg-white p-2 text-blue-600 shadow-sm"><GraduationCap className="h-4 w-4" /></div><div className="absolute right-8 top-8 rounded-lg bg-white p-2 text-indigo-600 shadow-sm"><BriefcaseBusiness className="h-4 w-4" /></div><div className="absolute bottom-8 left-10 rounded-lg bg-white p-2 text-purple-600 shadow-sm"><Target className="h-4 w-4" /></div><div className="absolute bottom-8 right-10 rounded-lg bg-white p-2 text-fuchsia-600 shadow-sm"><Network className="h-4 w-4" /></div>
        <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl brand-gradient text-white shadow-lg"><BrainCircuit className="h-8 w-8" /></div>
      </div>
    );
  }
  if (type === 'score') {
    return (
      <div className="flex items-center gap-4 rounded-2xl brand-border border bg-white p-4 shadow-sm"><div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[6px] border-[#d0e5f5] border-t-[#56a2d8] border-r-[#2b73a4]"><span className="text-lg font-black brand-text">92%</span><span className="text-[9px] font-bold uppercase text-slate-400">Match</span></div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">Frontend Engineer</p><div className="mt-3 space-y-2"><div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-16">Skills</span><span className="h-1.5 flex-1 rounded-full brand-bg" /></div><div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-16">Experience</span><span className="h-1.5 flex-1 rounded-full brand-bg" /></div><div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-16">Location</span><span className="h-1.5 flex-1 rounded-full bg-blue-400" /></div></div></div><Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" /></div>
    );
  }
  return (
    <div className="relative rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-white to-indigo-50 p-4 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white"><UsersRound className="h-5 w-5" /></div><div><p className="text-sm font-bold text-slate-900">Connection accepted</p><p className="text-xs text-slate-500">You are ready to connect</p></div></div><div className="rounded-full bg-emerald-100 p-2 text-emerald-600"><Check className="h-4 w-4" /></div></div><div className="mt-3 ml-9 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm"><MessageCircle className="h-4 w-4 text-indigo-500" /> Send a message...</div></div>
  );
}

export default function HowItWorks() {
  const [audience, setAudience] = useState('seekers');
  const steps = audience === 'seekers' ? seekerSteps : employerSteps;

  return (
    <div className="brand-how-it-works min-h-screen overflow-hidden bg-white text-slate-900">
      <section className="relative bg-gradient-to-b from-indigo-50/80 via-white to-white px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full brand-border border bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.18em] brand-text shadow-sm"><Sparkles className="h-4 w-4" /> HOW IT WORKS</div>
          <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">How <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">JobMatch AI</span> Works</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">Our AI-powered platform makes job searching and hiring simple, smart, and efficient for everyone.</p>
          <div className="mx-auto mt-9 inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-indigo-100/60">
            <button type="button" onClick={() => setAudience('seekers')} className={`rounded-xl px-5 py-3 text-sm font-bold transition sm:px-7 ${audience === 'seekers' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-600 hover:bg-slate-50'}`}>For Job Seekers</button>
            <button type="button" onClick={() => setAudience('employers')} className={`rounded-xl px-5 py-3 text-sm font-bold transition sm:px-7 ${audience === 'employers' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-600 hover:bg-slate-50'}`}>For Employers / Companies</button>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-5 xl:gap-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative flex flex-col px-0 md:px-3 xl:px-4">
                  {index < steps.length - 1 && <div className="absolute right-[-18px] top-[210px] z-10 hidden w-9 items-center justify-center xl:flex"><div className="w-full border-t-2 border-dashed border-indigo-200" /><ChevronRight className="absolute h-4 w-4 bg-white text-indigo-400" /></div>}
                  <div className="mb-5 flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-sm font-black text-white shadow-lg`}>{step.number}</span><div className="h-px flex-1 bg-indigo-100 xl:hidden" /><Icon className="h-5 w-5 text-indigo-500" /></div>
                  <div className="mb-5 min-h-[160px]"> <h2 className="text-xl font-black tracking-tight text-slate-900">{step.title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p></div>
                  <Illustration type={step.type} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/80 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Built around you</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">A smarter way to move forward</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{pillars.map(({ title, description, icon: Icon, color }) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div><h3 className="mt-5 font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div></div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="brand-cta relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-12 text-white shadow-2xl sm:px-12 lg:px-16"><div className="pointer-events-none absolute -right-8 -top-10 text-white/10"><Rocket className="h-56 w-56 rotate-12" /></div><div className="relative max-w-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Rocket className="h-6 w-6" /></div><h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Ready to experience smarter job matching?</h2><p className="mt-4 max-w-xl text-white/85">Join thousands of job seekers and employers using JobMatch AI.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/find-jobs" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold brand-text transition hover:bg-[#eaf4fb]">Find Jobs <ArrowRight className="h-4 w-4" /></Link><Link to="/company" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Post a Job <Send className="h-4 w-4" /></Link></div></div></div></section>
    </div>
  );
}
