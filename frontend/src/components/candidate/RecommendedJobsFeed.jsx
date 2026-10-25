import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, MapPin, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { buildApplicationSubmissionPayload } from '../../utils/applicationFlow';

export default function RecommendedJobsFeed({ onViewDetails }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submittingId, setSubmittingId] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/seeker/matched-jobs', { params: { all: 'true' } });
      setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load recommended jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const quickApply = async (job) => {
    setSubmittingId(job.id);
    setMessage('');
    setError('');
    try {
      await api.post('/applications/apply', buildApplicationSubmissionPayload(job));
      setJobs((current) => current.map((item) => String(item.id) === String(job.id) ? { ...item, isApplied: true } : item));
      setMessage(`Application submitted for ${job.title}.`);
      window.dispatchEvent(new CustomEvent('job-matching:updated', { detail: { key: 'applications' } }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit your application.');
    } finally {
      setSubmittingId(null);
    }
  };

  return <section aria-labelledby="ai-recommended-jobs-heading" className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-blue-600"><Sparkles className="h-4 w-4" /> Reverse matching</p><h2 id="ai-recommended-jobs-heading" className="mt-1 text-2xl font-black text-slate-900">AI Recommended Jobs for You</h2><p className="mt-1 text-sm text-slate-500">Current openings ranked against your saved profile.</p></div></div>
    {message && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</p>}
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}<button type="button" onClick={loadJobs} className="ml-3 font-bold underline">Retry</button></div>}
    {loading ? <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Loading recommended jobs...</p> : !error && jobs.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No matching jobs are available right now.</p> : null}
    {!loading && !error && jobs.length > 0 && <div className="grid gap-4 lg:grid-cols-3">{jobs.map((job) => {
      const skills = job.tags || job.requiredSkills || job.required_skills || [];
      const normalizedSkills = Array.isArray(skills) ? skills.map((skill) => typeof skill === 'string' ? skill : skill?.name || skill?.skill_name).filter(Boolean) : [];
      return <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-700">{job.company_name?.charAt(0) || job.company?.charAt(0) || 'J'}</div>{job.matchScore != null && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{job.matchScore}% Match</span>}</div><h3 className="mt-4 font-black text-slate-900">{job.title}</h3><p className="mt-1 text-sm font-bold text-slate-600">{job.company_name || job.company}</p><p className="mt-3 text-xs text-slate-500"><MapPin className="mr-1 inline h-3.5 w-3.5" />{job.location}</p><p className="mt-2 text-sm font-bold text-slate-700">{job.salary || 'Salary not provided'}</p><div className="mt-4 flex flex-wrap gap-1.5">{normalizedSkills.map((tag) => <span key={tag} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{tag}</span>)}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={job.isApplied || submittingId === job.id} onClick={() => quickApply(job)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{job.isApplied ? 'Already Applied' : submittingId === job.id ? 'Applying...' : 'Quick Apply'}</button><button type="button" onClick={() => onViewDetails?.(job.id)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Details <ArrowRight className="h-3.5 w-3.5" /></button></div></article>;
    })}</div>}
  </section>;
}
