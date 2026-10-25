import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import liyuImg from '../images/liyu.jpg';
import peopleImg from '../images/peoples.jpg';
import aboutHeroImg from '../images/ab out.jpg';
import TrustedBy from '../../components/home/TrustedBy';
import HowItWorksCards from '../../components/HowItWorksCards';
import { searchJobs } from '../../services/jobService';

const heroImages = [liyuImg, peopleImg, aboutHeroImg];

const aiFeatures = [
  ['Semantic Skill Extraction', 'Analyzes real demonstrated expertise rather than relying on exact keyword phrasing.'],
  ['Explainable Match Scoring', 'Delivers transparent compatibility scores breaking down skills, seniority, and preferences.'],
  ['Automated Requirements Mapping', 'Shows how your experience aligns with the skills and qualifications requested for each role.'],
];

const seekerBenefits = [
  ['Upload CV & Build Profile', 'Upload your resume and turn your experience into a clear, searchable profile in seconds.'],
  ['AI CV Analysis & Optimization', 'Get actionable insights to highlight your strongest capabilities for relevant roles.'],
  ['Personalized Job Matches', 'Discover vetted opportunities precisely selected around your skills and preferences.'],
  ['One-Click Easy Apply', 'Apply seamlessly to top companies with complete profile context and zero friction.'],
  ['Unified Application Tracking', 'Monitor your application progress, interview stages, and feedback all in one place.'],
];
const trustPoints = [
  ['AI-Powered Matching', 'Find stronger fit with intelligent skill and requirement analysis that cuts through keyword noise.'],
  ['Faster Hiring & Screening', 'Reduce screening time drastically and move qualified candidates forward sooner.'],
  ['Verified Companies & Roles', 'Explore vetted opportunities from trusted organizations building with confidence.'],
  ['Secure & Frictionless Workflow', 'Your data and application journey remain fully protected at every single step.'],
];

