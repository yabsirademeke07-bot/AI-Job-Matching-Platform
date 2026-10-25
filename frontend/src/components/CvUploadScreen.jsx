import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import cvImage from '../pages/image (4).png';
import { useToast } from '../hooks/useToast.js';
import { getPendingApplication } from '../utils/applicationFlow.js';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.rtf', '.odt', '.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/rtf',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/x-pdf',
  'application/x-msword',
  'application/octet-stream',
];
const MIME_EXTENSION_MAP = {
  'application/pdf': '.pdf',
  'application/x-pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/x-msword': '.doc',
  'text/plain': '.txt',
  'text/rtf': '.rtf',
  'application/rtf': '.rtf',
  'application/vnd.oasis.opendocument.text': '.odt',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_MESSAGE = 'Please upload a PDF, DOCX, DOC, TXT, RTF, ODT, PNG, JPG, or WEBP file (max 10MB).';
const INVALID_CV_MESSAGE = 'This document could not be verified as a CV. Please upload a readable CV with contact details and work history, education, or skills.';

const validateFile = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size exceeds 10MB. Please upload a smaller file.' };
  }

  const extension = file.name.match(/\.[^.]+$/)?.[0].toLowerCase() || '';
  const hasValidExtension = ALLOWED_EXTENSIONS.includes(extension);
  const mimeType = file.type?.toLowerCase() || '';
  const hasValidMime = ALLOWED_MIME_TYPES.includes(mimeType)
    && (mimeType !== 'application/octet-stream' || hasValidExtension);

  if (hasValidExtension || hasValidMime) return { isValid: true };

  return {
    isValid: false,
    error: `Unsupported file type. ${ACCEPTED_FILE_MESSAGE}`,
  };
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '/api').replace(/\/$/, '');

