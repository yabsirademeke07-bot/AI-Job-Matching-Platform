import { X } from 'lucide-react';
import JobFilters from './JobFilters';

export default function FilterDrawerModal({ open, onClose, filters, onChange, onClear }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm md:hidden">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Filter jobs</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <JobFilters filters={filters} onChange={onChange} onClear={onClear} mobile />
      </div>
    </div>
  );
}
