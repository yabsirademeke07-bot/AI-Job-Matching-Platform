import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';

const mockAnalysis = {
  score: 82,
  profileCompleteness: 90,
  detectedSkills: ['HTML', 'CSS', 'JavaScript', 'React'],
  strengths: ['Clear technical skills', 'Relevant project experience', 'Good education information'],
  areasToImprove: ['Add more measurable achievements', 'Improve project descriptions', 'Add missing technical skills'],
  recommendations: ['Highlight your strongest projects', 'Add GitHub or portfolio links', 'Use clearer achievement-focused descriptions'],
};

export default function ResumeAnalysis({ resume, onUpload }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = () => {
    setAnalyzing(true);
    window.setTimeout(() => {
      setAnalysis(mockAnalysis);
      setAnalyzing(false);
    }, 500);
  };

  if (!resume) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-900">AI CV Analysis</h2><p className="mt-2 text-sm leading-6 text-slate-500">Upload a resume to see AI-powered CV insights.</p><button type="button" onClick={onUpload} className="mt-4 min-h-11 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)]">Upload Resume</button></section>;
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="resume-analysis-heading"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">Resume insights</p><h2 id="resume-analysis-heading" className="mt-1 text-xl font-black text-slate-900">AI CV Analysis</h2><p className="mt-2 text-sm text-slate-500">Review general resume strengths and practical ways to improve your job readiness.</p></div><button type="button" onClick={handleAnalyze} disabled={analyzing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)] disabled:cursor-wait disabled:opacity-70">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{analyzing ? 'Analyzing Resume...' : 'Analyze Resume'}</button></div>{analysis && <div className="mt-6 space-y-6"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[var(--brand-soft)] p-4"><p className="text-xs font-bold text-slate-500">Resume Score</p><p className="mt-1 text-3xl font-black text-[var(--brand-deep)]">{analysis.score}%</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Profile Completeness</p><p className="mt-1 text-3xl font-black text-slate-900">{analysis.profileCompleteness}%</p></div></div><div><h3 className="text-sm font-black text-slate-900">Detected Skills</h3><div className="mt-3 flex flex-wrap gap-2">{analysis.detectedSkills.map((skill) => <span key={skill} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">{skill}</span>)}</div></div><div className="grid gap-5 md:grid-cols-3"><InsightList title="Resume Strengths" items={analysis.strengths} tone="emerald" /><InsightList title="Areas to Improve" items={analysis.areasToImprove} tone="amber" /><InsightList title="AI Recommendations" items={analysis.recommendations} tone="blue" /></div></div>}{!analysis && !analyzing && <p className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Your resume is ready for a general AI review.</p>}</section>;
}

function InsightList({ title, items, tone }) {
  const styles = { emerald: 'border-emerald-100 bg-emerald-50/50', amber: 'border-amber-100 bg-amber-50/50', blue: 'border-blue-100 bg-blue-50/50' };
  return <div className={`rounded-xl border p-4 ${styles[tone]}`}><h3 className="text-sm font-black text-slate-900">{title}</h3><ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600">{items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}</ul></div>;
}
