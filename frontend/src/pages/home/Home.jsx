import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BriefcaseBusiness, Building2, CheckCircle2,
  FileSearch, FileText, Handshake, MapPin, MousePointerClick, Search,
  ShieldCheck, Sparkles, Target, UserRound, Zap,
} from 'lucide-react';

import HeroSection from '../../components/home/HeroSection';

const sectionNavItems = [
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'AI Matching', id: 'ai-matching' },
  { label: 'Find Jobs', id: 'find-jobs' },
  { label: 'For Job Seekers', id: 'for-job-seekers' },
  { label: 'For Employers', id: 'for-employers' },
  { label: 'Why Choose Us', id: 'why-choose-us' },
];

const howItWorks = [
  { icon: UserRound, title: 'Create Account', text: 'Set up your talent or company profile in minutes.' },
  { icon: FileText, title: 'Complete Profile', text: 'Add the skills, experience, or roles that matter to you.' },
  { icon: Sparkles, title: 'AI Matching', text: 'Our matching engine compares fit across the right signals.' },
  { icon: Handshake, title: 'Apply / Hire', text: 'Take the next step with more context and less friction.' },
];

const aiFeatures = [
  ['AI Skill Matching', 'Connect demonstrated skills to the capabilities each role needs.', Target],
  ['CV Analysis', 'Turn your CV into a clear, searchable picture of your strengths.', FileSearch],
  ['Job Requirements Analysis', 'Understand the requirements behind every opportunity.', BriefcaseBusiness],
  ['Match Percentage', 'See an explainable compatibility score before you apply.', BarChart3],
  ['Personalized Job Recommendations', 'Keep discovering roles aligned with your goals.', Sparkles],
];

const seekerBenefits = [
  ['Upload CV', '/upload-cv'],
  ['AI CV Analysis', '/cv-analysis'],
  ['Personalized Job Matches', '/ai-matches'],
  ['Apply Easily', '/find-jobs'],
  ['Track Applications', '/applications'],
];
const employerBenefits = [
  ['Post Jobs', '/employer/post-job'],
  ['AI Candidate Matching', '/employer/candidates'],
  ['Candidate Ranking', '/employer/candidates'],
  ['Application Management', '/employer-dashboard'],
  ['Shortlisting', '/employer/candidates'],
  ['Interview Management', '/employer-dashboard'],
  ['Hiring', '/employer-dashboard'],
];
const trustPoints = [
  ['AI-Powered Matching', 'Find stronger fit with intelligent skill and requirement analysis.', Sparkles],
  ['Faster Hiring', 'Reduce screening time and move qualified people forward sooner.', Zap],
  ['Better Job Recommendations', 'See opportunities chosen around your profile and preferences.', Target],
  ['Verified Companies', 'Explore opportunities from companies building with confidence.', ShieldCheck],
  ['Secure Platform', 'Your profile and application journey stay protected.', ShieldCheck],
  ['Easy Application Process', 'Move from discovery to application in a few simple steps.', MousePointerClick],
];

const fallbackJobs = [
  { title: 'Senior Full Stack Software Engineer', company: 'EthioFinTech Labs', location: 'Addis Ababa', type: 'Full-time', workplace: 'Hybrid' },
  { title: 'AI / LLM Research Engineer', company: 'Technology Company', location: 'Remote', type: 'Full-time', workplace: 'Remote' },
  { title: 'Frontend React Developer', company: 'Growing Tech Team', location: 'Addis Ababa', type: 'Contract', workplace: 'On-site' },
];

