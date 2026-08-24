import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, CheckCircle2, ClipboardList, Edit3, Plus, Target, UserCheck, Users } from 'lucide-react';
import api from '../services/api';

const initialOverview = {
  activeJobsCount: 0,
  applicantsCount: 0,
  shortlistedCount: 0,
  interviewsCount: 0,
  hiredCount: 0,
};

const metrics = [
  ['Active Jobs', 'activeJobsCount', BriefcaseBusiness, 'text-blue-600', 'bg-blue-50'],
  ['Total Applicants', 'applicantsCount', Users, 'text-emerald-600', 'bg-emerald-50'],
  ['Shortlisted', 'shortlistedCount', Target, 'text-amber-600', 'bg-amber-50'],
  ['Interviews Scheduled', 'interviewsCount', CalendarDays, 'text-violet-600', 'bg-violet-50'],
  ['Hired', 'hiredCount', UserCheck, 'text-cyan-600', 'bg-cyan-50'],
];

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(initialOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/employer/dashboard/overview')
      .then(({ data }) => {
        if (active) setOverview({ ...initialOverview, ...data });
      })
      .catch(() => { if (active) setError('Unable to load dashboard metrics. Please try again.'); })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border border-blue-100 bg-blue-50/70 p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">Employer dashboard</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="mt-2 text-sm text-slate-600">Monitor your recruitment pipeline and move faster on great candidates.</p>
        </div>
        <button type="button" onClick={() => navigate('/employer/post-job')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Post Job
        </button>
      </div>
      {error && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, key, Icon, color, background]) => (
          <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-500">{label}</p><span className={`rounded-xl p-2 ${background}`}><Icon className={`h-5 w-5 ${color}`} /></span></div>
            <p className="mt-5 text-4xl font-black text-slate-900">{loading ? '—' : overview[key]}</p>
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Live pipeline metric</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/employer/post-job')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Job</button>
          <button type="button" onClick={() => navigate('/employer-dashboard?view=jobs')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4" /> Edit Jobs</button>
          <button type="button" onClick={() => navigate('/employer-dashboard?view=applications')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ClipboardList className="h-4 w-4" /> View Resumes</button>
        </div>
      </div>
    </section>
  );
}
