import { useEffect, useState } from 'react';
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
  BarChart3,
  Shield,
  Settings,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

const showcaseSlides = [
  {
    title: 'Talent Discovery',
    eyebrow: '01 / PROFILE SIGNALS',
    description: 'Verified skills and experience turn a profile into a clear opportunity signal.',
    image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=85',
    tone: 'from-blue-950/80 via-blue-900/20 to-transparent',
  },
  {
    title: 'AI Neural Matching',
    eyebrow: '02 / COMPATIBILITY ENGINE',
    description: 'The matching engine reads context, not just keywords, to surface the strongest fits.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85',
    tone: 'from-indigo-950/85 via-violet-900/20 to-transparent',
  },
  {
    title: 'Team Interview',
    eyebrow: '03 / HUMAN CONNECTION',
    description: 'Move from a promising match to a focused conversation with the right team.',
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=85',
    tone: 'from-slate-950/80 via-cyan-900/20 to-transparent',
  },
  {
    title: 'Career Success',
    eyebrow: '04 / NEXT CHAPTER',
    description: 'Confident decisions create momentum for the next meaningful career move.',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85',
    tone: 'from-emerald-950/80 via-teal-900/20 to-transparent',
  },
];

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

const adminSteps = [
  {
    number: '01',
    title: 'Manage Platform Users',
    description: 'Admin oversees all users including Job Seekers, Employers, and Company Representatives.',
    icon: UsersRound,
    accent: 'brand-gradient',
    type: 'profile',
  },
  {
    number: '02',
    title: 'Control Employers & Companies',
    description: 'Verify and manage employer accounts, company profiles, and their hiring activities.',
    icon: BuildingIcon,
    accent: 'brand-gradient',
    type: 'search',
  },
  {
    number: '03',
    title: 'Monitor AI Matching Performance',
    description: 'Track and optimize the AI matching engine to ensure accurate candidate-job alignment.',
    icon: BrainCircuit,
    accent: 'brand-gradient',
    type: 'ai',
  },
  {
    number: '04',
    title: 'Review Analytics & Reports',
    description: 'Access detailed analytics, match statistics, user activity, and platform performance metrics.',
    icon: BarChart3,
    accent: 'brand-gradient',
    type: 'score',
  },
  {
    number: '05',
    title: 'System Settings & Notifications',
    description: 'Configure platform notifications, security settings, and manage system-wide operations.',
    icon: Settings,
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
        <div className="border-b border-slate-100 pb-3"><p className="text-sm font-bold text-slate-900">Alex Morgan</p><p className="text-xs text-slate-500">Product Engineer · Profile verified</p></div>
        <div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">React</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold brand-text">Node.js</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold brand-text">Product</span></div>
      </div>
    );
  }
  if (type === 'search') {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Search roles, skills, or companies</p>
        <div className="mt-3 space-y-2"><div className="rounded-xl bg-indigo-50/70 p-3"><p className="truncate text-xs font-bold text-slate-800">Senior Frontend Engineer</p><p className="text-[10px] text-slate-500">Remote · Addis Ababa</p></div><div className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-bold text-slate-800">Product Designer</p><p className="text-[10px] text-slate-500">Hybrid · Full time</p></div></div>
      </div>
    );
  }
  if (type === 'ai') {
    return (
      <div className="min-h-[154px] rounded-2xl border border-violet-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-violet-700">AI Neural Matching</p>
        <div className="mt-5 space-y-3 text-xs font-semibold text-slate-700"><p className="flex justify-between"><span>Alex Morgan</span><span className="text-emerald-600">92%</span></p><p className="flex justify-between"><span>Sara Kebede</span><span className="text-emerald-600">88%</span></p><p className="flex justify-between"><span>Daniel Tesfaye</span><span className="text-emerald-600">84%</span></p></div>
      </div>
    );
  }
  if (type === 'score') {
    return (
      <div className="flex items-center gap-4 rounded-2xl brand-border border bg-white p-4 shadow-sm"><div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[6px] border-[#d0e5f5] border-t-[#56a2d8] border-r-[#2b73a4]"><span className="text-lg font-black brand-text">92%</span><span className="text-[9px] font-bold uppercase text-slate-400">Match</span></div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">Frontend Engineer</p><div className="mt-3 space-y-2"><div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-16">Skills</span><span className="h-1.5 flex-1 rounded-full brand-bg" /></div><div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-16">Experience</span><span className="h-1.5 flex-1 rounded-full brand-bg" /></div><div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-16">Location</span><span className="h-1.5 flex-1 rounded-full bg-blue-400" /></div></div></div></div>
    );
  }
  return (
    <div className="relative rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-white to-indigo-50 p-4 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">AM</div><div><p className="text-sm font-bold text-slate-900">Connection accepted</p><p className="text-xs text-slate-500">You are ready to connect</p></div></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">READY</span></div><div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">Send a message to the hiring team...</div></div>
  );
}

