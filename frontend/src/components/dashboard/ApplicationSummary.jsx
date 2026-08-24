import { BriefcaseBusiness, CalendarCheck, CheckCircle2, Clock3, Send } from 'lucide-react';
import StatCard from './StatCard';

export default function ApplicationSummary({ stats, onNavigate }) {
  const items = [['total', 'Total Applications', Send, 'all'], ['pending', 'Pending', Clock3, 'pending'], ['shortlisted', 'Shortlisted', CheckCircle2, 'shortlisted'], ['interviewScheduled', 'Interview', CalendarCheck, 'interview'], ['hired', 'Hired / Accepted', BriefcaseBusiness, 'hired']];
  return <section aria-labelledby="application-summary-heading"><h2 id="application-summary-heading" className="mb-4 text-lg font-black text-slate-900">Application summary</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">{items.map(([key, label, Icon, filter]) => <StatCard key={key} label={label} value={stats?.[key] || 0} icon={Icon} onClick={() => onNavigate(`/applications${filter === 'all' ? '' : `?status=${filter}`}`)} />)}</div></section>;
}
