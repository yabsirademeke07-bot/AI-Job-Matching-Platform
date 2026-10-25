import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileText, Send } from 'lucide-react';
import api from '../services/api';
import { scrollToFeedback } from '../utils/scrollHelper.js';
import { buildApplicationSubmissionPayload, clearPendingApplication, getPendingApplication } from '../utils/applicationFlow';
import { getJobById } from '../services/jobService';

export default function ApplicationSubmit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [coverNote, setCoverNote] = useState(location.state?.coverLetter || '');
  const [consentToAiProcessing, setConsentToAiProcessing] = useState(false);
  const [error, setError] = useState('');
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [job, setJob] = useState(() => {
    const routeJob = location.state?.job;
    const routeJobId = routeJob?.id ?? routeJob?.jobId ?? routeJob?.job_id;
    return routeJob && String(routeJobId) === String(id) ? routeJob : null;
  });
  const isSelectedJobLoaded = Boolean(
    job && String(job.id ?? job.jobId ?? job.job_id) === String(id),
  );

  useEffect(() => {
    if (!error) return undefined;
    const timeoutId = window.setTimeout(() => setError(''), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    if (!submittedApplication?.id) return undefined;
    const timeoutId = window.setTimeout(() => {
      navigate('/applications', {
        replace: true,
        state: { submittedApplicationId: submittedApplication.id },
      });
    }, 10000);
    return () => window.clearTimeout(timeoutId);
  }, [navigate, submittedApplication]);

  useEffect(() => {
    if (!id || isSelectedJobLoaded) return undefined;
    let active = true;
    getJobById(id)
      .then((jobDetails) => {
        if (active) setJob(jobDetails);
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Unable to load the selected job details.');
      });
    return () => {
      active = false;
    };
  }, [id, isSelectedJobLoaded]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isSelectedJobLoaded) {
      setError('The selected job details are still loading. Please try again shortly.');
      return;
    }
    try {
      const { data } = await api.post('/applications/apply', buildApplicationSubmissionPayload({
        ...(job || {}),
        id,
      }, {
        coverLetter: coverNote.trim(),
        consentToAiProcessing,
      }));
      const applicationId = data?.application?.id ?? data?.application?.applicationId ?? data?.application?.application_id;
      if (!applicationId) throw new Error('Application submitted but no application ID was returned.');
      clearPendingApplication();
      setSubmittedApplication({ id: applicationId });
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Unable to submit your application.';
      if (requestError?.response?.status === 404 && /job is no longer available/i.test(message)) {
        const returnPath = getPendingApplication()?.returnPath || '/ai-career-matches';
        clearPendingApplication();
        navigate(returnPath, {
          replace: true,
          state: { availabilityNotice: 'That job is no longer available. Choose another current match.' },
        });
      } else {
        setError(message);
      }
      scrollToFeedback('error');
    }
  };

  if (submittedApplication) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <section className="w-full max-w-lg rounded-2xl border border-emerald-200 bg-white p-7 text-center shadow-sm dark:border-emerald-900 dark:bg-slate-900" role="status" aria-live="polite">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Your application is submitted successfully</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Opening your application tracker in 10 seconds.</p>
          <button type="button" onClick={() => navigate('/applications', { replace: true, state: { submittedApplicationId: submittedApplication.id } })} className="brand-button mt-5 px-5 py-3 text-sm">
            View application tracker
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-9">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-deep)]"><FileText className="h-6 w-6" /></div>
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand-deep)]">Final step</p><h1 className="mt-1 text-2xl font-black text-slate-900">Submit your application</h1><p className="mt-2 text-sm text-slate-600">{job?.title || `Application for job ${id}`} {job?.company ? `at ${job.company}` : ''}</p></div>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div><label htmlFor="cover-note" className="mb-2 block text-sm font-bold text-slate-800">Short note <span className="font-normal text-slate-500">(optional)</span></label><textarea id="cover-note" rows="5" value={coverNote} onChange={(event) => setCoverNote(event.target.value)} placeholder="Tell the employer why this role is a strong fit..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white" /></div>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consentToAiProcessing}
              onChange={(event) => setConsentToAiProcessing(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
            />
            <span>
              I consent to have my CV analyzed by Google Gemini to generate a job-match score. CV text is anonymized where possible before processing. If unchecked or Gemini is unavailable, MatchWise calculates an evidence-based score locally.
            </span>
          </label>
          <button type="submit" disabled={!isSelectedJobLoaded} className="brand-button w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"><Send className="h-4 w-4" /> Submit Application <ArrowRight className="h-4 w-4" /></button>
        </form>
      </div>
    </main>
  );
}