export default function HowItWorks() {
  const [audience, setAudience] = useState('seekers');
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeInteraction, setActiveInteraction] = useState(null);
  const [skills, setSkills] = useState(['React', 'TypeScript', 'Next.js', 'Tailwind']);
  const [skillInput, setSkillInput] = useState('');
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [filters, setFilters] = useState({ remote: true, addis: true, salary: false });
  const [messages, setMessages] = useState([{ from: 'recruiter', text: 'EthioTech hiring manager: Hi Alex, your experience looks like a strong fit for our team.' }]);
  const [messageInput, setMessageInput] = useState('');
  const steps = audience === 'seekers' ? seekerSteps : employerSteps;

  const addSkill = () => {
    const nextSkill = skillInput.trim();
    if (nextSkill && !skills.includes(nextSkill)) setSkills([...skills, nextSkill]);
    setSkillInput('');
  };

  const sendMessage = () => {
    const text = messageInput.trim();
    if (!text) return;
    setMessages([...messages, { from: 'you', text }]);
    setMessageInput('');
  };

  const interactionDetails = {
    profile: { title: 'Profile & Resume', eyebrow: 'Step 01', description: 'Keep your profile current so every match reflects your strongest, most relevant skills.' },
    search: { title: 'Active search criteria', eyebrow: 'Step 02', description: 'Tune the live filters and see how your opportunity feed responds.' },
    ai: { title: 'Neural compatibility analysis', eyebrow: 'Step 03', description: 'The matching engine compares your profile with role context, skills, and growth signals.' },
    score: { title: 'EthioTech match score', eyebrow: 'Step 04', description: 'Review the evidence behind your 94% match before you apply.' },
    connect: { title: 'EthioTech hiring manager', eyebrow: 'Step 05', description: 'Start a direct conversation with EthioTech while your match is fresh.' },
  };

  const openInteraction = (type) => setActiveInteraction(type);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % showcaseSlides.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  const activeShowcase = showcaseSlides[activeSlide];

  return (
    <div className="brand-how-it-works min-h-screen overflow-hidden bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-bold tracking-[0.18em] text-blue-700 shadow-sm"><Sparkles className="h-4 w-4" /> HOW IT WORKS</div>
            <h1 className="mt-7 text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">How <span className="text-blue-600">JobMatch AI</span> Works</h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">Discover talent, match with precision, and move toward the right opportunity with a workflow built around people.</p>
            <div className="mt-8 inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-blue-100/60">
              <button type="button" onClick={() => setAudience('seekers')} className={`rounded-xl px-5 py-3 text-sm font-bold transition sm:px-7 ${audience === 'seekers' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'text-slate-600 hover:bg-slate-50'}`}>For Job Seekers</button>
              <button type="button" onClick={() => setAudience('employers')} className={`rounded-xl px-5 py-3 text-sm font-bold transition sm:px-7 ${audience === 'employers' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'text-slate-600 hover:bg-slate-50'}`}>For Employers</button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3">
              {['Discover talent', 'Set preferences', 'Find the right fit', 'Connect with confidence'].map((label, index) => <button type="button" key={label} onClick={() => setActiveSlide(index)} className={`rounded-xl border p-3 text-left text-xs font-bold transition ${activeSlide === index ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'}`}><span className="mr-2 text-blue-500">0{index + 1}</span>{label}</button>)}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <div className="absolute -right-3 -top-5 z-20 hidden rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-bold text-blue-700 shadow-lg sm:block animate-[float_4s_ease-in-out_infinite]">AI-powered precision</div>
            <div className="absolute -bottom-5 -left-3 z-20 hidden rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-lg sm:block animate-[float_5s_ease-in-out_infinite_reverse]">Human-first outcomes</div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-[10px] border-white bg-slate-900 shadow-2xl shadow-blue-200/60">
              {showcaseSlides.map((slide, index) => <img key={slide.title} src={slide.image} alt={slide.title} className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${index === activeSlide ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`} />)}
              <div className={`absolute inset-0 bg-gradient-to-t ${activeShowcase.tone}`} />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8"><p className="text-[10px] font-black tracking-[0.2em] text-white/70">{activeShowcase.eyebrow}</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">{activeShowcase.title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/80">{activeShowcase.description}</p></div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">{showcaseSlides.map((slide, index) => <button type="button" key={`${slide.title}-thumb`} onClick={() => { setActiveSlide(index); setIsPlaying(false); }} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-16 sm:w-24 ${index === activeSlide ? 'border-blue-600 shadow-md' : 'border-white opacity-65 hover:opacity-100'}`}><img src={slide.image} alt={`${slide.title} thumbnail`} className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 bg-slate-950/55 py-1 text-[9px] font-bold text-white">0{index + 1}</span></button>)}</div>
              <button type="button" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause showcase' : 'Play showcase'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700">{isPlaying ? <span className="text-sm font-black">||</span> : <span className="ml-0.5 text-sm font-black">▶</span>}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.08),transparent)]" />
        </div>

        <div className="mx-auto max-w-7xl">
          {/* For Job Seekers - Card Layout */}
          {audience === 'seekers' && (
            <div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <article onClick={() => openInteraction('profile')} className="cursor-pointer rounded-2xl border border-blue-100 bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="text-xs font-bold tracking-wider brand-text">PROFILE</div>
                  <h3 className="mt-5 text-xl font-black text-slate-900">Create Your Smart Profile</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Upload your resume or build a profile with skills, experience, and job preferences.</p>
                  <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-900">Alex Morgan</p><p className="text-xs text-slate-500">Product Engineer · Profile verified</p><div className="mt-3 flex flex-wrap gap-1.5">{['React', 'TypeScript', 'Next.js', 'Tailwind'].map((tag) => <span key={tag} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{tag}</span>)}</div></div>
                </article>
                <article onClick={() => openInteraction('search')} className="cursor-pointer rounded-2xl border border-indigo-100 bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="text-xs font-bold tracking-wider text-indigo-600">PREFERENCES</div>
                  <h3 className="mt-5 text-xl font-black text-slate-900">Set Job Preferences</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Tell our AI what you&apos;re looking for: role, salary, location, remote options, and company culture.</p>
                  <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Senior Frontend Engineer</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">Remote</span><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">Addis Ababa</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">Salary range</span></div></div>
                </article>
                <article onClick={() => openInteraction('ai')} className="cursor-pointer rounded-2xl border border-violet-100 bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="text-xs font-bold tracking-wider text-violet-600">ANALYSIS</div>
                  <h3 className="mt-5 text-xl font-black text-slate-900">AI Matching Engine</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Our neural algorithm analyzes thousands of jobs and candidates to find the highest-compatibility matches.</p>
                  <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50/50 p-4"><p className="text-center text-xs font-bold uppercase tracking-widest text-violet-700">Compatibility signal</p><div className="mt-4 space-y-2 text-xs font-semibold text-slate-700"><p className="flex justify-between"><span>FinTech App</span><span className="text-emerald-600">97%</span></p><p className="flex justify-between"><span>SaaS Platform</span><span className="text-emerald-600">95%</span></p><p className="flex justify-between"><span>HealthTech</span><span className="text-emerald-600">91%</span></p></div></div>
                </article>
                <article onClick={() => openInteraction('score')} className="cursor-pointer rounded-2xl border border-amber-100 bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="text-xs font-bold tracking-wider text-amber-700">SCORE</div><h3 className="mt-5 text-xl font-black text-slate-900">Review Match Score</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">See tailored job matches with clear compatibility ratings, skill overlap, and salary insights.</p>
                  <div className="mt-5 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[6px] border-blue-100 border-t-blue-600"><span className="text-lg font-black brand-text">94%</span><span className="text-[9px] font-bold text-slate-400">MATCH</span></div><div><p className="text-sm font-bold text-slate-900">Frontend Engineer</p><p className="text-xs text-slate-500">EthioTech</p><p className="mt-2 text-xs font-semibold text-emerald-600">React requirements verified</p><p className="text-xs font-semibold text-emerald-600">Experience verified</p></div></div>
                </article>
                <article onClick={() => openInteraction('connect')} className="cursor-pointer rounded-2xl border border-emerald-100 bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl md:col-span-2 xl:col-span-1">
                  <div className="text-xs font-bold tracking-wider text-emerald-700">CONNECT</div><h3 className="mt-5 text-xl font-black text-slate-900">Connect &amp; Apply</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Direct connection with hiring managers, fast-track interview scheduling, and application tracking.</p>
                  <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"><p className="text-xs font-bold text-emerald-700">Connection accepted</p><p className="mt-2 text-xs text-slate-600">You are ready to connect</p><button type="button" onClick={(event) => { event.stopPropagation(); openInteraction('connect'); }} className="mt-4 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Send a message</button></div>
                </article>
              </div>
            </div>
          )}

          {/* For Employers & Admins - Traditional Grid Layout */}
          {audience === 'employers' && (
            <div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {steps.map((step) => (
                  <button type="button" onClick={() => openInteraction(step.type)} key={step.number} className="min-h-[174px] cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
                    <h2 className="text-xl font-black tracking-tight text-slate-900">{step.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                  </button>
                ))}
              </div>
              <div className="my-10 h-px w-full bg-slate-200" aria-hidden="true" />
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
                {steps.map((step) => (
                  <button type="button" onClick={() => openInteraction(step.type)} key={`${step.number}-preview`} className="cursor-pointer text-left transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    <Illustration type={step.type} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/80 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Built around you</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">A smarter way to move forward</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{pillars.map(({ title, description }, index) => <button type="button" onClick={() => openInteraction(`pillar-${title}`)} key={title} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className="text-xs font-black tracking-[0.18em] text-indigo-600">0{index + 1}</span><h3 className="mt-5 font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><span className="mt-4 block text-xs font-bold text-indigo-600">View system details</span></button>)}</div></div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="brand-cta relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-12 text-white shadow-2xl sm:px-12 lg:px-16"><div className="pointer-events-none absolute -right-8 -top-10 text-white/10"><Rocket className="h-56 w-56 rotate-12" /></div><div className="relative max-w-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Rocket className="h-6 w-6" /></div><h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Ready to experience smarter job matching?</h2><p className="mt-4 max-w-xl text-white/85">Join thousands of job seekers and employers using JobMatch AI.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/find-jobs" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold brand-text transition hover:bg-[#eaf4fb]">Find Jobs <ArrowRight className="h-4 w-4" /></Link><Link to="/company" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Post a Job <Send className="h-4 w-4" /></Link></div></div></div></section>

      {activeInteraction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center" onClick={() => setActiveInteraction(null)}>
          <div className={`relative w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl ${activeInteraction === 'connect' ? 'max-w-lg' : 'max-w-xl'}`} onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Close interaction" onClick={() => setActiveInteraction(null)} className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">{interactionDetails[activeInteraction]?.eyebrow || 'System verification'}</p>
            <h2 className="mt-2 pr-10 text-2xl font-black text-slate-950">{interactionDetails[activeInteraction]?.title || activeInteraction.replace('pillar-', '')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{interactionDetails[activeInteraction]?.description || 'A transparent system check keeps this experience measurable, explainable, and ready for your next decision.'}</p>

            {activeInteraction === 'profile' && <div className="mt-6 space-y-4"><div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-sm font-bold text-slate-900">Alex Morgan</p><p className="text-xs text-slate-500">Product Engineer · Profile verified</p><div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <button type="button" key={skill} onClick={() => setSkills(skills.filter((item) => item !== skill))} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">{skill} ×</button>)}</div></div><div className="flex gap-2"><input value={skillInput} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addSkill()} placeholder="Add a skill" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /><button type="button" onClick={addSkill} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Add</button></div><button type="button" onClick={() => setResumeUploaded(!resumeUploaded)} className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition ${resumeUploaded ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-dashed border-slate-300 text-slate-700 hover:bg-slate-50'}`}><BriefcaseBusiness className="h-4 w-4" /> {resumeUploaded ? 'Resume uploaded · Profile updated' : 'Simulate resume upload'}</button></div>}

            {activeInteraction === 'search' && <div className="mt-6 space-y-3">{[['remote', 'Remote', 'Roles available from anywhere'], ['addis', 'Addis Ababa', 'Show local opportunities'], ['salary', 'Salary range', 'ETB 80,000 - 140,000']].map(([key, label, detail]) => <button type="button" key={key} onClick={() => setFilters({ ...filters, [key]: !filters[key] })} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left"><span><span className="block text-sm font-bold text-slate-900">{label}</span><span className="text-xs text-slate-500">{detail}</span></span><span className={`h-6 w-11 rounded-full p-1 transition ${filters[key] ? 'bg-indigo-600' : 'bg-slate-200'}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${filters[key] ? 'translate-x-5' : ''}`} /></span></button>)}</div>}

            {activeInteraction === 'ai' && <div className="mt-6 space-y-3">{[['FinTech App', '97%', 'Skills and domain alignment'], ['SaaS Platform', '95%', 'Experience and role alignment'], ['HealthTech', '91%', 'Transferable skills detected']].map(([name, score, detail]) => <div key={name} className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4"><div className="flex justify-between text-sm font-bold text-slate-900"><span>{name}</span><span className="text-emerald-600">{score}</span></div><p className="mt-1 text-xs text-slate-500">{detail}</p><div className="mt-3 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-violet-500" style={{ width: score }} /></div></div>)}</div>}

            {activeInteraction === 'score' && <div className="mt-6 grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center"><div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-[10px] border-blue-100 border-t-blue-600 border-r-indigo-500"><span className="text-3xl font-black brand-text">94%</span><span className="text-[10px] font-bold uppercase text-slate-400">match</span></div><div className="space-y-3">{['React requirements verified', '4+ years experience aligned', 'Compensation within target range'].map((item) => <p key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{item}</p>)}</div></div>}

            {activeInteraction === 'connect' && <div className="mt-6"><div className="max-h-56 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">{messages.map((message, index) => <div key={`${message.text}-${index}`} className={`flex ${message.from === 'you' ? 'justify-end' : 'justify-start'}`}><p className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.from === 'you' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>{message.text}</p></div>)}</div><div className="mt-3 flex gap-2"><input value={messageInput} onChange={(event) => setMessageInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendMessage()} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /><button type="button" onClick={sendMessage} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><Send className="h-4 w-4" /></button></div></div>}

            {activeInteraction.startsWith('pillar-') && <div className="mt-6 grid gap-3 sm:grid-cols-2">{['99.2% uptime monitored', 'SOC 2-ready access controls', 'Skills verified against profile data', 'Match explanations available instantly'].map((metric) => <div key={metric} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><ShieldCheck className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-sm font-bold text-slate-800">{metric}</p><p className="mt-1 text-xs text-slate-500">System check passed</p></div>)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
