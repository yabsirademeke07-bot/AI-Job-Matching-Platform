import { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Check, CheckCircle2, MapPin, WalletCards, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMatchedJobs } from '../services/dashboardApi';
import api from '../services/api';
const listValue = (value, fallback) => Array.isArray(value) && value.length ? value : [fallback];
const normalize = (value) => String(value || '').trim().toLowerCase().replace(/nodejs/g, 'node.js');

const flattenSkills = (value) => {
  if (Array.isArray(value)) return value.flatMap(flattenSkills);
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') return flattenSkills(parsed);
    } catch {
      return text.split(/[,;|]/).map((skill) => skill.trim()).filter(Boolean);
    }
    return [text];
  }
  if (!value || typeof value !== 'object') return [];
  if (value.skill_name || value.name) return [value.skill_name || value.name];
  return Object.values(value).flatMap(flattenSkills);
};

const scoreRoleRelevance = (job, profile) => {
  const candidateText = [profile.preferredJob, profile.desiredPosition, profile.headline, profile.professional_title, profile.currentTitle, profile.jobCategory].filter(Boolean).join(' ');
  const jobText = [job.title, job.category, job.sector, job.department].filter(Boolean).join(' ');
  const candidateTerms = new Set(candidateText.toLowerCase().split(/[^a-z0-9+#.]+/).filter((term) => term.length > 2));
  const jobTerms = new Set(jobText.toLowerCase().split(/[^a-z0-9+#.]+/).filter((term) => term.length > 2));
  const overlap = [...jobTerms].filter((term) => candidateTerms.has(term)).length;
  return candidateTerms.size && jobTerms.size
    ? Math.min(95, 65 + Math.round((overlap / jobTerms.size) * 30))
    : 65;
};

const getCompanyInitials = (company) => String(company || 'Company')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0].toUpperCase())
  .join('') || 'CO';

const formatPostedDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
};

export default function AICareerMatches() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = location.state?.profile || JSON.parse(localStorage.getItem('userProfile') || '{}');
  const candidateName = profile.fullName || profile.full_name || profile.name || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Job Seeker';
  const candidateSkills = [...new Set([
    ...flattenSkills(profile.skills),
    ...flattenSkills(profile.cv?.skills),
    ...flattenSkills(profile.extractedSkills),
  ].map(normalize).filter(Boolean))];
  const [jobs, setJobs] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [toast, setToast] = useState('');
  const [applying, setApplying] = useState(false);
  const appliedIds = new Set();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    getMatchedJobs().then(setJobs).catch((error) => { setJobs([]); setLoadError(error?.response?.data?.message || 'Unable to calculate matches right now.'); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMatch) return undefined;
    const closeOnEscape = (event) => event.key === 'Escape' && setSelectedMatch(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedMatch]);

  const seenJobs = new Set();
  const matches = jobs
    .map((job) => {
      const company = job.company || job.companyName || job.company_name || 'Company';
      const identity = job.id ? String(job.id) : `${normalize(company)}::${normalize(job.title)}`;
      if (seenJobs.has(identity)) return null;
      seenJobs.add(identity);

      const skillsSource = [job.requiredSkills, job.required_skills, job.skills, job.tags].find((value) => flattenSkills(value).length) || [];
      const requiredSkills = [...new Map(flattenSkills(skillsSource).map((skill) => [normalize(skill), skill])).values()];
      const candidateSkillSet = new Set(candidateSkills);
      const matchedSkills = candidateSkillSet.size
        ? requiredSkills.filter((skill) => candidateSkillSet.has(normalize(skill)))
        : flattenSkills(job.matchedSkills || job.matched_skills);
      const score = requiredSkills.length
        ? candidateSkillSet.size
          ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
          : Number(job.matchScore) > 0
            ? Math.round(Number(job.matchScore))
            : 0
        : Number(job.matchScore) > 0
          ? Math.round(Number(job.matchScore))
          : scoreRoleRelevance(job, profile);

      return {
        job: { ...job, company, requiredSkills, matchedSkills },
        score,
        overlap: matchedSkills,
        rationale: job.rationale,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || String(left.job.title).localeCompare(String(right.job.title)))
    .slice(0, 3)
    .map((match, index) => ({ ...match, rank: index + 1 }));
  useEffect(() => {
    if (location.state?.openMatch && matches.length && !selectedMatch) {
      setSelectedMatch(matches[0]);
    }
  }, [location.state?.openMatch, matches, selectedMatch]);

  const submitApplication = async (match) => {
    const job = match.job;
    setApplying(true);
    try {
      await api.post('/applications', { jobId: job.id });
      setToast('Application submitted successfully.');
      setSelectedMatch(null);
    } catch (error) {
      setToast(error?.response?.data?.message || 'Unable to submit application.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">AI Career Match Results</h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 sm:text-sm">Curated specifically for {candidateName} — top recommended roles ranked by skill alignment.</p>
        </header>
        <h2 className="mb-5 text-lg font-black text-slate-900 sm:text-xl">Top 3 Recommended Roles for Your Profile</h2>
        {toast && <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-800"><CheckCircle2 className="h-5 w-5" />{toast}</div>}
        {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center font-bold text-slate-500">Analyzing your career fit...</div> : loadError ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center text-sm font-bold text-rose-700">{loadError}<button type="button" onClick={() => window.location.reload()} className="mt-4 block mx-auto rounded-xl bg-rose-600 px-4 py-2 text-white">Try again</button></div> : matches.length ? <div>{matches.map((match) => {
          const job = match.job;
          const company = job.company || job.companyName || 'Company';
          const rankLabel = match.rank === 1 ? '#1 Best Match' : match.rank === 2 ? '#2 Strong Match' : '#3 Good Match';
          const rankColor = match.rank === 1 ? 'border-emerald-200/80 bg-emerald-50 text-emerald-700' : match.rank === 2 ? 'border-blue-200/80 bg-blue-50 text-blue-700' : 'border-indigo-200/80 bg-indigo-50 text-indigo-700';
          const scoreColor = match.rank === 1 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : match.rank === 2 ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800';
          const postedDate = formatPostedDate(job.created_at || job.createdAt);

          return (
            <article key={job.id} className="mb-4 flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-blue-300 hover:shadow-md sm:flex-row sm:items-center sm:p-6">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-xs">
                  {job.company_logo || job.logo_url ? <img src={job.company_logo || job.logo_url} alt={`${company} logo`} className="h-full w-full object-cover" /> : getCompanyInitials(company)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${rankColor}`}>{rankLabel}</span>
                  <button type="button" onClick={() => navigate(`/jobs/${job.id}`, { state: { job } })} className="mt-2 block break-words text-left text-lg font-bold text-slate-900 transition hover:text-blue-600 sm:text-xl">{job.title}</button>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">{company}{postedDate && <><span className="px-2 text-slate-300">·</span>Posted {postedDate}</>}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><MapPin className="h-4 w-4 text-blue-600" />{job.location || 'Remote'}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><WalletCards className="h-4 w-4 text-blue-600" />{job.salary || 'Negotiable'}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><BriefcaseBusiness className="h-4 w-4 text-blue-600" />{job.type || 'Full Time'}</span>
                  </div>
                  {match.overlap.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{match.overlap.slice(0, 6).map((skill) => <span key={skill} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">{skill}</span>)}</div>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:w-52 sm:items-end">
                <span className={`w-fit rounded-full border px-3 py-1 text-sm font-extrabold ${scoreColor}`}>{match.score}% Match</span>
                <button type="button" onClick={() => navigate(`/jobs/${job.id}`, { state: { job } })} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 hover:shadow-sm">View Details &amp; Apply <ArrowRight className="h-4 w-4" /></button>
              </div>
            </article>
          );
        })}</div> : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">No job matches are available yet.</div>}
        <div className="mt-8 flex justify-center border-t border-slate-200 pt-6"><button id="explore-all-jobs-btn" type="button" onClick={() => navigate('/jobs')} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-blue-700"><span>Explore All Jobs</span><ArrowRight className="h-4 w-4" /></button></div>
      </div>
      {selectedMatch && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedMatch(null)}><section role="dialog" aria-modal="true" aria-labelledby="job-detail-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{selectedMatch.score}% AI match</p><h2 id="job-detail-title" className="mt-2 text-2xl font-black text-slate-950">{selectedMatch.job.title}</h2><p className="mt-1 font-bold text-slate-600">{selectedMatch.job.company || selectedMatch.job.companyName || 'Company'} · {selectedMatch.job.location || 'Remote'}</p></div><button type="button" aria-label="Close job details" onClick={() => setSelectedMatch(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><p className="mt-6 text-sm leading-6 text-slate-600">{selectedMatch.job.description || 'This role is a strong fit for your profile and offers an opportunity to contribute to a growing team.'}</p><div className="mt-6 grid gap-6 sm:grid-cols-2"><div><h3 className="font-black text-slate-900">Responsibilities</h3><ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600">{listValue(selectedMatch.job.responsibilities, 'Deliver high-quality work with the team.').map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}</ul></div><div><h3 className="font-black text-slate-900">Required skills</h3><div className="mt-3 flex flex-wrap gap-2">{listValue(selectedMatch.job.skills || selectedMatch.job.tags, 'Communication').map((skill) => <span key={skill} className={`rounded-full px-3 py-1 text-xs font-bold ${candidateSkills.some((candidateSkill) => normalize(candidateSkill) === normalize(skill)) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{skill}</span>)}</div><p className="mt-4 text-xs font-semibold text-emerald-700">Green tags match skills found in your CV.</p></div></div><div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-900">Salary expectation: {selectedMatch.job.salary || profile.salaryExpectation || 'Negotiable'}</p><p className="mt-2 text-sm text-slate-600">Benefits: {listValue(selectedMatch.job.benefits, 'Benefits discussed during the hiring process.').join(' · ')}</p></div><button type="button" disabled={appliedIds.has(String(selectedMatch.job.id))} onClick={() => submitApplication(selectedMatch)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:bg-emerald-600">{appliedIds.has(String(selectedMatch.job.id)) ? 'Application Submitted' : 'Submit Application (1-Click Apply)'}{!appliedIds.has(String(selectedMatch.job.id)) && <ArrowRight className="h-4 w-4" />}</button></section></div>}
    </main>
  );
}