import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import api from '../../services/api';

const MAX_CANDIDATES = 200;
const QUICK_COUNTS = [3, 5, 10];
const EMPTY_CANDIDATES = [];

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value).flat();
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCandidateScore(candidate) {
  const score = Number(candidate.matchScore ?? candidate.ai_match_score ?? 0);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
}

function getScoreTone(score) {
  if (score >= 85) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (score >= 60) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function getPodium(index) {
  if (index === 0) return { label: '🥇 Highest Match', tone: 'bg-amber-50 text-amber-800 ring-amber-200' };
  if (index === 1) return { label: '🥈 2nd Match', tone: 'bg-slate-100 text-slate-700 ring-slate-300' };
  if (index === 2) return { label: '🥉 3rd Match', tone: 'bg-orange-50 text-orange-800 ring-orange-200' };
  return null;
}

function formatDate(value) {
  if (!value) return 'Application date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Application date unavailable';
  return `Applied ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)}`;
}

function getDefaultQuota(job) {
  const vacancies = Math.max(1, Number(job?.vacancyCount ?? job?.vacancies ?? 1) || 1);
  return Math.min(MAX_CANDIDATES, Math.max(3, Math.round(vacancies * 2.5)));
}

function ScoreBar({ label, value }) {
  const score = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-bold tabular-nums text-slate-800">{score}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600 transition-[width] duration-500" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function AICandidateMatching({ initialJobId = '' }) {
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState(String(initialJobId || ''));
  const [candidates, setCandidates] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [topCount, setTopCount] = useState(3);
  const [minScore, setMinScore] = useState(60);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [bulkShortlisting, setBulkShortlisting] = useState(false);
  const [actionId, setActionId] = useState('');
  const [scheduleCandidate, setScheduleCandidate] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [hasRanked, setHasRanked] = useState(false);
  const [resultsJobId, setResultsJobId] = useState('');
  const [lastRunConfig, setLastRunConfig] = useState(null);

  const selectedJob = jobs.find((job) => String(job.id) === String(jobId));
  const selectedApplicantCount = Math.max(0, Number(selectedJob?.applicantsCount) || 0);
  const effectiveTopCount = Math.min(MAX_CANDIDATES, Math.max(1, Number(topCount) || 1));
  const currentCandidates = resultsJobId === jobId ? candidates : EMPTY_CANDIDATES;
  const rankedCandidates = useMemo(
    () => hasRanked && resultsJobId === jobId
      ? currentCandidates.filter((candidate) => getCandidateScore(candidate) >= minScore).slice(0, effectiveTopCount)
      : [],
    [currentCandidates, effectiveTopCount, hasRanked, jobId, minScore, resultsJobId],
  );
  const needsRerun = hasRanked && resultsJobId === jobId
    && (!lastRunConfig || lastRunConfig.topCount !== effectiveTopCount || lastRunConfig.minScore !== minScore);
  const bulkApplicationIds = rankedCandidates
    .map((candidate) => Number(candidate.applicationId))
    .filter((id) => Number.isInteger(id) && id > 0);

  useEffect(() => {
    let active = true;
    api.get('/employer/matching/jobs')
      .then(({ data }) => {
        if (!active) return;
        const ownedJobs = Array.isArray(data.jobs) ? data.jobs : [];
        setJobs(ownedJobs);
        const requestedJobExists = ownedJobs.some((job) => String(job.id) === String(initialJobId));
        const nextJobId = requestedJobExists ? String(initialJobId) : String(ownedJobs[0]?.id || '');
        setJobId(nextJobId);
        const nextJob = ownedJobs.find((job) => String(job.id) === nextJobId);
        if (nextJob) setTopCount(getDefaultQuota(nextJob));
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Unable to load your jobs.');
      })
      .finally(() => active && setLoadingJobs(false));
    return () => { active = false; };
  }, [initialJobId]);

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
        return api.get(`/employer/matching/candidates/${encodeURIComponent(jobId)}`);
      })
      .then((response) => {
        if (!active || !response) return;
        const { data } = response;
        const nextCandidates = Array.isArray(data.candidates) ? data.candidates : [];
        setCandidates(nextCandidates);
        setRecommended(Array.isArray(data.recommendedCandidates) ? data.recommendedCandidates : []);
        setHasRanked(nextCandidates.some((candidate) => Boolean(candidate.evaluatedAt)));
        setResultsJobId(jobId);
        setLastRunConfig(null);
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Unable to load applicants for this job.');
      })
      .finally(() => active && setLoadingCandidates(false));
    return () => { active = false; };
  }, [jobId]);

  const refreshCandidates = async () => {
    if (!jobId) return;
    const { data } = await api.get(`/employer/matching/candidates/${encodeURIComponent(jobId)}`);
    const nextCandidates = Array.isArray(data.candidates) ? data.candidates : [];
    setCandidates(nextCandidates);
    setRecommended(Array.isArray(data.recommendedCandidates) ? data.recommendedCandidates : []);
  };

  const runMatching = async () => {
    if (!jobId) return;
    setScoring(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post(
        `/employer/jobs/${encodeURIComponent(jobId)}/ai-match-rank`,
        { topCount: effectiveTopCount, minScore },
        { timeout: 90000 },
      );
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setHasRanked(true);
      setResultsJobId(jobId);
      setLastRunConfig({ topCount: effectiveTopCount, minScore });
      setNotice(
        `${data.candidates?.length || 0} of ${data.totalApplicants || 0} applicants ranked at or above ${minScore}%. Scores use the 45/35/20 skills, experience, and education weighting. ${data.aiEvaluatedCount || 0} AI-generated candidate summaries.`,
      );
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
        setNotice(`${candidate.name} was shortlisted.`);
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
        await api.post('/interviews', {
          applicationId: candidate.applicationId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          interview_type: 'video',
        });
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

  const shortlistAll = async () => {
    const applicationIds = bulkApplicationIds;
    if (!applicationIds.length) {
      setError('There are no ranked applications to shortlist.');
      return;
    }
    setBulkShortlisting(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/employer/applications/bulk-status', {
        applicationIds,
        status: 'shortlisted',
      });
      setCandidates((current) => current.map((candidate) => (
        applicationIds.includes(Number(candidate.applicationId))
          ? { ...candidate, status: 'shortlisted' }
          : candidate
      )));
      setNotice(`${data.updatedCount || applicationIds.length} top candidate${applicationIds.length === 1 ? '' : 's'} shortlisted.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to shortlist the ranked candidates.');
    } finally {
      setBulkShortlisting(false);
    }
  };

  const openResume = (candidate) => {
    if (!candidate.cvUrl) return;
    const rawUrl = String(candidate.cvUrl);
    const resumePath = /^https?:\/\//i.test(rawUrl) ? rawUrl : `/${rawUrl.replace(/^\/+/, '')}`;
    const apiBase = new URL(api.defaults.baseURL || '/api', window.location.origin);
    const url = new URL(resumePath, apiBase);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      window.open(url.href, '_blank', 'noopener,noreferrer');
    }
  };

  const setQuickCount = (count) => setTopCount(Math.min(MAX_CANDIDATES, Math.max(1, count)));
  const rankedResultMessage = selectedApplicantCount === 0
    ? 'No direct applicants are available to rank for this job.'
    : minScore > 0
      ? `No applicants meet the ${minScore}% minimum match threshold.`
      : 'No applicants are available to rank for this job.';

  if (loadingJobs) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-sm font-semibold text-slate-500" role="status">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your jobs...
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="matching-title">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
              <Sparkles className="h-4 w-4" /> Candidate intelligence
            </p>
            <h1 id="matching-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              AI Candidate Matching &amp; Ranking
            </h1>
            <p className="mt-1 text-sm text-slate-600">Rank applicants against the skills, experience, and education required for each role.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Select job vacancy</span>
            <span className="relative block">
              <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <select
                id="matching-job"
                value={jobId}
                onChange={(event) => {
                  const nextJob = jobs.find((job) => String(job.id) === event.target.value);
                  setJobId(event.target.value);
                  if (nextJob) setTopCount(getDefaultQuota(nextJob));
                  setLastRunConfig(null);
                  setNotice('');
                }}
                className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                aria-label="Select job vacancy"
                disabled={!jobs.length}
              >
                      {jobs.length === 0 && <option value="">No jobs available</option>}
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} · {job.department || 'General'} · {job.vacancyCount || 1} {Number(job.vacancyCount || 1) === 1 ? 'vacancy' : 'vacancies'} · {job.applicantsCount || 0} applicants
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </span>
          </label>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{selectedApplicantCount}</span> total applicant{selectedApplicantCount === 1 ? '' : 's'}
          </div>
        </div>
      </header>

      {(error || notice) && (
        <div
          role={error ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {error || notice}
        </div>
      )}

      {!jobs.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-bold text-slate-900">No job vacancies found</h2>
          <p className="mt-1 text-sm text-slate-600">Post a job and receive applications to start ranking candidates.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="ranking-controls-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="ranking-controls-title" className="text-lg font-black text-slate-900">Set ranking preferences</h2>
                <p className="mt-1 text-sm text-slate-500">Choose how many candidates to review and your minimum match score.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Default: about 2.5 candidates per vacancy</span>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <fieldset>
                <legend className="text-sm font-bold text-slate-800">How many top matched candidates?</legend>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {QUICK_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={effectiveTopCount === count}
                      onClick={() => setQuickCount(count)}
                      className={`rounded-full border px-4 py-2 text-xs font-bold transition ${effectiveTopCount === count ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                      Top {count}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={selectedApplicantCount > 0 && effectiveTopCount === Math.min(MAX_CANDIDATES, selectedApplicantCount)}
                    onClick={() => setQuickCount(Math.max(1, selectedApplicantCount))}
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${(selectedApplicantCount > 0 && effectiveTopCount === Math.min(MAX_CANDIDATES, selectedApplicantCount)) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}
                  >
                    All Ranked
                  </button>
                  <div className="ml-0 inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 sm:ml-2">
                    <button type="button" aria-label="Decrease candidate count" onClick={() => setQuickCount(effectiveTopCount - 1)} disabled={effectiveTopCount <= 1} className="grid h-8 w-8 place-items-center rounded-lg font-bold text-slate-600 hover:bg-white disabled:opacity-40">−</button>
                    <label className="sr-only" htmlFor="candidate-count">Custom number of candidates</label>
                    <input
                      id="candidate-count"
                      type="number"
                      min="1"
                      max={MAX_CANDIDATES}
                      value={topCount}
                      onChange={(event) => setTopCount(event.target.value === '' ? '' : Math.min(MAX_CANDIDATES, Math.max(1, Math.round(Number(event.target.value)))))}
                      onBlur={() => setTopCount(effectiveTopCount)}
                      className="h-8 w-14 border-0 bg-transparent text-center text-sm font-black text-slate-900 outline-none"
                    />
                    <button type="button" aria-label="Increase candidate count" onClick={() => setQuickCount(effectiveTopCount + 1)} disabled={effectiveTopCount >= MAX_CANDIDATES} className="grid h-8 w-8 place-items-center rounded-lg font-bold text-slate-600 hover:bg-white disabled:opacity-40">+</button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Rank up to {MAX_CANDIDATES} applicants per run.</p>
              </fieldset>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="minimum-score" className="text-sm font-bold text-slate-800">Minimum match threshold</label>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">{minScore}% minimum</span>
                </div>
                <input
                  id="minimum-score"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minScore}
                  onChange={(event) => setMinScore(Number(event.target.value))}
                  className="mt-4 w-full accent-blue-600"
                  aria-valuetext={`${minScore}% minimum match`}
                />
                <div className="flex justify-between text-[11px] text-slate-400"><span>0%</span><span>Default 60%</span><span>100%</span></div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-xs leading-5 text-slate-500">Scores combine skills (45%), experience (35%), and education (20%).</p>
              <button
                type="button"
                onClick={runMatching}
                disabled={!jobId || scoring || loadingCandidates}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {scoring ? 'Analyzing and ranking candidates...' : '⚡ Run AI Match & Rank Candidates'}
              </button>
            </div>
            {scoring && (
              <div className="mt-4 overflow-hidden rounded-full bg-blue-50" role="status" aria-live="polite">
                <div className="h-1.5 w-full origin-left animate-pulse rounded-full bg-blue-600" />
                <p className="px-3 py-2 text-xs font-medium text-blue-800">Comparing applicant profiles with job requirements...</p>
              </div>
            )}
          </section>

          <section aria-labelledby="ranked-results-title" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Ranked results</p>
                <h2 id="ranked-results-title" className="mt-1 text-xl font-black text-slate-950">Top matched candidates</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedJob?.title || 'Selected role'} · {rankedCandidates.length} shown
                  {selectedApplicantCount ? ` of ${selectedApplicantCount} applicants` : ''}
                </p>
                {needsRerun && <p className="mt-1 text-xs font-medium text-blue-700">Ranking preferences changed. Run AI Match again to refresh the complete result set.</p>}
              </div>
              {bulkApplicationIds.length > 0 && rankedCandidates.some((candidate) => candidate.applicationId && candidate.status !== 'shortlisted') && (
                <button
                  type="button"
                  onClick={shortlistAll}
                  disabled={bulkShortlisting || Boolean(actionId)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkShortlisting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  {bulkShortlisting ? 'Shortlisting...' : `⭐ Shortlist All Top ${bulkApplicationIds.length} Candidates`}
                </button>
              )}
            </div>

            {loadingCandidates ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm font-semibold text-slate-500" role="status">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading applicants...
              </div>
            ) : !hasRanked ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-blue-500" />
                <h3 className="mt-3 font-bold text-slate-900">Ready to rank your applicants</h3>
                <p className="mt-1 text-sm text-slate-600">{selectedApplicantCount ? `${selectedApplicantCount} applicants are ready for evaluation.` : 'No direct applicants have applied to this job yet.'} Run AI Match to score them against this vacancy.</p>
              </div>
            ) : rankedCandidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                {rankedResultMessage}
              </div>
            ) : (
              <div className="space-y-4">
                {rankedCandidates.map((candidate, index) => {
                  const score = getCandidateScore(candidate);
                  const strengths = parseList(candidate.strengths ?? candidate.ai_strengths).map(String).filter(Boolean);
                  const missingSkills = parseList(candidate.missingSkills ?? candidate.ai_missing_skills).map(String).filter(Boolean);
                  const summaryPoints = [
                    ...strengths.slice(0, 2),
                    ...(missingSkills.length ? [`Potential gap: ${missingSkills.slice(0, 3).join(', ')}`] : []),
                  ].slice(0, 3);
                  const fallbackSummary = String(candidate.matchSummary || candidate.match_summary || '')
                    .split(/(?<=[.!?])\s+/)
                    .filter(Boolean)
                    .slice(0, 2);
                  const points = summaryPoints.length ? summaryPoints : fallbackSummary;
                  const shortlisted = String(candidate.status || '').toLowerCase() === 'shortlisted';
                  const podium = getPodium(index);
                  return (
                    <article key={candidate.applicationId || candidate.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                      {podium && <div className={`px-5 py-2 text-xs font-black ring-1 ring-inset ${podium.tone}`}>{podium.label}</div>}
                      <div className="space-y-5 p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-50 text-blue-700">
                              {candidate.avatarUrl ? <img src={candidate.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0">
                              <h3 className="break-words text-lg font-black text-slate-950">{candidate.name || 'Candidate'}</h3>
                              <p className="mt-0.5 text-sm font-semibold text-slate-700">{candidate.currentTitle || 'Title not provided'}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{candidate.profile?.location || candidate.location || 'Location not provided'}</span>
                                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(candidate.appliedAt || candidate.applied_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`flex shrink-0 flex-col items-center rounded-2xl border px-4 py-2 ${getScoreTone(score)}`}>
                            <span className="text-2xl font-black tabular-nums">{Math.round(score)}%</span>
                            <span className="text-[10px] font-bold uppercase tracking-wide">Match</span>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <ScoreBar label="Skills Match" value={candidate.skillsScore ?? candidate.skills_match_score} />
                          <ScoreBar label="Experience Match" value={candidate.experienceScore ?? candidate.experience_match_score} />
                          <ScoreBar label="Education Match" value={candidate.educationScore ?? candidate.education_match_score} />
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                            <Sparkles className="h-4 w-4 text-blue-600" /> Why this candidate matches
                          </p>
                          {points.length ? (
                            <ul className="mt-2 space-y-1.5">
                              {points.map((point, pointIndex) => (
                                <li key={`${candidate.applicationId || candidate.id}-${pointIndex}`} className="flex gap-2 text-sm leading-5 text-slate-700">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-slate-600">Run a match to generate candidate-specific strengths and gaps.</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            disabled={!candidate.applicationId || shortlisted || Boolean(actionId) || bulkShortlisting}
                            onClick={() => runAction(candidate, 'shortlist')}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {shortlisted ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                            {shortlisted ? 'Shortlisted' : 'Shortlist'}
                          </button>
                          <button
                            type="button"
                            disabled={!candidate.applicationId || Boolean(actionId) || bulkShortlisting}
                            onClick={() => setScheduleCandidate(candidate)}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CalendarDays className="h-4 w-4" /> Invite to Interview
                          </button>
                          <button
                            type="button"
                            disabled={!candidate.cvUrl}
                            onClick={() => openResume(candidate)}
                            title={candidate.cvUrl ? 'Open candidate CV in a new tab' : 'No CV is available for this candidate'}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <FileText className="h-4 w-4" /> View Full Profile / CV
                          </button>
                          {candidate.applicationId && (
                            <button
                              type="button"
                              disabled={Boolean(actionId) || bulkShortlisting}
                              onClick={() => runAction(candidate, 'reject')}
                              className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X className="h-4 w-4" /> Reject
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {currentCandidates.length < 3 && resultsJobId === jobId && recommended.length > 0 && (
            <section className="space-y-3 border-t border-slate-200 pt-6">
              <div>
                <p className="text-xs font-bold uppercase text-blue-700">Talent pool</p>
                <h2 className="text-xl font-black text-slate-950">Recommended from Talent Pool</h2>
                <p className="mt-1 text-sm text-slate-600">Potential matches who have not applied to this job.</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {recommended.map((candidate) => (
                  <article key={candidate.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><UserRound className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-950">{candidate.name}</h3>
                        <p className="truncate text-xs text-slate-600">{candidate.currentTitle} · {candidate.experienceYears || 0} years</p>
                      </div>
                      <span className="shrink-0 text-sm font-black text-blue-800">{candidate.matchScore}%</span>
                    </div>
                    <button type="button" disabled={Boolean(actionId)} onClick={() => runAction(candidate, 'invite')} className="shrink-0 rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50 disabled:opacity-50">
                      Invite <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {scheduleCandidate && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setScheduleCandidate(null)}>
          <form onSubmit={(event) => { event.preventDefault(); runAction(scheduleCandidate, 'schedule'); }} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl" aria-labelledby="schedule-title">
            <div>
              <h2 id="schedule-title" className="text-lg font-black text-slate-950">Invite {scheduleCandidate.name} to interview</h2>
              <p className="mt-1 text-sm text-slate-600">Choose an interview date and time.</p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Interview date and time
              <input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} min={new Date().toISOString().slice(0, 16)} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setScheduleCandidate(null)} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancel</button>
              <button type="submit" disabled={Boolean(actionId)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                {actionId ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send invite
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
