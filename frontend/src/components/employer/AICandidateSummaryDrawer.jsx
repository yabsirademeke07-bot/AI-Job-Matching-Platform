import { useEffect, useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../services/api';

const breakdownLabels = [['skills', 'Skills', '40%'], ['experience', 'Experience', '30%'], ['education', 'Education', '15%'], ['location', 'Location', '15%']];

export default function AICandidateSummaryDrawer({ candidate, jobId, onClose, onShortlist, onSchedule }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!candidate || !jobId) return undefined;
    let mounted = true;
    setSummary(null);
    setLoading(true);
    setError('');
    api.get(`/candidates/${candidate.candidateId}/ai-summary`, { params: { jobId } })
      .then(({ data }) => mounted && setSummary(data))
      .catch((requestError) => mounted && setError(requestError?.response?.data?.message || 'Unable to load AI summary.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [candidate, jobId]);

  if (!candidate) return null;
  const data = summary || candidate;
  const recommendation = data.recommendation || (Number(data.matchScore || 0) >= 85 ? 'Strong Hire' : Number(data.matchScore || 0) >= 65 ? 'Potential Match' : 'Not Recommended');
  return <div className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-[1px]" role="presentation" onClick={onClose}>
    <aside aria-label="AI candidate summary" role="dialog" aria-modal="true" className="absolute left-0 top-0 h-full w-full max-w-xl animate-[slideIn_.25s_ease-out] overflow-y-auto border-r border-slate-200 bg-white p-6 text-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-600"><Sparkles className="h-4 w-4" /> AI executive summary</p><h2 className="mt-2 text-2xl font-black">{candidate.name}</h2><p className="mt-1 text-sm text-slate-500">{candidate.currentTitle || 'Candidate'} · {candidate.experienceYears || 0} years experience</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X /></button></div>
      {loading && <div className="flex items-center gap-2 py-10 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Generating AI summary...</div>}
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      {!loading && !error && <div className="space-y-6 pt-6"><div className="flex items-center justify-between rounded-2xl bg-violet-50 p-4"><div><p className="text-xs font-bold uppercase text-violet-600">AI recommendation</p><p className="mt-1 text-lg font-black text-violet-950">{recommendation}</p></div><div className="text-right"><p className="text-3xl font-black text-violet-700">{data.matchScore || 0}%</p><p className="text-xs font-bold text-violet-600">match score</p></div></div><section><h3 className="font-black">Executive Resume Summary</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{(data.executiveSummary || []).map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />{item}</li>)}</ul></section><section><h3 className="font-black">Match Score Breakdown</h3><div className="mt-3 space-y-3">{breakdownLabels.map(([key, label, weight]) => <div key={key}><div className="mb-1 flex justify-between text-xs font-bold"><span>{label} ({weight})</span><span>{data.breakdown?.[key] || 0}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${data.breakdown?.[key] || 0}%` }} /></div></div>)}</div></section><section className="grid gap-4 sm:grid-cols-2"><div><h3 className="font-black text-emerald-700">Key strengths</h3><div className="mt-2 flex flex-wrap gap-2">{(data.matchedSkills || []).map((skill) => <span key={skill} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{skill}</span>)}</div></div><div><h3 className="font-black text-amber-700">Gaps</h3><div className="mt-2 flex flex-wrap gap-2">{(data.missingSkills || []).length ? data.missingSkills.map((skill) => <span key={skill} className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><AlertTriangle className="h-3 w-3" />{skill}</span>) : <span className="text-sm text-slate-500">No major gaps identified.</span>}</div></div></section><div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5"><button type="button" onClick={() => onShortlist?.(candidate)} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Shortlist</button><button type="button" onClick={() => onSchedule?.(candidate)} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white">Schedule Interview</button></div></div>}
    </aside>
  </div>;
}
