import { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CvUploadScreen = ({ user, onUploadSuccess, onSkip }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationNotice, setValidationNotice] = useState('');

  const handleFileSelect = (selectedFile) => {
    setValidationNotice('');
    if (!selectedFile) return;

    const extension = `.${selectedFile.name.split('.').pop().toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setValidationNotice('Unsupported file type. Please upload a PDF or Word (.docx) file.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setValidationNotice(`File size must be under ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
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
    if (!file) {
      setValidationNotice(
        'Please upload your CV first, or skip this step for now using the button below.'
      );
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setValidationNotice('Please sign in again before uploading your CV.');
      return;
    }

    setIsUploading(true);
    setValidationNotice('');

    try {
      const formData = new FormData();
      formData.append('cv', file);
      if (user?.id) formData.append('userId', String(user.id));

      const response = await fetch('/api/seeker/upload-cv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'CV upload failed.');

      if (onUploadSuccess) {
        onUploadSuccess(data.cv || data);
      } else {
        navigate('/profile', { replace: true });
      }
    } catch (uploadError) {
      setValidationNotice(uploadError.message || 'Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipAction = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...currentUser, onboardingCvUploaded: true, cvSkipped: true };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    if (onSkip) {
      onSkip();
    } else {
      navigate('/profile', { replace: true });
    }
  };

  return (
    <main className="min-h-[85vh] bg-slate-50/70 px-4 py-8 sm:px-6 lg:py-16">
      <section className="mx-auto w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-900/5 sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-[11px] font-bold text-blue-600 shadow-sm">
          <Sparkles className="h-4 w-4" />
          <span>Step 3 of 4 • Smart AI CV Matching</span>
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Upload Your Resume
        </h1>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Your CV is your first impression
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          Our AI analyzes your CV in seconds and helps match you with the most relevant job opportunities. If you do not have a CV ready yet, you can skip this step for now and continue to the next stage.
        </p>

        {validationNotice && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-left text-xs font-bold text-amber-800 shadow-sm animate-[fadeIn_0.2s_ease-out] sm:text-sm" role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <span className="leading-relaxed">{validationNotice}</span>
          </div>
        )}

        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-8 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-12 ${
              isDragging
                ? 'scale-[0.99] border-blue-600 bg-blue-50 ring-4 ring-blue-500/15'
                : 'border-slate-300 bg-slate-50/70 hover:border-blue-500 hover:bg-blue-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(event) => handleFileSelect(event.target.files?.[0])}
            />

            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-600 text-white shadow-xl shadow-blue-500/25 transition-transform duration-300 hover:scale-110 sm:h-20 sm:w-20">
              <UploadCloud className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>

            <h3 className="text-sm font-black text-slate-900 sm:text-base">
              Drag and drop your CV here or click to browse
            </h3>
            <p className="mt-2 text-xs font-semibold text-slate-400 sm:text-sm">
              Supported formats: <span className="font-black text-slate-500">PDF, DOCX, DOC</span> (up to 10MB)
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
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => setFile(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"
                aria-label="Remove selected CV"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500 sm:text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Your information is protected with strong privacy and security measures (Encrypted &amp; Secure)</span>
        </div>

        <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
          <button
            type="button"
            disabled={isUploading}
            onClick={handleContinue}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Uploading and analyzing your CV...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

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
        </div>
      </section>
    </main>
  );
};

export default CvUploadScreen;