function IconTile({ icon: Icon, className = '' }) {
  return <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-deep)] ${className}`}><Icon className="h-5 w-5" /></div>;
}

function SectionIntro({ eyebrow, title, text }) {
  return (
    <div className="max-w-2xl text-slate-900">
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--brand-deep)]">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{text}</p>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [searchTitle, setSearchTitle] = useState('');
  const [category, setCategory] = useState('');
  const [activeSection, setActiveSection] = useState('how-it-works');
  const [publishedJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('employerJobs') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const sections = sectionNavItems
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleSection) {
          setActiveSection(visibleSection.target.id);
        }
      },
      {
        rootMargin: '-18% 0px -55% 0px',
        threshold: [0.2, 0.4, 0.6],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const handleSectionClick = (event, id) => {
    event.preventDefault();
    const section = document.getElementById(id);

    if (!section) {
      return;
    }

    setActiveSection(id);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.pushState(null, '', `#${id}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = new URLSearchParams({ search: searchTitle, category }).toString();
    navigate(`/jobs?${query}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <HeroSection
        searchTitle={searchTitle}
        setSearchTitle={setSearchTitle}
        category={category}
        setCategory={setCategory}
        handleSearch={handleSearch}
      />
      <nav aria-label="Home page sections" className="sticky top-20 z-30 border-b border-slate-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md sm:top-24">
        <div className="mx-auto max-w-7xl">
          <div className="no-scrollbar flex items-center justify-center gap-2 overflow-x-auto sm:gap-3 lg:gap-4">
            {sectionNavItems.map(({ label, id }) => {
              const isActive = activeSection === id;

              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(event) => handleSectionClick(event, id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex min-w-max items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold tracking-tight transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 sm:px-5 sm:py-2.5 ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-600 hover:text-white'
                      : 'border-slate-200/80 bg-white/70 text-slate-700 shadow-xs'
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      </nav>
      <section id="how-it-works" className="scroll-mt-32 border-b border-slate-200/80 bg-white px-6 py-20 sm:scroll-mt-36 sm:py-24">
        <div className="mx-auto max-w-7xl"><SectionIntro eyebrow="How it works" title="A clearer path from profile to opportunity" text="One focused workflow for people looking for their next role and teams ready to hire." />
          <div className="mt-12 grid gap-4 md:grid-cols-4">{howItWorks.map(({ icon, title, text }, index) => <div key={title} className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"><div className="mb-6 flex items-center justify-between"><IconTile icon={icon} /><span className="text-sm font-black text-slate-300">0{index + 1}</span></div><h3 className="text-lg font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>{index < howItWorks.length - 1 && <ArrowRight className="absolute -right-7 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-blue-300 md:block" />}</div>)}</div>
        </div>
      </section>

      <section id="ai-matching" className="scroll-mt-32 border-b border-slate-200/80 bg-white px-6 py-20 sm:scroll-mt-36 sm:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"><div><SectionIntro eyebrow="AI job matching" title="The right signal, at the right moment" text="Go beyond keyword searches. Our platform brings candidate strengths and job requirements into one useful view." /><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-lg shadow-slate-200/70"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-900">Compatibility overview</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">94% match</span></div><div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[94%] rounded-full bg-[var(--brand-primary)]" /></div><div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-slate-500"><span><strong className="block text-lg text-slate-900">9/10</strong>skills</span><span><strong className="block text-lg text-slate-900">92%</strong>experience</span><span><strong className="block text-lg text-slate-900">100%</strong>location</span></div></div></div><div className="grid gap-4 sm:grid-cols-2">{aiFeatures.map(([title, text, icon]) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"><IconTile icon={icon} /><h3 className="mt-5 font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}</div></div></section>

      <section id="find-jobs" className="scroll-mt-32 border-b border-slate-200/80 bg-white px-6 py-20 sm:scroll-mt-36 sm:py-24"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><SectionIntro eyebrow="Explore jobs" title="Opportunities worth opening" text="Search by the details that shape your next move, then explore the full live job board." /><Link to="/jobs" className="brand-button h-fit text-sm"><Search className="h-4 w-4" /> Explore Jobs</Link></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><Search className="h-5 w-5 text-[var(--brand-deep)]" /><h3 className="mt-4 font-extrabold">Search Jobs</h3><p className="mt-1 text-sm text-slate-500">Search title or skill</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><BriefcaseBusiness className="h-5 w-5 text-[var(--brand-deep)]" /><h3 className="mt-4 font-extrabold">Job Categories</h3><p className="mt-1 text-sm text-slate-500">Technology and more</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><MapPin className="h-5 w-5 text-[var(--brand-deep)]" /><h3 className="mt-4 font-extrabold">Location</h3><p className="mt-1 text-sm text-slate-500">Addis Ababa, remote, and more</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><Building2 className="h-5 w-5 text-[var(--brand-deep)]" /><h3 className="mt-4 font-extrabold">Employment & Work Mode</h3><p className="mt-1 text-sm text-slate-500">Full-time, contract, hybrid</p></div></div><div className="mt-8 grid gap-4 md:grid-cols-3">{(publishedJobs.length ? publishedJobs : fallbackJobs).slice(0, 3).map((job, index) => <div key={job.id || `${job.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand-deep)]"><BriefcaseBusiness className="h-5 w-5" /></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{job.type || job.job_type || 'Full-time'}</span></div><h3 className="mt-5 font-extrabold text-slate-900">{job.title}</h3><p className="mt-2 text-sm font-semibold text-slate-600">{job.company || 'Verified company'}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {job.location || job.locationValue || 'Flexible location'} <span className="text-slate-300">|</span> {job.workplace || job.work_mode || 'Hybrid'}</p></div>)}</div></div></section>

      <section id="for-job-seekers" className="scroll-mt-32 border-b border-slate-200/80 bg-white px-6 py-20 sm:scroll-mt-36 sm:py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><SectionIntro eyebrow="For job seekers" title="Make your next application count" text="Build a stronger profile, understand your fit, and keep every application moving from one place." /><div><ul className="grid gap-3 sm:grid-cols-2">{seekerBenefits.map(([item, href]) => <li key={item}><Link to={href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-deep)]" />{item}</Link></li>)}</ul><Link to="/find-jobs" className="brand-button mt-7">Find Jobs <ArrowRight className="h-4 w-4" /></Link></div></div></section>

      <section id="for-employers" className="scroll-mt-32 border-b border-slate-200/80 bg-white px-6 py-20 sm:scroll-mt-36 sm:py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><SectionIntro eyebrow="For employers" title="Hire with a sharper view of talent" text="Bring your role, candidates, and hiring decisions into a workspace designed for momentum." /><div><ul className="grid gap-3 sm:grid-cols-2">{employerBenefits.map(([item, href]) => <li key={item}><Link to={href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-deep)]" />{item}</Link></li>)}</ul><Link to="/employer/post-job" className="brand-button mt-7">Post a Job <ArrowRight className="h-4 w-4" /></Link></div></div></section>

      <section id="why-choose-us" className="scroll-mt-32 bg-white px-6 py-20 sm:scroll-mt-36 sm:py-24"><div className="mx-auto max-w-7xl"><SectionIntro eyebrow="Why choose our platform" title="Less noise. Better next steps." text="A professional hiring experience built around clarity, relevance, and trust for both sides of the market." /><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{trustPoints.map(([title, text, icon]) => <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"><IconTile icon={icon} className="transition group-hover:bg-blue-100" /><h3 className="mt-5 font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}</div></div></section>
    </div>
  );
}