const CvUploadScreen = ({ user, onUploadSuccess, onSkip }) => {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const pendingApplication = getPendingApplication();
  const hasPendingApplication = Boolean(pendingApplication?.jobId);
  const targetJobId = new URLSearchParams(window.location.search).get('jobId') || pendingApplication?.jobId || '';
  const scrollCvFeedback = (type) => {
    window.setTimeout(() => {
      if (type === 'success') {
        document.querySelector('#extracted-cv-details, #parsed-preview')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      document.querySelector('#cv-dropzone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationNotice, setValidationNotice] = useState('');
  const [isInvalidFile, setIsInvalidFile] = useState(false);

  useEffect(() => {
    if (!validationNotice) return undefined;
    const timer = window.setTimeout(() => {
      setValidationNotice('');
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [validationNotice]);

  const resetUploadState = () => {
    setFile(null);
    setValidationNotice('');
    setIsInvalidFile(false);
    setUploadProgress(0);
    localStorage.removeItem('lastAnalyzedCvId');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runCVAnalysis = async (selectedFile) => {
    let token = null;
    try {
      token = localStorage.getItem('token');
    } catch (storageError) {
      console.warn('Unable to read the authentication token; continuing with local profile data:', storageError);
    }
    setIsUploading(true);
    setUploadProgress(0);
    setValidationNotice('');
    setIsInvalidFile(false);

    if (!token) {
      setValidationNotice('Please sign in again before uploading your CV.');
      setIsUploading(false);
      scrollCvFeedback('error');
      return;
    }

    try {
      const formData = new FormData();
      const extension = selectedFile.name.match(/\.[^.]+$/)?.[0].toLowerCase() || '';
      const fallbackExtension = MIME_EXTENSION_MAP[selectedFile.type?.toLowerCase() || ''];
      const uploadName = ALLOWED_EXTENSIONS.includes(extension) || !fallbackExtension
        ? selectedFile.name
        : `${selectedFile.name}${fallbackExtension}`;
      formData.append('cv', selectedFile, uploadName);
      if (user?.id) formData.append('userId', String(user.id));
      if (targetJobId) formData.append('jobId', targetJobId);

      const xhr = new XMLHttpRequest();
      const uploadResult = await new Promise((resolve, reject) => {
        xhr.open('POST', `${API_BASE_URL}/cv/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 120000;
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: xhr.responseText });
        xhr.onerror = () => reject(new Error('CV upload failed.'));
        xhr.ontimeout = () => reject(new Error('CV analysis request timed out.'));
        xhr.send(formData);
      });
      let data = {};
      try {
        data = JSON.parse(uploadResult.body || '{}');
      } catch {
        throw new Error(`CV upload failed (HTTP ${uploadResult.status || 'unknown'}). Please make sure the backend is running.`);
      }
      if (!uploadResult.ok) {
        const uploadError = new Error(data.message || 'CV upload failed.');
        uploadError.status = uploadResult.status;
        throw uploadError;
      }

      const responseProfile = data.data || data.profile;
      if (data.is_cv === false || responseProfile?.is_cv === false) {
        throw new Error(data.message || INVALID_CV_MESSAGE);
      }
      const hasExtractedDetails = responseProfile && (
        responseProfile.fullName || responseProfile.full_name || responseProfile.name ||
        responseProfile.email || responseProfile.phone || responseProfile.headline ||
        responseProfile.professional_title || responseProfile.skills?.length ||
        responseProfile.education?.length || responseProfile.experience?.length
      );
      if (!data.success || !hasExtractedDetails) {
        throw new Error(data.message || 'CV analysis response was incomplete.');
      }

      const analysisData = {
        ...responseProfile,
        atsScore: responseProfile.atsScore ?? data.atsScore,
      };
      if (analysisData.id) localStorage.setItem('lastAnalyzedCvId', String(analysisData.id));
      const matchScore = analysisData.matchScore ?? analysisData.jobMatches?.[0]?.match_score;
      try {
        sessionStorage.setItem('extracted_cv_data', JSON.stringify(analysisData));
        sessionStorage.setItem('candidate_profile', JSON.stringify(analysisData));
        if (Number.isFinite(Number(matchScore))) {
          sessionStorage.setItem('ats_score', String(matchScore));
        } else {
          sessionStorage.removeItem('ats_score');
        }
      } catch (storageError) {
        console.warn('Unable to persist CV analysis for extraction review:', storageError);
      }
      if (onUploadSuccess) onUploadSuccess(analysisData);
      const jobQuery = targetJobId ? `?jobId=${encodeURIComponent(targetJobId)}` : '';
      navigate(`/cv-extraction${jobQuery}`, { state: { analysis: analysisData }, replace: true });
      showSuccess('✓ CV uploaded and analyzed successfully! Review your details below.');
      scrollCvFeedback('success');
    } catch (uploadError) {
      setValidationNotice(uploadError?.message || 'Unable to analyze your CV. Please try uploading it again.');
      scrollCvFeedback('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setValidationNotice('');
    setIsInvalidFile(false);
    if (!selectedFile) return;

    const validation = validateFile(selectedFile);
    if (!validation.isValid) {
      setValidationNotice(validation.error);
      scrollCvFeedback('error');
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    handleFileSelect(droppedFile);
  };

  const handleContinue = async () => {
    if (!file || isInvalidFile) {
      setValidationNotice(
        isInvalidFile
          ? 'Please replace this invalid document before continuing.'
          : hasPendingApplication
            ? 'Upload your CV to continue with this application.'
            : 'Please upload your CV first, or skip this step for now using the button below.'
      );
      scrollCvFeedback('error');
      return;
    }

    await runCVAnalysis(file);
  };

  const handleSkipAction = async () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...currentUser, onboardingCvUploaded: false, cvSkipped: true, cv_status: 'skipped', onboarding_step: 'personal_info', onboarding_step_completed: 'manual_profile', profileCompleted: false };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('activeSeekerProfile', JSON.stringify({ ...(JSON.parse(localStorage.getItem('activeSeekerProfile') || '{}')), verified: false, cvStatus: 'skipped', cv_status: 'skipped' }));
    localStorage.setItem('cv_skipped', 'true');
    localStorage.setItem('onboarding_step', 'personal_info');
    localStorage.removeItem('pending_cv_data');
    localStorage.removeItem('candidateProfile');
    localStorage.removeItem('cvUploaded');

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/seeker/onboarding-step`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cv_skipped: true, cv_status: 'skipped', onboarding_step: 'personal_info', onboarding_step_completed: 'manual_profile' }),
      });
      const status = await fetch(`${API_BASE_URL}/seeker/profile-status`, { headers: { Authorization: `Bearer ${token}` } });
      const persisted = await status.json().catch(() => ({}));
      localStorage.setItem('user', JSON.stringify({ ...updatedUser, ...persisted }));
    } catch (err) {
      console.error('Failed to sync step to db:', err);
    }

    if (onSkip) {
      onSkip();
    } else {
      navigate('/seeker/personal-info', {
        replace: true,
        state: { onboarding: true, skippedCv: true, fromCvUpload: true },
      });
    }
  };

  return (
    <main className="min-h-[85vh] px-4 py-8 sm:px-6 lg:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-0 lg:grid-cols-[1.1fr_1fr]">
        <aside className="order-2 relative min-h-112 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-2xl shadow-slate-900/10 sm:min-h-136 lg:min-h-full">
          <img src={cvImage} alt="Professional CV preview" className="absolute inset-0 h-full w-full object-contain" />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-left sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Your career, clearly presented</p>
            <h2 className="mt-3 max-w-sm text-2xl font-black leading-tight text-white sm:text-3xl">Turn your experience into your next opportunity.</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-200">Upload a clear CV and let our AI highlight your strengths, skills, and best-fit roles.</p>
          </div>
        </aside>

        <section className="order-1 w-full rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-900/5 sm:p-12">
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Upload Your Resume
        </h1>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Your CV is your first impression
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          {hasPendingApplication
            ? 'Upload your CV to continue. Our AI will analyze it and show how your experience matches this role.'
            : 'Our AI analyzes your CV in seconds and helps match you with the most relevant job opportunities. If you do not have a CV ready yet, you can skip this step for now and continue to the next stage.'}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.rtf,.odt,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/rtf,application/rtf,application/vnd.oasis.opendocument.text,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => handleFileSelect(event.target.files?.[0])}
        />

        {!file ? (
          <div
            id="cv-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-8 flex min-h-55 cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-12 ${
              isDragging
                ? 'scale-[0.99] border-blue-600 bg-blue-50 ring-4 ring-blue-500/15'
                : 'border-slate-300 bg-slate-50/70 hover:border-blue-500 hover:bg-blue-50/30'
            }`}
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-600 text-white shadow-xl shadow-blue-500/25 transition-transform duration-300 hover:scale-110 sm:h-20 sm:w-20">
              <UploadCloud className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>

            <h3 className="text-sm font-black text-slate-900 sm:text-base">
              Drag and drop your CV here or click to browse
            </h3>
            <p className="mt-2 text-xs font-semibold text-slate-400 sm:text-sm">
              Supported formats: <span className="font-black text-slate-500">PDF, DOCX, JPG, PNG, WEBP</span> (up to 10MB)
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-blue-600 shadow-sm">
              <FileCheck className="h-4 w-4" />
              <span>Select a file from your computer</span>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] border-2 border-blue-200 bg-blue-50/70 p-5 text-left shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-black text-slate-900 sm:text-base">{file.name}</h4>
                  <p className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${isInvalidFile ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {isInvalidFile ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{isInvalidFile ? 'Invalid CV' : `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload`}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={resetUploadState}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"
                aria-label="Remove selected CV"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              disabled={isUploading}
              onClick={resetUploadState}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Replace CV</span>
            </button>
          </div>
        )}

        {validationNotice && (
          <p className="mt-4 text-sm font-semibold text-rose-700" role="alert">
            {validationNotice}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500 sm:text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Your information is protected with strong privacy and security measures (Encrypted &amp; Secure)</span>
        </div>

        <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
          <button
            type="button"
            disabled={isUploading || isInvalidFile}
            onClick={handleContinue}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{uploadProgress < 100 ? `Uploading your CV... ${uploadProgress}%` : 'Analyzing your CV with AI...'}</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {!hasPendingApplication && (
            <div>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleSkipAction}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-6 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 sm:text-sm"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
        </section>
      </div>

    </main>
  );
};

export default CvUploadScreen;