export default function Home() {
  const navigate = useNavigate();
  const [searchTitle, setSearchTitle] = useState('');
  const [searchError, setSearchError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [visibleJobs, setVisibleJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeHeroImage, setActiveHeroImage] = useState(0);

  useEffect(() => {
    let active = true;
    searchJobs()
      .then((results) => {
        if (!active) return;
        setJobs(results);
        setVisibleJobs(results);
      })
      .catch((error) => {
        if (!active) return;
        setJobsError(error.response?.data?.message || 'Unable to load current jobs.');
      })
      .finally(() => active && setJobsLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const rotation = window.setInterval(() => {
      setActiveHeroImage((currentImage) => (currentImage + 1) % heroImages.length);
    }, 4500);

    return () => window.clearInterval(rotation);
  }, []);

  const handleExploreSearch = (e) => {
    e.preventDefault();
    const query = searchTitle.trim();

    if (!query) {
      setSearchError('Please enter a job title or skill to search.');
      return;
    }
    if (jobsLoading || jobsError) {
      setSearchError(jobsError || 'Jobs are still loading. Please try again.');
      return;
    }

    setSearchError('');
    const normalizedQuery = query.toLowerCase().trim();
    const matches = jobs.filter((job) => {
      const company = typeof job.company === 'string' ? job.company : job.company?.name;
      const skills = Array.isArray(job.skills) ? job.skills : [];
      const tags = Array.isArray(job.tags) ? job.tags : [];
      const fields = [job.title, company, job.category, job.sector, ...skills, ...tags];
      return fields.some((field) => String(field || '').toLowerCase().trim().includes(normalizedQuery));
    });

    setActiveQuery(query);
    setVisibleJobs(matches);
    const exactMatch = matches.find((job) => {
      const company = typeof job.company === 'string' ? job.company : job.company?.name;
      return [job.title, company].some((field) => String(field || '').toLowerCase().trim() === normalizedQuery);
    });
    if (exactMatch?.id) {
      navigate(`/jobs/${exactMatch.id}`, { state: { job: exactMatch } });
      return;
    }
    document.getElementById('explore-job-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearExploreSearch = () => {
    setSearchTitle('');
    setSearchError('');
    setActiveQuery('');
    setVisibleJobs(jobs);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <section className="relative flex min-h-[95vh] w-full flex-col justify-center overflow-hidden bg-slate-900 pb-24 sm:pb-32" aria-label="AI job matching hero">
        <div className="absolute inset-0">
          {heroImages.map((image, index) => <img key={image} src={image} alt="Team using AI for job matching" className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ease-in-out ${index === activeHeroImage ? 'opacity-100' : 'opacity-0'}`} />)}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/20" />
        <div className="relative z-10 mx-auto flex min-h-[95vh] w-full max-w-[1600px] items-center justify-start px-5 text-left sm:px-8 lg:px-16">
          <div className="relative w-full max-w-xl lg:w-1/2">
            <h1 className="animate-in fade-in slide-in-from-bottom-4 text-4xl font-black italic leading-snug tracking-tight drop-shadow-[0_2px_12px_rgba(15,23,42,0.18)] duration-700 ease-out sm:text-5xl lg:text-6xl">
              <span className="block bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 bg-clip-text text-transparent">Find Your Dream Tech Job</span>
              <span className="block bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent">With AI Matching Precision</span>
            </h1>
          </div>
        </div>
      </section>
      <TrustedBy />
      <section id="how-it-works" className="scroll-mt-20 w-full bg-slate-100 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[1550px] px-4 sm:px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-2 inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-600 shadow-sm">
              HOW IT WORKS
            </div>
            <h2 className="mb-3 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-3xl lg:text-4xl xl:text-[40px]">
              A clearer path from profile to opportunity
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mb-12 sm:text-base">
              One focused workflow for people looking for their next role and teams ready to hire.
            </p>
          </div>

          <HowItWorksCards className="mt-12 lg:mt-16" interactive />
        </div>
      </section>

      <section id="ai-matching" className="scroll-mt-20 w-full bg-white py-24 sm:py-32">
        <div className="mx-auto w-full max-w-[1550px] px-6 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-emerald-600">AI JOB MATCHING</p>
            <h2 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-3xl lg:text-4xl xl:text-[40px]">The right signal, at the right moment</h2>
            <p className="mx-auto mb-16 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Go beyond keyword searches. Our platform brings candidate strengths and job requirements into one useful view.
            </p>
          </div>

          <div className="mx-auto grid max-w-[1550px] grid-cols-1 gap-8 px-0 md:grid-cols-2 lg:grid-cols-3">
            {aiFeatures.map(([title, text]) => (
              <article key={title} className="group rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-8 transition-all duration-300 hover:bg-slate-50">
                <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="explore-jobs" className="scroll-mt-20 w-full border-b border-slate-200/80 bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[1550px] px-6 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">EXPLORE JOBS</p>
            <h2 className="mb-3 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-3xl lg:text-4xl xl:text-[40px]">Opportunities worth opening</h2>
            <p className="mx-auto mb-10 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mb-12 sm:text-base">Search the details that shape your next move, then open the roles that feel like a real fit.</p>
          </div>

          <form onSubmit={handleExploreSearch} className="mx-auto mb-16 mt-10 flex max-w-5xl flex-col items-stretch gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xl sm:rounded-full sm:p-3 md:flex-row md:items-center">
            <div className="flex min-w-0 w-full flex-1 flex-col">
              <label className="block w-full rounded-xl px-3 py-2.5 sm:rounded-full">
              <span className="sr-only">Search jobs</span>
              <input value={searchTitle} onChange={(e) => { setSearchTitle(e.target.value); if (searchError) setSearchError(''); }} placeholder="Search job title, skill, or keyword..." className={`min-w-0 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 ${searchError ? 'rounded-md ring-1 ring-red-400' : ''}`} />
              </label>
              {searchError && <p className="px-3 text-sm font-medium text-red-500">{searchError}</p>}
            </div>
            <button type="submit" className="flex w-full shrink-0 items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-900/15 transition hover:bg-indigo-700 sm:w-auto sm:rounded-full">
              Search Jobs
            </button>
          </form>

          {activeQuery && <div id="explore-job-results" className="mb-8 flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-sm shadow-sm sm:flex-row sm:items-center"><p className="font-bold text-slate-700">Showing results for: <span className="text-slate-900">'{activeQuery}'</span> ({visibleJobs.length} {visibleJobs.length === 1 ? 'job' : 'jobs'} found)</p><button type="button" onClick={clearExploreSearch} className="font-extrabold text-[var(--brand-deep)] underline-offset-4 hover:underline">Clear Search</button></div>}

          {jobsLoading ? (
            <p role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Loading current job opportunities...</p>
          ) : jobsError ? (
            <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center text-sm font-semibold text-rose-700">{jobsError}</p>
          ) : activeQuery && visibleJobs.length === 0 ? (
            <div id="explore-job-results" className="rounded-[26px] border border-slate-200/90 bg-white p-10 text-center shadow-[0_16px_36px_-10px_rgba(0,0,0,0.12),0_6px_16px_-4px_rgba(0,0,0,0.06)] sm:p-14">
              <h3 className="text-2xl font-black text-slate-900">No jobs found matching '{activeQuery}'.</h3>
              <button type="button" onClick={() => navigate('/jobs')} className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700">View All Jobs</button>
            </div>
          ) : visibleJobs.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-300 bg-white p-10 text-center">
              <h3 className="text-xl font-black text-slate-900">No job opportunities are available right now.</h3>
              <p className="mt-2 text-sm text-slate-500">Check back later for newly posted jobs.</p>
            </div>
          ) : <div id="explore-job-results" className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visibleJobs.map((job, index) => (
              <article key={job.id || `${job.title}-${index}`} className="card-floating flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-end gap-4">
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">{job.workplace || job.work_mode || 'Work arrangement not specified'}</span>
                  </div>
                  <h3 className="mb-2 mt-7 text-xl font-extrabold text-slate-900">{job.title}</h3>
                  <p className="font-bold text-slate-600">{typeof job.company === 'string' ? job.company : job.company?.name || job.company_name || 'Company not provided'}</p>
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                    <span>{job.location || job.locationValue || 'Location not specified'}</span>
                    {job.salary && <span className="font-bold text-slate-700">{job.salary}</span>}
                  </div>
                </div>
                <Link to={`/jobs/${job.id}`} state={{ job }} className="mt-8 inline-flex w-full items-center justify-center border-t border-slate-100 pt-5 text-sm font-extrabold text-[var(--brand-deep)] transition hover:text-slate-900">View Details</Link>
              </article>
            ))}
          </div>}
        </div>
      </section>

      <section id="for-job-seekers" className="scroll-mt-20 w-full border-b border-slate-200/80 bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto grid w-full max-w-[1550px] grid-cols-1 items-center gap-12 px-6 sm:px-10 lg:grid-cols-12 lg:gap-16 lg:px-14">
          <div className="lg:col-span-5">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-blue-600">FOR JOB SEEKERS</p>
            <h2 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-3xl lg:text-4xl xl:text-[40px]">Make your next application count</h2>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">Build a stronger profile, understand your fit, and keep every application moving forward from one unified workspace.</p>
            <Link to="/find-jobs" className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-md transition-all duration-300 hover:bg-blue-700 hover:shadow-blue-500/25 sm:w-auto">Find Jobs</Link>
          </div>
          <div className="relative lg:col-span-7">
            <div className="space-y-4">
              {seekerBenefits.map(([title, description]) => (
                <div key={title} className="relative rounded-2xl border border-slate-200/80 bg-white/90 p-6 transition-all duration-300 hover:border-blue-500/40 hover:bg-white hover:shadow-md sm:p-7">
                  <h3 className="mb-1 text-lg font-bold text-slate-900">{title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="why-choose-us" className="scroll-mt-20 w-full bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto grid w-full max-w-[1550px] grid-cols-1 items-center gap-12 px-6 sm:px-10 lg:grid-cols-12 lg:gap-16 lg:px-14">
          <div className="lg:col-span-5">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-blue-600">WHY CHOOSE OUR PLATFORM</p>
            <h2 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-3xl lg:text-4xl xl:text-[40px]">Less noise. Better next steps.</h2>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">A professional hiring experience built around clarity, relevance, and trust for both sides of the market.</p>
            <Link to="/register" className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-md transition-all duration-300 hover:bg-blue-700 sm:w-auto">Experience the Difference</Link>
          </div>
          <div className="relative lg:col-span-7">
            <div className="space-y-4">
              {trustPoints.map(([title, text]) => (
                <div key={title} className="relative rounded-2xl border border-slate-200/80 bg-white/90 p-6 transition-all duration-300 hover:border-blue-500/40 hover:bg-white hover:shadow-md sm:p-7">
                  <h3 className="mb-1 text-lg font-bold text-slate-900">{title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}