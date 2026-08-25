import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BackToDashboard() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/dashboard')}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Dashboard
    </button>
  );
}
