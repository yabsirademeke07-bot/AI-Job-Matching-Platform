import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UploadCv() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // 1. Check File Format (PDF, DOC, DOCX)
    const fileName = selectedFile.name.toLowerCase();
    const isPdfOrDoc = fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.doc');

    if (!isPdfOrDoc) {
      setFile(selectedFile);
      setStatus('error');
      setErrorMessage('Unsupported file format. Please upload a PDF or DOCX file.');
      return;
    }

    setFile(selectedFile);
    setStatus('uploading');
    setProgress(0);
    setErrorMessage('');

    // 2. Upload Progress Simulation
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);

        // 3. Simple CV Content/Validation Logic
        // Real logic: Here you will send the file to your Backend API (Python/Node) to parse actual PDF text
        setTimeout(() => {
          // Fake check: Checks if file size is reasonable and name pattern matches a CV
          const isReasonableSize = selectedFile.size > 5000; // Must be greater than ~5KB
          const hasCvKeywords = fileName.includes('cv') || fileName.includes('resume') || fileName.includes('profile') || fileName.includes('job') || fileName.includes('bio');

          // If it passes basic check (or when backend API integrates)
          if (isReasonableSize && (hasCvKeywords || fileName.endsWith('.pdf'))) {
            // Note: In real production, backend returns true/false after reading PDF text
            setStatus('success');
          } else {
            setStatus('error');
            setErrorMessage('This document does not contain valid CV/Resume structure. Please upload a proper CV.');
          }
        }, 800);
      }
    }, 250);
  };

  const handleContinue = () => {
    navigate('/match-results', { state: { fileName: file?.name } });
  };

  return (
    <div className="min-h-[85vh] bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-indigo-950/40 border border-indigo-800/50 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">Upload your CV</h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 max-w-md mx-auto">
            Add your resume to get personalized job matches and application assistance
          </p>
          <p className="text-xs text-indigo-400 mt-2 font-medium">Attempts left: 3</p>
        </div>

        {/* Upload Box */}
        <div className="mb-4">
          {!file ? (
            <label 
              htmlFor="file-input" 
              className="border-2 border-dashed border-indigo-700/60 hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-indigo-900/20 hover:bg-indigo-900/30"
            >
              <span className="text-4xl mb-2">📄</span>
              <span className="text-sm font-semibold text-indigo-100">Click to upload your CV (PDF or DOCX)</span>
              <span className="text-xs text-indigo-300/60 mt-1">All documents supported (PDF/DOCX)</span>
            </label>
          ) : (
            <div className="border border-indigo-700/60 bg-indigo-900/40 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-rose-600 text-white p-2.5 rounded-xl text-xs font-bold shadow-md">
                  DOC
                </div>
                <span className="text-sm font-bold text-indigo-100 truncate max-w-[200px] sm:max-w-[260px]">
                  {file.name}
                </span>
              </div>
              
              <label htmlFor="file-input" className="text-xs font-semibold text-indigo-300 hover:text-white cursor-pointer transition">
                Upload new CV
              </label>
            </div>
          )}

          {/* accept parameter broadened so Telegram files aren't hidden */}
          <input
            id="file-input"
            type="file"
            accept="*/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Uploading Progress Bar */}
        {status === 'uploading' && (
          <div className="mb-6 bg-indigo-900/30 p-4 rounded-2xl border border-indigo-800/50">
            <div className="flex justify-between items-center text-xs font-semibold text-indigo-200 mb-2">
              <span>Analyzing document...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-indigo-950 h-2.5 rounded-full overflow-hidden border border-indigo-800">
              <div 
                className="bg-indigo-500 h-full transition-all duration-200 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {status === 'success' && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3 text-emerald-300">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-sm">
              ✓
            </div>
            <span className="text-sm font-bold">CV Analysis Complete!</span>
          </div>
        )}

        {/* Error Alert */}
        {status === 'error' && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center gap-3 text-rose-300">
            <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-sm">
              ✕
            </div>
            <div className="text-xs">
              <p className="font-bold">Invalid File / Analysis Failed</p>
              <p className="text-rose-200/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleContinue}
            disabled={status !== 'success'}
            className={`px-8 py-3 rounded-xl text-xs sm:text-sm font-bold text-white transition shadow-lg ${
              status === 'success'
                ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow-indigo-600/30 active:scale-95'
                : 'bg-indigo-950/60 border border-indigo-800/40 cursor-not-allowed opacity-50'
            }`}
          >
            Continue
          </button>
        </div>

      </div>
    </div>
  );
}