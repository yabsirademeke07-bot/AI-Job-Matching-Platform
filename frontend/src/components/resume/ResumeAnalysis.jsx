import { CheckCircle2, Sparkles } from 'lucide-react';

function parseAnalysis(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export default function ResumeAnalysis({ resume, analysis: suppliedAnalysis, onUpload, onAnalyze, analyzing = false }) {
  const analysis = parseAnalysis(suppliedAnalysis || resume?.analysis || resume?.ai_extracted_data);
  const detectedSkills = Array.isArray(analysis.detectedSkills)
    ? analysis.detectedSkills
    : Array.isArray(analysis.skills) ? analysis.skills : [];
  const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];

  if (!resume) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-900">AI CV Analysis</h2><p className="mt-2 text-sm leading-6 text-slate-500">Upload a resume to see AI-powered CV insights.</p><button type="button" onClick={onUpload} className="mt-4 min-h-11 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)]">Upload Resume</button></section>;
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="resume-analysis-heading"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">Resume insights</p><h2 id="resume-analysis-heading" className="mt-1 text-xl font-black text-slate-900">CV Analysis</h2><p className="mt-2 text-sm text-slate-500">Analysis is shown only when it has been generated from your uploaded CV.</p></div>{onAnalyze && <button type="button" onClick={onAnalyze} disabled={analyzing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)] disabled:cursor-wait disabled:opacity-70"><Sparkles className="h-4 w-4" />{analyzing ? 'Analyzing Resume...' : 'Analyze Resume'}</button>}</div>{detectedSkills.length > 0 && <div className="mt-6"><h3 className="text-sm font-black text-slate-900">Extracted Skills</h3><div className="mt-3 flex flex-wrap gap-2">{detectedSkills.map((skill) => { const name = typeof skill === 'string' ? skill : skill?.name || skill?.skill_name; return name ? <span key={name} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">{name}</span> : null; })}</div></div>}{strengths.length > 0 && <div className="mt-5"><h3 className="text-sm font-black text-slate-900">Evidence-based strengths</h3><ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600">{strengths.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}</ul></div>}{detectedSkills.length === 0 && strengths.length === 0 && <p className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-slate-400" /> No saved analysis is available for this resume yet.</p>}</section>;
}
