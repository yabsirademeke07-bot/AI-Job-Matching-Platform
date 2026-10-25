import { useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, CheckCircle2, X } from 'lucide-react';
import api from '../../services/api';
import { buildApplicationSubmissionPayload } from '../../utils/applicationFlow';

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
const asList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return typeof value === 'string' ? value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean) : [];
};

export default function MatchedJobsPanel({ jobs = [], onApplicationSubmitted }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [appliedIds, setAppliedIds] = useState(() => new Set(jobs.filter((job) => job.isApplied).map((job) => String(job.id))));
  const [savedIds, setSavedIds] = useState(() => new Set(jobs.filter((job) => job.isSaved).map((job) => String(job.id))));
  const [toast, setToast] = useState('');

  const matches = useMemo(() => jobs.map((job) => ({
    job,
    score: job.matchScore == null || !Number.isFinite(Number(job.matchScore)) ? null : Number(job.matchScore),
    overlap: asList(job.matchedSkills),
  })).sort((left, right) => (right.score ?? -1) - (left.score ?? -1)), [jobs]);

  const toggleSaved = async (jobId) => {
    const isSaved = savedIds.has(String(jobId));
    try {
      if (isSaved) await api.delete(`/seeker/saved-jobs/${jobId}`);
      else await api.post('/seeker/saved-jobs', { jobId });
      setSavedIds((current) => {
        const next = new Set(current);
        if (isSaved) next.delete(String(jobId)); else next.add(String(jobId));
        return next;
      });
    } catch (error) {
      setToast(error?.response?.data?.message || 'Unable to update saved jobs.');
    }
  };

  const submitApplication = async (match) => {
    try {
      const { data } = await api.post('/applications/apply', buildApplicationSubmissionPayload({
        ...match.job,
        matchScore: match.score,
      }));
      setAppliedIds((current) => new Set([...current, String(match.job.id)]));
      setSelectedMatch(null);
      setToast('Application submitted successfully.');
      onApplicationSubmitted?.(data.application);
    } catch (error) {
      setToast(error?.response?.data?.message || 'Unable to submit application.');
    }
  };

  return <section className="dashboard-match-panel rounded-2xl border border-blue-100 bg-white p-6 shadow-sm" aria-labelledby="matched-jobs-heading">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Personalized for your CV</p>
        <h2 id="matched-jobs-heading" className="mt-1 text-xl font-black text-slate-900">Matched Jobs (AI)</h2>
        <p className="mt-1 text-sm text-slate-500">Current openings with match information calculated from your profile.</p>
      </div>
      {toast && <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"><CheckCircle2 className="h-4 w-4" />{toast}</div>}
    </div>
    {matches.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No matching jobs are available right now.</p> : <div className="grid gap-4 md:grid-cols-2">{matches.map((match) => {
      const job = match.job;
      const applied = appliedIds.has(String(job.id));
      const saved = savedIds.has(String(job.id));
      const skills = asList(job.requiredSkills || job.required_skills);
      return <article key={job.id} className="rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-black text-slate-900">{job.title}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{job.company || job.companyName || job.company_name}</p></div>
          {applied ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Applied</span> : match.score !== null && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{match.score}% Match</span>}
        </div>
        {match.overlap.length > 0 && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-800">Matched skills: {match.overlap.slice(0, 4).join(', ')}</p>}
        <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-3"><span>{job.salary || 'Salary not provided'}</span><span>{job.type || job.job_type || 'Type not provided'}</span><span>{job.workSetup || job.work_mode || job.location || 'Location not provided'}</span></div>
        <div className="mt-5 flex items-center gap-2"><button type="button" onClick={() => setSelectedMatch(match)} className="min-h-10 flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">View Details &amp; Apply</button><button type="button" aria-label={saved ? 'Remove saved job' : 'Save for Later'} title={saved ? 'Remove saved job' : 'Save for Later'} onClick={() => toggleSaved(job.id)} className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${saved ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}</button></div>
      </article>;
    })}</div>}
    {selectedMatch && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedMatch(null)}><section role="dialog" aria-modal="true" aria-labelledby="matched-job-detail-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div>{selectedMatch.score !== null && <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{selectedMatch.score}% AI match</p>}<h2 id="matched-job-detail-title" className="mt-2 text-2xl font-black text-slate-950">{selectedMatch.job.title}</h2><p className="mt-1 font-bold text-slate-600">{selectedMatch.job.company || selectedMatch.job.companyName || selectedMatch.job.company_name} · {selectedMatch.job.location || 'Location not provided'}</p></div><button type="button" aria-label="Close job details" onClick={() => setSelectedMatch(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <p className="mt-6 text-sm leading-6 text-slate-600">{selectedMatch.job.description || 'No description provided by the employer.'}</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2"><div><h3 className="font-black text-slate-900">Responsibilities</h3>{asList(selectedMatch.job.responsibilities).length ? <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-5 text-slate-600">{asList(selectedMatch.job.responsibilities).map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No responsibilities provided.</p>}</div><div><h3 className="font-black text-slate-900">Required skills</h3>{skillsFor(selectedMatch.job).length ? <div className="mt-3 flex flex-wrap gap-2">{skillsFor(selectedMatch.job).map((skill) => <span key={skill} className={`rounded-full px-3 py-1 text-xs font-bold ${selectedMatch.overlap.some((matched) => normalize(matched) === normalize(skill)) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{skill}</span>)}</div> : <p className="mt-3 text-sm text-slate-500">No required skills provided.</p>}</div></div>
      <div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-900">Salary: {selectedMatch.job.salary || 'Not provided'}</p><p className="mt-2 text-sm text-slate-600">Benefits: {asList(selectedMatch.job.benefits).join(' · ') || 'Not provided'}</p></div>
      <button type="button" disabled={appliedIds.has(String(selectedMatch.job.id))} onClick={() => submitApplication(selectedMatch)} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:bg-emerald-600">{appliedIds.has(String(selectedMatch.job.id)) ? 'Application submitted' : 'Submit Application'}</button>
    </section></div>}
  </section>;
}

function skillsFor(job) {
  return asList(job.requiredSkills || job.required_skills || job.skills || job.tags)
    .map((skill) => typeof skill === 'string' ? skill : skill?.name || skill?.skill_name)
    .filter(Boolean);
}
