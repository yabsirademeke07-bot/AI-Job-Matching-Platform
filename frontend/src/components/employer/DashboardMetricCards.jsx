import { Briefcase, Users, Target, Star, Calendar, UserCheck, ArrowUpRight } from 'lucide-react';

export default function DashboardMetricCards({ jobs = [], applications = [], interviews = [], onNavigate }) {
  const activeJobsCount = jobs.filter((job) => ['active', 'published'].includes(job.status)).length;
  const applicantsCount = applications.length;
  const highMatchesCount = applications.filter((application) => Number(application.aiMatchScore ?? application.matchScore ?? application.matchPercentage ?? 0) >= 80).length;
  const shortlistedCount = applications.filter((application) => application.status === 'shortlisted').length;
  const interviewsCount = interviews.length + applications.filter((application) => ['interview_scheduled', 'interview-scheduled'].includes(application.status)).length;
  const hiredCount = applications.filter((application) => application.status === 'hired').length;
  const cards = [
    ['active_jobs', 'Active Jobs', activeJobsCount, Briefcase, 'text-blue-600', 'bg-blue-50', 'hover:border-blue-300', 'jobs', 'published', 'Manage open postings'],
    ['applicants', 'Applicants', applicantsCount, Users, 'text-emerald-600', 'bg-emerald-50', 'hover:border-emerald-300', 'applications', 'all', 'Review candidate CVs'],
    ['high_matches', 'High AI Matches', highMatchesCount, Target, 'text-purple-600', 'bg-purple-50', 'hover:border-purple-300', 'matching', 'top_matches', 'Score ≥ 80% talent'],
    ['shortlisted', 'Shortlisted', shortlistedCount, Star, 'text-amber-600', 'bg-amber-50', 'hover:border-amber-300', 'shortlist', 'all', 'Ready for interview'],
    ['interviews', 'Interviews', interviewsCount, Calendar, 'text-rose-600', 'bg-rose-50', 'hover:border-rose-300', 'interviews', 'upcoming', 'Upcoming schedules'],
    ['hired', 'Hired', hiredCount, UserCheck, 'text-teal-600', 'bg-teal-50', 'hover:border-teal-300', 'hired', 'confirmed', 'Successful hires']
  ];
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{cards.map(([id, label, value, Icon, color, bgColor, borderColor, targetTab, subTab, hint]) => <button key={id} type="button" onClick={() => onNavigate?.(targetTab, subTab)} className={`group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderColor}`}><div className="flex w-full items-center justify-between"><span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900">{label}</span><span className={`rounded-xl p-2 ${bgColor} ${color} transition-transform group-hover:scale-110`}><Icon className="h-4 w-4" /></span></div><div className="mt-3.5"><div className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</div><div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-blue-600"><span>{hint}</span><ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" /></div></div></button>)}</div>;
}
