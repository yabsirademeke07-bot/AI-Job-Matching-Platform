import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UploadCloud, Sparkles, Loader2, ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { continueApplicationFlow, hasCompletedCv } from '../utils/applicationFlow';

const CvUploader = ({
  cvFile: externalCvFile,
  setCvFile: externalSetCvFile,
  isParsing: externalIsParsing,
  setIsParsing: externalSetIsParsing,
  parsedAnalysis: externalParsedAnalysis,
  setParsedAnalysis: externalSetParsedAnalysis,
  formData: externalFormData,
  handleChange: externalHandleChange,
  onNext
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const applicationJobId = searchParams.get('jobId');
  const API_URL = import.meta.env.VITE_BACKEND_URL || '/api';

  // Internal state handlers (Props ካልተላኩ በራሱ እንዲሰራ)
  const [internalCvFile, setInternalCvFile] = useState(null);
  const [internalIsParsing, setInternalIsParsing] = useState(false);
  const [internalParsedAnalysis, setInternalParsedAnalysis] = useState(null);
  const [internalFormData, setInternalFormData] = useState({
    preferredJob: '',
    salaryExpectation: ''
  });
  const [continueError, setContinueError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  // Controlled vs Uncontrolled Props logic
  const cvFile = externalCvFile !== undefined ? externalCvFile : internalCvFile;
  const setCvFile = externalSetCvFile || setInternalCvFile;
  const isParsing = externalIsParsing !== undefined ? externalIsParsing : internalIsParsing;
  const setIsParsing = externalSetIsParsing || setInternalIsParsing;
  const parsedAnalysis = externalParsedAnalysis !== undefined ? externalParsedAnalysis : internalParsedAnalysis;
  const setParsedAnalysis = externalSetParsedAnalysis || setInternalParsedAnalysis;
  const formData = externalFormData || internalFormData;

  const handleChange = externalHandleChange || ((e) => {
    setInternalFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  });

  const processFile = (file) => {
    if (file) {
      const validFile = /\.(pdf|doc|docx)$/i.test(file.name);
      if (!validFile) {
        setContinueError('Please upload a PDF, DOC, or DOCX file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setContinueError('Your CV must be smaller than 10MB.');
        return;
      }
      setContinueError('');
      setCvFile(file);
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, cvFileName: file.name }));
      } catch (error) {
        console.error('Unable to save CV filename:', error);
      }
      simulateCvParsing(file);
    }
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    processFile(e.dataTransfer.files[0]);
  };

  const simulateCvParsing = (file) => {
    setIsParsing(true);
    setParsedAnalysis(null);

    // AI Parsing Simulation
    setTimeout(() => {
      setIsParsing(false);
      setParsedAnalysis({
        skillsMatched: ['React.js', 'JavaScript', 'Tailwind CSS', 'Node.js', 'Git'],
        experienceYears: '3+ Years',
        education: 'B.Sc. in Computer Science',
        matchScore: 88,
        recommendedRole: 'Frontend Developer / Full Stack Developer'
      });
    }, 2000);
  };

  // ወደ Profile ገጽ የሚመራው አዝራር (Continue Button) ሲነካ
  const handleContinue = async (e) => {
    e.preventDefault();
    if (applicationJobId && !cvFile && !hasCompletedCv()) {
      setContinueError('Please upload your CV before continuing.');
      return;
    }
    if (applicationJobId) {
      continueApplicationFlow(navigate, { jobId: applicationJobId });
      return;
    }
    if (cvFile && localStorage.getItem('token')) {
      const token = localStorage.getItem('token');
      if (token !== 'frontend-demo-token') {
        const uploadData = new FormData();
        uploadData.append('cv', cvFile);
        try {
          const response = await fetch(`${API_URL.replace(/\/$/, '')}/cvs`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: uploadData,
          });
          if (!response.ok) throw new Error('Unable to save CV');
        } catch (error) {
          setContinueError('Unable to save your CV. Please try again.');
          return;
        }
      }
      localStorage.setItem('seekerResume', JSON.stringify({
        id: `resume-${Date.now()}`,
        fileName: cvFile.name,
        fileType: cvFile.name.split('.').pop()?.toUpperCase() || 'FILE',
        fileSize: cvFile.size,
        fileUrl: URL.createObjectURL(cvFile),
        uploadedAt: new Date().toISOString(),
      }));
    }
    if (onNext) {
      onNext();
    } else {
      navigate('/profile-completion', { state: { onboarding: true }, replace: true });
    }
  };

  // Read user role from localStorage for role-aware messaging
  const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const parsedUser = savedUser ? JSON.parse(savedUser) : null;
  const welcomeName = parsedUser?.full_name || parsedUser?.name || parsedUser?.email || null;
  const isSeeker = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes((parsedUser?.role || '').toString().toLowerCase());

  return (
    <div className="information-page w-full max-w-5xl mx-auto my-6 px-4 sm:px-6 lg:my-10">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <div className="px-6 py-8 text-slate-900 sm:px-10" style={{ backgroundColor: '#f8fafc' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"><Sparkles className="h-4 w-4 text-[var(--brand-deep)]" /> AI-powered CV analysis</div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Upload your CV</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{isSeeker ? `Welcome, ${welcomeName || 'Job Seeker'}. Upload your CV to unlock personalized job matches.` : 'Upload your resume to analyze skills and discover better opportunities.'}</p>
            </div>
            <FileText className="hidden h-9 w-9 text-[var(--brand-deep)] sm:block" />
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-10">
          <div onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }} onDragLeave={() => setIsDragActive(false)} onDrop={handleDrop} className={`relative min-h-[300px] rounded-3xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${isDragActive ? 'bg-[var(--brand-soft-hover)] ring-4 ring-[#d0e5f5]' : 'bg-[var(--brand-soft)]'}`} style={{ borderColor: 'var(--brand-primary)' }}>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="absolute inset-0 z-10 h-full w-full cursor-pointer !opacity-0" aria-label="Upload CV" />
            <div className="pointer-events-none mx-auto flex max-w-lg flex-col items-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-lg ring-4 ring-white/70" style={{ backgroundColor: 'var(--brand-primary)' }}>
                <UploadCloud className="h-10 w-10" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">{cvFile ? cvFile.name : 'Drag & drop your CV here'}</h3>
              <p className="mt-2 text-sm text-slate-500">{cvFile ? `${(cvFile.size / 1024 / 1024).toFixed(2)} MB · Ready for analysis` : 'or click to browse from your device'}</p>
              <span className="mt-5 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#56a2d8]/25" style={{ backgroundColor: 'var(--brand-primary)' }}>{cvFile ? 'Choose a different file' : 'Choose CV file'}</span>
              <p className="mt-4 text-xs font-medium text-slate-400">PDF, DOC or DOCX · Maximum 10MB</p>
            </div>
          </div>

          {/* Parsing Loader */}
          {continueError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{continueError}</p>}
          {isParsing && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <h4 className="text-sm font-bold text-blue-900">AI is analyzing your CV...</h4>
                <p className="text-xs text-blue-700">Extracting skills, experience, and match score.</p>
              </div>
            </div>
          )}

          {/* Analysis Output */}
          {parsedAnalysis && !isParsing && (
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-900">AI CV Analysis Results</span>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-extrabold">
                  {parsedAnalysis.matchScore}% Match
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="bg-white p-3 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block text-xs">Extracted Skills:</span>
                  <span className="font-semibold text-slate-800">{parsedAnalysis.skillsMatched.join(', ')}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block text-xs">Recommended Role:</span>
                  <span className="font-semibold text-slate-800">{parsedAnalysis.recommendedRole}</span>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button to Profile Page */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Your CV stays private and secure</div>
            <button
              type="button"
              onClick={handleContinue}
              className="brand-button flex items-center gap-2 px-6 py-3 text-xs shadow-lg shadow-[#56a2d8]/25 active:scale-[0.98]"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CvUploader;