import { ArrowRight } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand-primary)] hover:shadow-md">
      <div className="mb-4 flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-deep)]"><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-[var(--brand-deep)]" /></div>
      <p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </button>
  );
}
