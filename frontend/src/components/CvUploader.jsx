import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UploadCloud, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { getApplicationJobId, getNextApplicationStep, hasCompletedPersonalInfo, hasCompletedProfile, hasCompletedCv } from '../utils/applicationFlow';

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
  const applicationJobId = searchParams.get('jobId') || getApplicationJobId();

  // Internal state handlers (Props ካልተላኩ በራሱ እንዲሰራ)
  const [internalCvFile, setInternalCvFile] = useState(null);
  const [internalIsParsing, setInternalIsParsing] = useState(false);
  const [internalParsedAnalysis, setInternalParsedAnalysis] = useState(null);
  const [internalFormData, setInternalFormData] = useState({
    preferredJob: '',
    salaryExpectation: ''
  });
  const [continueError, setContinueError] = useState('');

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
  const handleContinue = (e) => {
    e.preventDefault();
    if (applicationJobId && !cvFile && !hasCompletedCv()) {
      setContinueError('Please upload your CV before continuing.');
      return;
    }
    if (applicationJobId) {
      if (!hasCompletedPersonalInfo()) navigate(`/personal-info?jobId=${encodeURIComponent(applicationJobId)}`);
      else navigate(hasCompletedProfile() ? getNextApplicationStep(applicationJobId) : `/profile?jobId=${encodeURIComponent(applicationJobId)}`);
      return;
    }
    if (onNext) {
      onNext();
    } else {
      navigate('/profile');
    }
  };

  // Read user role from localStorage for role-aware messaging
  const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const parsedUser = savedUser ? JSON.parse(savedUser) : null;
  const welcomeName = parsedUser?.full_name || parsedUser?.name || parsedUser?.email || null;
  const isSeeker = ['job_seeker','seeker','jobseeker','user','employee'].includes((parsedUser?.role || '').toString().toLowerCase());

  return (
    <div className="information-page w-full max-w-4xl mx-auto my-6 px-4 sm:px-6 lg:my-10">
      <div className="space-y-8 rounded-3xl border border-slate-200 bg-white px-5 py-9 shadow-lg shadow-slate-900/5 sm:px-8 sm:py-11 lg:px-10 lg:py-14">
      <div>
        <h2 className="text-3xl font-extrabold leading-tight text-slate-900 tracking-tight sm:text-4xl">{isSeeker ? 'Welcome, ' + (welcomeName ? welcomeName : 'Job Seeker') : 'Upload Your CV'}</h2>
        <p className="mt-3 text-lg leading-7 text-slate-600">
          {isSeeker ? 'Upload your CV to extract skills, generate a match score with available roles, and complete your candidate profile.' : 'Upload a resume to analyze skills & preferences.'}
        </p>
      </div>

      {/* Upload Box */}
      <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-12 sm:p-14 bg-slate-50/50 hover:bg-blue-50/20 transition-all text-center relative cursor-pointer">
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-slate-800 mb-2">
            {cvFile ? cvFile.name : "Click to upload or drag & drop"}
          </p>
          <p className="text-base text-slate-400">PDF, DOC, DOCX (Max 10MB)</p>
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
      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          className="flex items-center gap-2 rounded-xl bg-[#56a2d8] px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-[#56a2d8]/25 transition-all hover:bg-[#2b73a4] active:scale-[0.98]"
        >
          <span>Save & Continue to Profile</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      </div>
    </div>
  );
};

export default CvUploader;