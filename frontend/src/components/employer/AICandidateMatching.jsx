import { useEffect, useState } from 'react';
import { CalendarDays, Check, ChevronDown, FileText, Loader2, Search, SlidersHorizontal, Sparkles, UserRound, X } from 'lucide-react';
import api from '../../services/api';

const DEFAULT_WEIGHTS = { skills: 40, experience: 30, education: 15, location: 15 };
const WEIGHT_CARDS = [
  ['skills', 'Hard skills overlap'],
  ['experience', 'Experience relevance'],
  ['education', 'Education & certifications'],
  ['location', 'Work model & location'],
];

function scoreColor(score) {
  if (score >= 85) return '#059669';
  if (score >= 65) return '#d97706';
  return '#dc2626';
}

function ScoreGauge({ score = 0 }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const color = scoreColor(value);
  return <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, #e2e8f0 0deg)` }} aria-label={`${value}% match`}>
    <div className="grid h-13 w-13 place-items-center rounded-full bg-white text-sm font-black text-slate-900">{value}%</div>
  </div>;
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

export default function AICandidateMatching({ initialJobId = '' }) {
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState(String(initialJobId || ''));
  const [candidates, setCandidates] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [customizeWeights, setCustomizeWeights] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [actionId, setActionId] = useState('');
  const [scheduleCandidate, setScheduleCandidate] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedJob = jobs.find((job) => String(job.id) === String(jobId));

  useEffect(() => {
    let active = true;
    api.get('/employer/matching/jobs')
      .then(({ data }) => {
        if (!active) return;
        const ownedJobs = data.jobs || [];
        setJobs(ownedJobs);
        setJobId((current) => ownedJobs.some((job) => String(job.id) === String(current)) ? String(current) : String(ownedJobs[0]?.id || ''));
      })
      .catch((requestError) => active && setError(requestError?.response?.data?.message || 'Unable to load active jobs.'))
      .finally(() => active && setLoadingJobs(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!jobId) {
      return undefined;
    }
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setLoadingCandidates(true);
        setError('');
        return api.get(`/employer/matching/candidates/${jobId}`);
      })
      .then((response) => {
        if (!active || !response) return;
        const { data } = response;
        setCandidates(data.candidates || []);
        setRecommended(data.recommendedCandidates || []);
      })
      .catch((requestError) => active && setError(requestError?.response?.data?.message || 'Unable to load candidate matches.'))
      .finally(() => active && setLoadingCandidates(false));
    return () => { active = false; };
  }, [jobId]);

  const changeWeight = (key, nextValue) => {
    const next = Number(nextValue);
    const peers = Object.keys(weights).filter((item) => item !== key);
    const peerTotal = peers.reduce((sum, item) => sum + weights[item], 0);
    const remaining = 100 - next;
    const updated = { ...weights, [key]: next };
    let assigned = 0;
    peers.forEach((peer, index) => {
      const share = index === peers.length - 1
        ? remaining - assigned
        : Math.round(remaining * (peerTotal ? weights[peer] / peerTotal : 1 / peers.length));
      updated[peer] = share;
      assigned += share;
    });
    setWeights(updated);
  };

  const refreshCandidates = async () => {
    const { data } = await api.get(`/employer/matching/candidates/${jobId}`);
    setCandidates(data.candidates || []);
    setRecommended(data.recommendedCandidates || []);
  };

  const runMatching = async () => {
    if (!jobId) return;
    setScoring(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post(`/employer/matching/run/${jobId}`, { weights }, { timeout: 90000 });
      setCandidates(data.candidates || []);
      setNotice(`Scored ${data.count} applicants${data.geminiEnabled ? ' with Gemini evaluation for the top candidates' : ' using deterministic matching'}.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to run candidate matching.');
    } finally {
      setScoring(false);
    }
  };

  const runAction = async (candidate, action) => {
    const key = `${action}-${candidate.applicationId || candidate.id}`;
    setActionId(key);
    setError('');
    setNotice('');
    try {
      if (action === 'shortlist') {
        await api.post('/employer/matching/shortlist', { applicationId: candidate.applicationId });
        setNotice(`${candidate.name} was shortlisted and notified.`);
      } else if (action === 'reject') {
        await api.patch(`/employer/applications/${candidate.applicationId}/status`, { status: 'rejected' });
        setNotice(`${candidate.name} was marked as rejected.`);
      } else if (action === 'invite') {
        await api.post('/employer/job-invitations', {
          candidateId: candidate.id || candidate.candidateId,
          jobId,
          message: `Hi ${candidate.name || 'Candidate'}, we would like to invite you to apply for ${selectedJob?.title || 'this role'}.`,
        });
        setNotice(`Invitation sent to ${candidate.name}.`);
      } else if (action === 'schedule') {
        if (!scheduledAt) throw new Error('Choose an interview date and time.');
        await api.post('/interviews', { applicationId: candidate.applicationId, scheduled_at: new Date(scheduledAt).toISOString(), interview_type: 'video' });
        setScheduleCandidate(null);
        setScheduledAt('');
        setNotice(`Interview invitation sent to ${candidate.name}.`);
      }
      await refreshCandidates();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to complete this action.');
    } finally {
      setActionId('');
    }
  };

  const openResume = (candidate) => {
    if (!candidate.cvUrl) return;
    const rawUrl = String(candidate.cvUrl);
    const resumePath = /^https?:\/\//i.test(rawUrl) ? rawUrl : `/${rawUrl.replace(/^\/+/, '')}`;
    const apiBase = new URL(api.defaults.baseURL || '/api', window.location.origin);
    const url = new URL(resumePath, apiBase);
    if (url.protocol === 'http:' || url.protocol === 'https:') window.open(url.href, '_blank', 'noopener,noreferrer');
  };

  if (loadingJobs) return <div className="flex items-center justify-center gap-2 p-12 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading active jobs...</div>;

  return <section className="space-y-6" aria-labelledby="matching-title">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700"><Sparkles className="h-4 w-4" />Candidate intelligence</p>
        <h1 id="matching-title" className="mt-1 text-2xl font-black text-slate-950">AI Candidate Matching</h1>
        <p className="mt-1 text-sm text-slate-600">Rank applicants against the requirements that matter for this role.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="matching-job">Select job</label>
        <select id="matching-job" value={jobId} onChange={(event) => { setJobId(event.target.value); setNotice(''); }} className="min-h-11 min-w-64 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
          {jobs.length === 0 && <option value="">No active jobs</option>}
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.applicantsCount} applicants</option>)}
        </select>
        <button type="button" onClick={runMatching} disabled={!jobId || scoring || loadingCandidates} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
          {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{scoring ? 'Scoring candidates...' : 'Run AI Match / Re-Score'}
        </button>
      </div>
    </header>

    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {WEIGHT_CARDS.map(([key, label]) => <article key={key} className="border-l-4 border-emerald-600 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
        <div className="mt-1 flex items-baseline justify-between"><p className="text-2xl font-black text-slate-950">{weights[key]}<span className="text-sm">%</span></p><div className="h-1.5 w-20 overflow-hidden rounded bg-slate-100"><div className="h-full bg-emerald-600" style={{ width: `${weights[key]}%` }} /></div></div>
        {customizeWeights && <label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><span className="sr-only">{label} weight</span><input type="range" min="0" max="100" value={weights[key]} onChange={(event) => changeWeight(key, event.target.value)} className="w-full accent-emerald-700" /><span className="w-8 text-right">{weights[key]}</span></label>}
      </article>)}
    </div>
    <button type="button" onClick={() => setCustomizeWeights((current) => !current)} aria-expanded={customizeWeights} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-emerald-800"><SlidersHorizontal className="h-4 w-4" />{customizeWeights ? 'Hide weight controls' : 'Customize weights'}<ChevronDown className={`h-4 w-4 transition-transform ${customizeWeights ? 'rotate-180' : ''}`} /></button>

    {!jobId ? <div className="border border-dashed border-slate-300 bg-white p-10 text-center"><Search className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 font-bold text-slate-900">No active jobs to match</h2><p className="mt-1 text-sm text-slate-600">Publish a job to score applicants against it.</p></div> : <>
      <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div><h2 className="text-xl font-black text-slate-950">Top matched candidates</h2><p className="mt-1 text-sm text-slate-600">{selectedJob?.title || 'Selected role'} · {candidates.length} applicants</p></div>
        {candidates[0]?.evaluatedAt && <p className="text-xs text-slate-500">Last evaluated {new Date(candidates[0].evaluatedAt).toLocaleString()}</p>}
      </div>
      {loadingCandidates ? <div className="flex items-center justify-center gap-2 bg-white p-10 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading candidate scores...</div> : candidates.length === 0 ? <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No direct applicants have applied to this job yet.</div> : <div className="space-y-3">
        {candidates.map((candidate, index) => {
          const score = Number(candidate.matchScore ?? candidate.ai_match_score ?? 0);
          const strengths = parseList(candidate.strengths ?? candidate.ai_strengths);
          const missingSkills = parseList(candidate.missingSkills ?? candidate.ai_missing_skills);
          const shortlisted = String(candidate.status || '').toLowerCase() === 'shortlisted';
          return <article key={candidate.applicationId || candidate.id} className="bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-slate-600">{candidate.avatarUrl ? <img src={candidate.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</div>
                <div className="min-w-0"><p className="text-xs font-bold uppercase text-emerald-700">#{index + 1} ranked match</p><h3 className="truncate text-lg font-black text-slate-950">{candidate.name || 'Candidate'}</h3><p className="text-sm text-slate-600">{candidate.currentTitle || 'Candidate'} · {candidate.experienceYears || 0} years experience</p></div>
              </div>
              <ScoreGauge score={score} />
            </div>
            {candidate.matchSummary && <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-700">{candidate.matchSummary}</p>}
            <details className="group mt-3 border-t border-slate-100 pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-800"><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />AI insights</summary>
              <div className="grid gap-4 pt-3 md:grid-cols-2"><div><p className="mb-2 text-xs font-bold uppercase text-emerald-700">Strengths</p><div className="flex flex-wrap gap-2">{strengths.length ? strengths.map((item, idx) => <span key={`${item}-${idx}`} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{item}</span>) : <span className="text-sm text-slate-500">Run a match to generate insights.</span>}</div></div><div><p className="mb-2 text-xs font-bold uppercase text-amber-700">Missing skills</p><div className="flex flex-wrap gap-2">{missingSkills.length ? missingSkills.map((item, idx) => <span key={`${item}-${idx}`} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{item}</span>) : <span className="text-sm text-slate-500">No missing required skills found.</span>}</div></div></div>
            </details>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={!candidate.applicationId || shortlisted || Boolean(actionId)} onClick={() => runAction(candidate, 'shortlist')} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{shortlisted ? <Check className="h-3.5 w-3.5" /> : null}{shortlisted ? 'Shortlisted' : 'Shortlist'}</button>
              <button type="button" disabled={Boolean(actionId)} onClick={() => setScheduleCandidate(candidate)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><CalendarDays className="h-3.5 w-3.5" />Invite to Interview</button>
              <button type="button" disabled={!candidate.cvUrl} onClick={() => openResume(candidate)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><FileText className="h-3.5 w-3.5" />View Full Resume</button>
              <button type="button" disabled={!candidate.applicationId || Boolean(actionId)} onClick={() => runAction(candidate, 'reject')} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><X className="h-3.5 w-3.5" />Reject</button>
            </div>
          </article>;
        })}
      </div>}

      {candidates.length < 3 && recommended.length > 0 && <section className="space-y-3 border-t border-slate-200 pt-6">
        <div><p className="text-xs font-bold uppercase text-emerald-700">Talent pool</p><h2 className="text-xl font-black text-slate-950">Recommended from Talent Pool</h2><p className="mt-1 text-sm text-slate-600">Potential matches who have not applied to this job.</p></div>
        <div className="grid gap-3 lg:grid-cols-2">{recommended.map((candidate) => <article key={candidate.id} className="flex items-center justify-between gap-3 bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{candidate.name}</h3><p className="truncate text-xs text-slate-600">{candidate.currentTitle} · {candidate.experienceYears || 0} years</p></div><span className="shrink-0 text-sm font-black text-emerald-800">{candidate.matchScore}%</span></div><button type="button" disabled={Boolean(actionId)} onClick={() => runAction(candidate, 'invite')} className="shrink-0 rounded-md border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Invite</button></article>)}</div>
      </section>}
    </>}

    {scheduleCandidate && <div className="fixed inset-0 z-80 grid place-items-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setScheduleCandidate(null)}>
      <form onSubmit={(event) => { event.preventDefault(); runAction(scheduleCandidate, 'schedule'); }} className="w-full max-w-md space-y-4 rounded-lg bg-white p-5 shadow-2xl" aria-labelledby="schedule-title">
        <div><h2 id="schedule-title" className="text-lg font-black text-slate-950">Invite {scheduleCandidate.name}</h2><p className="mt-1 text-sm text-slate-600">Choose an interview date and time.</p></div>
        <label className="block text-sm font-semibold text-slate-700">Interview date and time<input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} min={new Date().toISOString().slice(0, 16)} className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setScheduleCandidate(null)} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancel</button><button type="submit" disabled={Boolean(actionId)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">{actionId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Send invite</button></div>
      </form>
    </div>}
  </section>;
}