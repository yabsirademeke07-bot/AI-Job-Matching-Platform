import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, AlertCircle, RefreshCw, FileText, Plus, X, CheckCircle2 } from 'lucide-react';

const AiCvAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analyzing, setAnalyzing] = useState(!location.state?.analysis);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState(location.state?.analysis || null);
  const [skills, setSkills] = useState(location.state?.analysis?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (location.state?.analysis) {
      setIsSuccess(true);
      setFileName(location.state.analysis.file_name || 'Uploaded CV');
      return;
    }
    loadAnalysis();
  }, [location.state?.analysis]);

  const loadAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    setIsSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const cvId = localStorage.getItem('lastAnalyzedCvId');
      if (!token || !cvId) throw new Error('No analyzed CV found. Please upload a CV first.');
      const response = await fetch(`/api/cv/${cvId}/analysis`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load CV analysis.');
      setAnalysis(result.data);
      setSkills(result.data.skills || []);
      setFileName(result.data.file_name || 'Uploaded CV');
      setIsSuccess(true);
      setAnalyzing(false);
    } catch (err) {
      setError(err.message || 'CV analysis failed. Please upload a valid resume and try again.');
      setAnalyzing(false);
    }
  };

  const syncProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cv/${analysis.id}/sync-profile`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...analysis, skills }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update profile.');
      setSaved(true);
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };

  const handleContinue = () => {
    navigate('/profile');
  };

  const handleRetry = () => {
    navigate('/upload-cv', { state: { replaceMode: true } });
  };

  const handleReplace = () => {
    navigate('/upload-cv', { state: { replaceMode: true } });
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center">
        {/* 1. Analyzing State */}
        {analyzing && (
          <div className="flex flex-col items-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h2 className="text-xl font-bold text-slate-900">AI CV Analysis in Progress...</h2>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              We are extracting essential information from your CV.
            </p>
            {fileName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 text-[11px] font-medium">
                <FileText className="w-3.5 h-3.5" />
                <span>{fileName}</span>
              </div>
            )}
          </div>
        )}

        {/* 2. Error State */}
        {!analyzing && error && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">CV Analysis Failed</h2>
            <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 max-w-sm leading-relaxed">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Replace CV</span>
            </button>
          </div>
        )}

        {/* 3. Success State */}
        {!analyzing && isSuccess && analysis && (
          <div className="w-full py-2 text-left">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Your CV was analyzed successfully</h2>
            <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Candidate</p><p className="mt-1 font-bold text-slate-900">{analysis.full_name || 'Name not detected'}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</p><p className="mt-1 text-sm text-slate-700">{analysis.email || analysis.phone || 'Contact not detected'}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p><p className="mt-1 text-sm text-slate-700">{skills.length ? skills.map((skill) => skill.skill_name).join(', ') : 'No skills detected'}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Education</p><p className="mt-1 text-sm text-slate-700">{analysis.education?.[0] ? `${analysis.education[0].degree || 'Degree not specified'}${analysis.education[0].field_of_study ? ` in ${analysis.education[0].field_of_study}` : ''} - ${analysis.education[0].school_name || 'Institution not specified'}` : 'No education listed'}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experience</p><p className="mt-1 text-sm text-slate-700">{analysis.experience?.[0] ? `${analysis.experience[0].job_title || 'Role not specified'} at ${analysis.experience[0].company_name || 'Company not specified'}` : 'No work experience listed (Fresh Graduate)'}</p></div>
            </div>
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-bold text-blue-900">Real job match</p><strong className="mt-1 block text-3xl text-blue-700">{analysis.matchScore ?? analysis.keywordMatch ?? 0}%</strong><p className="mt-1 text-xs text-blue-700">Average skill match against active published jobs.</p></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={syncProfile} disabled={saving || saved} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60">{saved ? <><CheckCircle2 size={18} /> Profile updated</> : saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Submit'}</button><button onClick={handleReplace} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><RefreshCw size={18} /> Replace CV</button></div>
            <button onClick={handleContinue} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700">Continue <span aria-hidden="true">→</span></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiCvAnalysis;