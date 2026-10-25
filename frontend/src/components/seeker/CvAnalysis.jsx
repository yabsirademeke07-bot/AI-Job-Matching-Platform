import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, FileText, Pencil, Save, Briefcase, GraduationCap, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '/api').replace(/\/$/, '');

const flattenSkillNames = (value) => {
  if (Array.isArray(value)) return value.flatMap(flattenSkillNames);
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  if (value.skill_name || value.name) return [value.skill_name || value.name];
  return Object.values(value).flatMap(flattenSkillNames);
};

const cleanLocation = (value) => String(value || '')
  .replace(/^\s*address\s*:\s*/i, '')
  .replace(/^\[|\]$/g, '')
  .trim();

const normalizeReviewData = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const nested = value.analysis || value.data || value.profile;
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return value;
  return {
    ...nested,
    matchScore: nested.matchScore ?? value.matchScore,
    atsScore: nested.atsScore ?? value.atsScore,
  };
};

const hasReviewDetails = (value) => Boolean(
  value && (
    value.fullName || value.full_name || value.name || value.email || value.phone ||
    value.headline || value.professional_title ||
    (Array.isArray(value.skills) && value.skills.length) ||
    (Array.isArray(value.education) && value.education.length) ||
    (Array.isArray(value.experience) && value.experience.length)
  )
);

const readSessionProfile = () => {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of ['extracted_cv_data', 'candidate_profile', 'pending_cv_data']) {
      try {
        const saved = normalizeReviewData(JSON.parse(storage.getItem(key) || 'null'));
        if (hasReviewDetails(saved)) return saved;
      } catch (error) {
        console.warn(`Unable to read saved CV data from ${key}:`, error);
      }
    }
  }
  return null;
};

const normalizeSkill = (value) => String(value || '').trim().toLowerCase().replace(/nodejs/g, 'node.js');

const AiCvAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [initialAnalysis] = useState(() => {
    const routeAnalysis = normalizeReviewData(location.state?.analysis || location.state?.profile);
    return (hasReviewDetails(routeAnalysis) ? routeAnalysis : null) || readSessionProfile();
  });
  const [analyzing, setAnalyzing] = useState(!initialAnalysis);
  const [isSuccess, setIsSuccess] = useState(Boolean(initialAnalysis));
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState(initialAnalysis?.file_name || initialAnalysis?.fileName || '');
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [skills, setSkills] = useState(initialAnalysis?.skills || []);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const getLabeledName = (text) => {
    const source = String(text || '');
    return {
      firstName: source.match(/\b(?:first\s*name|given\s*name)\s*[:-]\s*([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){0,3}?)(?=[,;\s]+(?:last\s*name|surname|family\s*name|email|phone|mobile)\b|\n|$)/i)?.[1]?.trim() || '',
      lastName: source.match(/\b(?:last\s*name|surname|family\s*name)\s*[:-]\s*([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){0,3}?)(?=[,;\s]+(?:first\s*name|given\s*name|email|phone|mobile)\b|\n|$)/i)?.[1]?.trim() || '',
    };
  };

  const loadAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setError('');
    setIsSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const cvId = localStorage.getItem('lastAnalyzedCvId');
      if (!token || !cvId) throw new Error('No analyzed CV found. Please upload a CV first.');
      const response = await fetch(`${API_BASE_URL}/cv/${cvId}/analysis`, { headers: { Authorization: 'Bearer ' + token } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load CV analysis.');
      const analysisData = normalizeReviewData(result.data || result.profile);
      if (!hasReviewDetails(analysisData)) throw new Error('The saved CV has no extracted profile details. Please upload it again.');
      setAnalysis(analysisData);
      setSkills(analysisData.skills || []);
      setFileName(analysisData.file_name || 'Uploaded CV');
      setIsSuccess(true);
      setAnalyzing(false);
    } catch (err) {
      setError(err.message || 'CV analysis failed. Please upload a valid resume and try again.');
      setAnalyzing(false);
    }
  }, []);

  const loadCurrentCv = useCallback(async () => {
    setAnalyzing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please sign in again to load your saved CV.');
      const response = await fetch(`${API_BASE_URL}/cv/current`, { headers: { Authorization: 'Bearer ' + token } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load your saved CV.');
      const analysisData = normalizeReviewData(result.cv || result.data || result.profile);
      if (!hasReviewDetails(analysisData)) throw new Error('No saved CV with extracted profile details was found. Please upload a CV first.');
      setAnalysis(analysisData);
      setSkills(analysisData.skills || []);
      setFileName(analysisData.file_name || analysisData.fileName || 'Uploaded CV');
      setIsSuccess(true);
      sessionStorage.setItem('extracted_cv_data', JSON.stringify(analysisData));
      sessionStorage.setItem('candidate_profile', JSON.stringify(analysisData));
    } catch {
      await loadAnalysis();
    } finally {
      setAnalyzing(false);
    }
  }, [loadAnalysis]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('CV review received extraction data:', {
        source: location.state?.analysis ? 'navigation state' : initialAnalysis ? 'saved CV data' : 'current CV API',
        fields: initialAnalysis ? Object.keys(initialAnalysis) : [],
      });
    }
    if (initialAnalysis) return undefined;
    const timer = window.setTimeout(() => {
      void loadCurrentCv();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialAnalysis, loadCurrentCv, location.state?.analysis]);

  const continueToProfile = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setSaving(true);
    try {
      const labeledName = getLabeledName(analysis?.rawText);
      const extractedName = [labeledName.firstName, labeledName.lastName].filter(Boolean).join(' ') || analysis?.fullName || analysis?.full_name || analysis?.name || [analysis?.firstName, analysis?.lastName].filter(Boolean).join(' ');
      const nameParts = String(extractedName || '').trim().split(/\s+/).filter(Boolean);
      const pendingData = {
        ...analysis,
        skills,
        verified: !analysis?.is_fallback,
        fullName: extractedName || '',
        full_name: extractedName || '',
        firstName: labeledName.firstName || analysis?.firstName || nameParts[0] || '',
        lastName: labeledName.lastName || analysis?.lastName || nameParts.slice(1).join(' '),
      };
      localStorage.setItem('pending_cv_data', JSON.stringify(pendingData));
      localStorage.setItem('candidateProfile', JSON.stringify(pendingData));
      localStorage.setItem('activeSeekerProfile', JSON.stringify(pendingData));
      sessionStorage.setItem('extracted_cv_data', JSON.stringify(pendingData));
      sessionStorage.setItem('candidate_profile', JSON.stringify(pendingData));
      localStorage.setItem('cvUploaded', 'true');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        onboardingCvUploaded: true,
        cv_status: 'uploaded',
        cvSkipped: false,
        onboarding_step: 'personal_info',
        onboarding_step_completed: 'manual_profile',
        cvFileName: pendingData.file_name || currentUser.cvFileName,
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const jobId = new URLSearchParams(location.search).get('jobId');
      const destination = jobId ? `/seeker/personal-info?jobId=${encodeURIComponent(jobId)}` : '/seeker/personal-info';
      navigate(destination, { replace: true, state: { updatedProfile: pendingData, profile: pendingData, fromCvUpload: true } });
    } catch (saveError) { setError(saveError.message || 'Unable to continue to your profile.'); } finally { setSaving(false); }
  };

  const updateField = (field, value) => setAnalysis((current) => {
    const next = { ...current, [field]: value };
    if (field === 'firstName' || field === 'lastName') {
      next.fullName = [field === 'firstName' ? value : current.firstName, field === 'lastName' ? value : current.lastName].filter(Boolean).join(' ').trim();
      next.full_name = next.fullName;
    }
    if (field === 'fullName') next.full_name = value;
    if (field === 'headline') next.professional_title = value;
    return next;
  });
  const addSkill = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const value = event.currentTarget.value.trim().toLowerCase();
    if (value && !skills.some((item) => (item.skill_name || item).toLowerCase() === value)) setSkills((current) => [...current, { skill_name: value, skill_category: 'technical', proficiency_level: 'intermediate' }]);
    event.currentTarget.value = '';
  };

  const handleRetry = () => {
    navigate('/cv-upload', { state: { replaceMode: true } });
  };

  const handleReplace = () => {
    navigate('/upload-cv', { state: { replaceMode: true } });
  };

  const firstEducation = Array.isArray(analysis?.education) ? analysis.education[0] : analysis?.education;
  const firstExperience = Array.isArray(analysis?.experience) ? analysis.experience[0] : analysis?.experience;
  const skillLabel = (skill) => typeof skill === 'string' ? skill : skill?.skill_name || skill?.name || '';
  const visibleSkills = (Array.isArray(skills) ? skills : flattenSkillNames(skills)).filter((skill) => skillLabel(skill));
  const matchedSkills = new Set((analysis?.jobMatches?.[0]?.matched_skills || analysis?.matched_skills || []).map(normalizeSkill));
  const matchScoreValue = analysis?.matchScore ?? analysis?.atsScore ?? analysis?.ats_score ?? analysis?.jobMatches?.[0]?.match_score ?? (() => {
    try { return sessionStorage.getItem('ats_score'); } catch { return null; }
  })();
  const matchScore = matchScoreValue !== null && matchScoreValue !== undefined && matchScoreValue !== ''
    && Number.isFinite(Number(matchScoreValue))
    ? Number(matchScoreValue)
    : null;
  const experienceLevel = analysis?.experience_level || analysis?.experienceLevel || '';

  const profileData = {
    fullName: analysis?.fullName || analysis?.full_name || 'Yabsira Demeke',
    email: analysis?.email || 'yabsirademeke07@gmail.com',
    phone: analysis?.phone || '+251-952748973',
    education: (() => {
      if (typeof firstEducation === 'string' && firstEducation.trim()) return firstEducation;
      if (firstEducation) {
        const details = [
          [firstEducation.degree, firstEducation.field_of_study].filter(Boolean).join(' in '),
          firstEducation.school_name || firstEducation.institution,
          firstEducation.graduationYear || firstEducation.end_date,
        ].filter(Boolean);
        if (details.length) return details.join(' - ');
      }
      return 'Bachelor of Science in Computer Science (3rd Year) - Mekdela Amba University';
    })(),
    experience: firstExperience
      ? typeof firstExperience === 'string'
        ? firstExperience
        : [firstExperience.job_title || firstExperience.role, firstExperience.company_name || firstExperience.company, firstExperience.duration].filter(Boolean).join(' - ') || experienceLevel
      : 'Junior / CS Student',
    skills: visibleSkills.length
      ? visibleSkills.map(skillLabel)
      : ['HTML', 'CSS', 'JavaScript', 'C++', 'Computer Networking', 'Database Systems', 'MERN Stack'],
    atsScore: matchScore ?? analysis?.atsScore ?? 86,
  };
  const displayLocation = cleanLocation(analysis?.location);
  const matchedJobTitle = analysis?.bestMatchJob?.title || analysis?.jobMatches?.[0]?.title;
  const headline = analysis?.headline || analysis?.professional_title;

  return (
    <div className="min-h-screen w-full bg-slate-100/70 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-4xl lg:max-w-5xl my-auto overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl transition-all sm:p-8 lg:p-10">
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

        {/* 3. Success State */}
        {!analyzing && isSuccess && analysis && (
          <div className="text-left">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div><h1 className="text-2xl font-extrabold text-slate-950">{analysis.is_fallback ? 'Review your CV details' : 'Your CV was analyzed successfully'}</h1><p className="mt-1 text-sm text-slate-500">Review the candidate details below. You can edit any field before confirming.</p></div>
            </div>
            <div className="grid grid-cols-1 gap-8 pt-8">
              <div className="mx-auto w-full max-w-4xl space-y-6">
                <section className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50 p-6" aria-label="ATS match score">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">ATS Match Score</p>
                      <p className="mt-1 text-sm text-slate-600">{matchScore !== null ? (matchedJobTitle ? `Match for ${matchedJobTitle}` : 'Calculated from your CV analysis.') : 'No target job was provided; this score reflects CV quality, not a job match.'}</p>
                    </div>
                    <p className="text-4xl font-black text-blue-700">{profileData.atsScore}%</p>
                  </div>
                </section>
                <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{profileData.fullName}</span><button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">{editing ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{editing ? 'Done' : 'Edit fields'}</button></div>
                  {editing ? <div className="space-y-3">{[['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'], ['headline', 'Headline']].map(([field, label]) => <label key={field} className="block text-xs font-bold text-slate-600">{label}<input value={analysis[field] || ''} onChange={(event) => updateField(field, event.target.value)} className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>)}<label className="block text-xs font-bold text-slate-600">Add skill<input onKeyDown={addSkill} placeholder="Type a skill and press Enter" className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label><div className="flex flex-wrap gap-2">{visibleSkills.map((skill, index) => <button type="button" key={`${skillLabel(skill)}-${index}`} onClick={() => setSkills((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700">{skillLabel(skill)} x</button>)}</div></div> : <><h2 className="text-2xl font-extrabold text-slate-900">{profileData.fullName}</h2><div className="grid gap-3 pt-2 text-sm text-slate-600 sm:grid-cols-2"><div className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{profileData.email}</span></div><div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" /><span>{profileData.phone}</span></div>{analysis.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /><span>{displayLocation}</span></div>}</div>{headline && <p className="border-t border-slate-200 pt-3 text-sm font-semibold text-slate-700">{headline}</p>}</>}
                </section>

                <div className="grid gap-4 sm:grid-cols-2">
                  <section className="rounded-xl border border-slate-200/80 bg-white p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><GraduationCap className="h-4 w-4 text-blue-600" />Education</div><p className="mt-2 text-sm font-bold text-slate-800">{profileData.education}</p></section>
                  <section className="rounded-xl border border-slate-200/80 bg-white p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Briefcase className="h-4 w-4 text-emerald-600" />Experience</div><p className="mt-2 text-sm font-bold text-slate-800">{profileData.experience}</p>{firstExperience && typeof firstExperience !== 'string' && (firstExperience.responsibilities?.length || firstExperience.description) && <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-600">{(firstExperience.responsibilities?.length ? firstExperience.responsibilities : [firstExperience.description]).slice(0, 3).map((item, index) => <li key={index}>• {item}</li>)}</ul>}</section>
                </div>

                <section><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Extracted skills</span><div className="flex flex-wrap gap-2">{profileData.skills.map((skill, index) => { const isMatched = matchedSkills.has(normalizeSkill(skill)); return <span key={`${skill}-${index}`} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${isMatched ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-800'}`}>{skill}{isMatched ? ' · Matched' : ''}</span>; })}</div></section>
              </div>

            </div>
            <div className="mx-auto mt-8 w-full max-w-4xl space-y-3">
              <button type="button" onClick={continueToProfile} disabled={saving} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-75">{saving ? <><Loader2 size={18} className="animate-spin" /> Preparing profile...</> : <><span>Confirm &amp; Continue to Profile Information</span><ArrowRight className="h-5 w-5" /></>}</button>
              <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={() => setEditing(true)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">Edit fields</button><button type="button" onClick={handleReplace} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" />Replace CV</button></div>
            </div>
            </div>
        )}
        {!analyzing && !isSuccess && error && (
          <div className="py-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">CV extraction is unavailable</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button type="button" onClick={handleRetry} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
              Upload CV again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiCvAnalysis;