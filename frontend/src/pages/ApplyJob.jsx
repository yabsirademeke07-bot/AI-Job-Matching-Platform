import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getJobById } from '../services/jobService';
import { clearPendingApplication, continueApplicationFlow, getApplicationRequirements, getPendingApplication } from '../utils/applicationFlow';
import api from '../services/api';

const APPLICATION_PREPARE_TIMEOUT_MS = 12000;

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Application preparation timed out.')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export default function ApplyJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [existingApplication, setExistingApplication] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const prepareApplication = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const pending = getPendingApplication();
        const requirements = getApplicationRequirements();
        const seekerRoles = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'];
        const hasPendingJob = pending?.jobId === String(id);
        const shouldRedirect = hasPendingJob
          ? !requirements.isAuthenticated || !requirements.otpVerified || !seekerRoles.includes(requirements.role) || !requirements.hasSatisfiedCvPreference || !requirements.profileCompleted
          : !isAuthenticated || !requirements.hasSatisfiedCvPreference;

        if (shouldRedirect) {
          if (hasPendingJob) continueApplicationFlow(navigate, { jobId: id });
          else if (!isAuthenticated) navigate('/login', { state: { from: location.pathname, intent: 'apply', jobId: id } });
          else navigate(`/resume?jobId=${encodeURIComponent(id)}`, { replace: true });
          return;
        }

        const jobResponse = await withTimeout(getJobById(id), APPLICATION_PREPARE_TIMEOUT_MS);
        const jobData = jobResponse?.job || jobResponse;
        let existing = null;
        try {
          const { data: applicationsData } = await api.get('/seeker/applications');
          existing = (applicationsData?.applications || []).find((application) => (
            String(application.job_id || application.jobId || application.job?.id) === String(id)
          )) || null;
        } catch (applicationsError) {
          console.error('Unable to check for an existing application:', applicationsError);
          if (isMounted) {
            setErrorMessage('We could not check your previous applications. Duplicate applications are blocked when you submit.');
          }
        }
        if (isMounted) {
          const resolvedJob = jobData ? {
            ...jobData,
            company: jobData.company || jobData.companyName || jobData.company_name || 'Company',
            companyName: jobData.companyName || jobData.company || jobData.company_name || 'Company',
            location: jobData.location || jobData.city || 'Location not specified',
          } : null;
          setJob(resolvedJob);
          setExistingApplication(existing || null);
          if (!resolvedJob) setErrorMessage('Unable to load application details. Please try again.');
        }
      } catch (error) {
        console.error('Error preparing application:', error);
        if (isMounted) {
          setJob(null);
          if (error.response?.status === 404) {
            const returnPath = getPendingApplication()?.returnPath || '/ai-career-matches';
            clearPendingApplication();
            navigate(returnPath, {
              replace: true,
              state: { availabilityNotice: 'That job is no longer available. Choose another current match.' },
            });
          } else {
            setErrorMessage('Unable to load application details. Please try again.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    prepareApplication();
    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated, location.pathname, navigate]);

  const handleGenerateDraft = () => {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const fullName = JSON.parse(localStorage.getItem('user') || '{}')?.full_name || 'Candidate';
    const draft = `Dear Hiring Manager,\n\nI am ${fullName}, and I am excited to apply for the ${job?.title || 'role'} position at ${job?.company || job?.companyName || 'your company'}. My background aligns well with the role's requirements, especially in ${job?.skills?.slice(0, 3).join(', ') || 'software development'} and problem solving. I would welcome the opportunity to contribute my skills and continue learning in a collaborative environment.\n\nThank you for considering my application.\n\nSincerely,\n${fullName}`;
    setCoverLetter(profile?.coverLetter || draft);
  };

  const handleContinue = (event) => {
    event.preventDefault();
    if (!job) return;
    navigate(`/applications/${encodeURIComponent(id)}/review`, {
      state: { job, coverLetter: coverLetter.trim() },
    });
  };

  if (existingApplication) return <main className="min-h-[70vh] bg-slate-50 px-4 py-10"><div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><h1 className="text-2xl font-black text-slate-900">Application Submitted</h1><p className="mt-3 text-sm leading-6 text-slate-600">You have already applied for this job.</p><button type="button" onClick={() => navigate(`/applications/${existingApplication.id}`, { state: { application: existingApplication } })} className="brand-button mt-5 px-5 py-3 text-sm">View Application</button></div></main>;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Preparing application…</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Application details unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{errorMessage || 'We could not prepare this application.'}</p>
          <button
            type="button"
            onClick={() => navigate(getPendingApplication()?.returnPath || '/ai-career-matches')}
            className="brand-button mt-5 px-5 py-3 text-sm"
          >
            Back to Matches
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <button type="button" onClick={() => navigate(`/jobs/${id}`, { state: { job } })} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Job Details
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {errorMessage && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="status">{errorMessage}</div>}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Application</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">Apply for {job?.title || 'Position'}</h1>
              <p className="mt-2 text-sm text-slate-600">at {job?.company || job?.companyName || 'Company'} • {job?.location || 'Location not specified'}</p>
            </div>
          </div>

          <form onSubmit={handleContinue} className="mt-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="cover-letter" className="block text-sm font-semibold text-slate-700">Cover letter (Optional)</label>
                <button type="button" onClick={handleGenerateDraft} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                  Generate draft from profile
                </button>
              </div>
              <textarea
                id="cover-letter"
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                rows={7}
                placeholder="Write a short note about why you are a good fit for this role (optional)..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => navigate(`/jobs/${id}`)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Cancel
              </button>
              <button type="submit" className="brand-button min-w-52.5 px-5 py-3 text-sm">
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
