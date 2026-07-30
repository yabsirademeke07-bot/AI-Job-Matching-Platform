import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Upload, X, FileText } from 'lucide-react';

const JobDetails = ({ job }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  // 🟢 Login አድርጎ ሲመለስ Modal በቀጥታ እንዲከፈት ማድረጊያ
  useEffect(() => {
    const user = localStorage.getItem('user');
    // ከ Login ገጽ የተመለሰ ከሆነና User ካለ በራሱ Modal ይከፍታል
    if (user && searchParams.get('autoApply') === 'true') {
      setShowApplyModal(true);
    }
  }, [searchParams]);

  // 🟢 Quick Apply Button Click Handler
  const handleQuickApply = () => {
    const user = localStorage.getItem('user');

    if (!user) {
      // 1. User ከሌለ ወደ Login ይመራዋል (autoApply=true በመጨመር)
      navigate('/login?redirect=apply');
      return;
    }

    // 2. User ካለ Modal ይከፈታል
    setShowApplyModal(true);
  };

  const handleSubmitApplication = (e) => {
    e.preventDefault();
    if (!cvFile) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowApplyModal(false);
      setIsApplied(true);
    }, 1200);
  };

  return (
    <div className="p-6">
      {!isApplied ? (
        <button
          onClick={handleQuickApply}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          Quick Apply
        </button>
      ) : (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-xs font-medium border border-emerald-200">
          <CheckCircle className="w-4 h-4" />
          Application Submitted Successfully!
        </div>
      )}

      {/* CV Upload Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowApplyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Apply for Job
            </h3>
            <p className="text-xs text-slate-500 mb-4">Upload your resume/CV to submit your application.</p>

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-slate-500 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCvFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  required
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="w-6 h-6 text-slate-500" />
                  {cvFile ? (
                    <p className="text-xs text-emerald-600 font-medium">{cvFile.name}</p>
                  ) : (
                    <p className="text-xs text-slate-600">Click or drag CV here to upload</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !cvFile}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-white text-xs font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Send Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;