import { useState } from 'react';
import { AlertTriangle, Paperclip, X } from 'lucide-react';
import { submitUniversalReport } from '../services/adminService';

const reasonOptions = {
  seeker: [
    ['scam_fraud', 'Scam or fraud'],
    ['upfront_fee', 'Unlawful upfront fee demand'],
    ['misleading_description', 'Misleading job description'],
    ['harassment', 'Harassment'],
    ['system_bug', 'System bug'],
    ['other', 'Other'],
  ],
  employer: [
    ['fake_credentials', 'Fake credentials or CV fraud'],
    ['unprofessional_conduct', 'Unprofessional conduct'],
    ['interview_no_show', 'No-show to interview'],
    ['spam_applications', 'Spam applications'],
    ['system_bug', 'System bug'],
    ['other', 'Other'],
  ],
};

export default function UniversalReportModal({ isOpen, onClose, reporterRole, targetType, targetId, targetTitle, currentUser, onSubmitted }) {
  const [selectedTargetType, setSelectedTargetType] = useState(targetType);
  const [issueCategory, setIssueCategory] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const choices = reasonOptions[reporterRole] || reasonOptions.seeker;
  const canChooseEmployer = reporterRole === 'seeker' && targetType === 'job' && targetType !== 'platform';
  const effectiveTargetId = selectedTargetType === 'employer' && targetType === 'job'
    ? targetId?.employerId || targetId?.employer_id
    : typeof targetId === 'object' ? targetId?.id : targetId;

  const submit = async (event) => {
    event.preventDefault();
    if (!currentUser?.id && !currentUser?.userId) {
      setError('Sign in to submit a report.');
      return;
    }
    if (!issueCategory) {
      setError('Choose a report reason.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Please provide at least 20 characters of detail.');
      return;
    }
    if (selectedTargetType !== 'platform' && !effectiveTargetId) {
      setError('The target could not be identified. Please refresh and try again.');
      return;
    }

    const formData = new FormData();
    formData.append('targetType', selectedTargetType);
    if (effectiveTargetId) formData.append('targetId', String(effectiveTargetId));
    formData.append('issueCategory', issueCategory);
    formData.append('description', description.trim());
    if (evidence) formData.append('evidence', evidence);

    setSubmitting(true);
    setError('');
    try {
      const { data } = await submitUniversalReport(formData);
      setSuccess(data.message || 'Your report was submitted to the moderation team.');
      onSubmitted?.(data);
      window.setTimeout(onClose, 900);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="universal-report-title">
        <div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-700"><AlertTriangle className="h-4 w-4" />Platform safety</p><h2 id="universal-report-title" className="mt-1 text-xl font-black text-slate-950">Report {targetTitle || 'a concern'}</h2><p className="mt-1 text-sm text-slate-500">Your report is confidential and reviewed by the moderation team.</p></div><button type="button" disabled={submitting} aria-label="Close report form" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button></div>

        {canChooseEmployer && <fieldset className="mt-5"><legend className="text-xs font-bold text-slate-700">What are you reporting?</legend><div className="mt-2 grid grid-cols-2 gap-2">{[['job', 'Job listing'], ['employer', 'Employer']].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${selectedTargetType === value ? 'border-blue-400 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600'}`}><input type="radio" name="report-target" value={value} checked={selectedTargetType === value} onChange={() => setSelectedTargetType(value)} />{label}</label>)}</div></fieldset>}

        <label className="mt-5 block text-xs font-bold text-slate-700">Reason<select required value={issueCategory} onChange={(event) => setIssueCategory(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Select a reason</option>{choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="mt-4 block text-xs font-bold text-slate-700">What happened?<textarea required minLength={20} maxLength={5000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Share relevant details, dates, and context. Please avoid including passwords or financial account details." className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{description.length}/5000</span></label>

        <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600 hover:border-blue-300 hover:bg-blue-50/40"><Paperclip className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{evidence ? evidence.name : 'Attach optional evidence (PDF, JPG, PNG, WebP; max 5 MB)'}</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setEvidence(event.target.files?.[0] || null)} className="sr-only" /></label>

        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        {success && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{success}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="submit" disabled={submitting || Boolean(success)} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit report'}</button></div>
      </form>
    </div>
  );
}
