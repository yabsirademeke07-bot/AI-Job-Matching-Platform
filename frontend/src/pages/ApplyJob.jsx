import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react';
import ResumeSelector from '../components/jobs/ResumeSelector';
import { useAuth } from '../context/AuthContext';
import { applyForJob, getJobById } from '../services/jobService';
import { getApplicationForJob } from '../utils/applicationFlow';

function getStoredResumeList() {
  try {
    const parsed = JSON.parse(localStorage.getItem('seekerResume') || 'null');
    return parsed?.fileName ? [{ id: parsed.id || 'resume-current', name: parsed.fileName }] : [];
  } catch (error) {
    console.error('Unable to read stored resume:', error);
    return [];
  }
}

export default function ApplyJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [resumes] = useState(getStoredResumeList);
  const [selectedResumeId, setSelectedResumeId] = useState(() => getStoredResumeList()[0]?.id || '');
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [existingApplication, setExistingApplication] = useState(() => getApplicationForJob(id));

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname, intent: 'apply', jobId: id } });
      return;
    }

    const savedResume = localStorage.getItem('seekerResume');
    if (!savedResume) {
      navigate(`/resume?jobId=${encodeURIComponent(id)}`, { replace: true });
      return;
    }
    const fetchJob = async () => {
      try {
        setLoading(true);
        const jobData = await getJobById(id);
        setJob(jobData);
      } catch (error) {
        console.error('Failed to load job for application', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const matchScore = useMemo(() => job?.matchBreakdown?.overall || 87, [job]);

  const handleGenerateDraft = () => {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const fullName = JSON.parse(localStorage.getItem('user') || '{}')?.full_name || 'Candidate';
    const draft = `Dear Hiring Manager,\n\nI am ${fullName}, and I am excited to apply for the ${job?.title || 'role'} position at ${job?.companyName || job?.company || 'your company'}. My background aligns well with the role's requirements, especially in ${job?.skills?.slice(0, 3).join(', ') || 'software development'} and problem solving. I would welcome the opportunity to contribute my skills and continue learning in a collaborative environment.\n\nThank you for considering my application.\n\nSincerely,\n${fullName}`;
    setCoverLetter(profile?.coverLetter || draft);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!job) return;
    if (!selectedResumeId) {
      setToast('Please select a resume before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await applyForJob(job.id, {
        resumeId: selectedResumeId,
        coverLetter: coverLetter.trim(),
        job
      });
      if (result?.alreadyApplied) {
        setExistingApplication(result.data);
        return;
      }
      const applicationId = result?.applicationId || result?.data?.id || 'new-application';
      setToast('Application submitted successfully!');
      window.setTimeout(() => navigate(`/applications/${applicationId}`), 700);
    } catch (error) {
      console.error('Application submission failed', error);
      setToast('Unable to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (existingApplication) return <main className="min-h-[70vh] bg-slate-50 px-4 py-10"><div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><h1 className="text-2xl font-black text-slate-900">Application Submitted</h1><p className="mt-3 text-sm leading-6 text-slate-600">You have already applied for this job.</p><button type="button" onClick={() => navigate(`/applications/${existingApplication.id}`, { state: { application: existingApplication } })} className="brand-button mt-5 px-5 py-3 text-sm">View Application</button></div></main>;

  if (loading || !job) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Preparing application…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Application</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">Apply for {job.title}</h1>
              <p className="mt-2 text-sm text-slate-600">at {job.companyName || job.company}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <ResumeSelector
              resumes={resumes}
              selectedResumeId={selectedResumeId}
              onSelect={setSelectedResumeId}
              onUploadNew={() => navigate('/resume')}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="cover-letter" className="block text-sm font-semibold text-slate-700">Cover letter</label>
                <button type="button" onClick={handleGenerateDraft} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                  Generate draft from profile
                </button>
              </div>
              <textarea
                id="cover-letter"
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                rows={7}
                placeholder="Write a short note about why you are a good fit for this role..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <Sparkles className="h-4 w-4" />
                Match confirmation
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{matchScore}% match</p>
              <p className="text-sm text-slate-600">This role appears to be a strong fit for your profile.</p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => navigate(`/jobs/${id}`)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="brand-button min-w-[210px] px-5 py-3 text-sm disabled:opacity-70">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
