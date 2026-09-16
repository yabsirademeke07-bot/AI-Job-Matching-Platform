export const PIPELINE_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'review', label: 'Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

const LABELS = {
  pending: 'Pending',
  review: 'Review',
  shortlisted: 'Shortlisted',
  interviewed: 'Interviewed',
  hired: 'Hired',
  rejected: 'Rejected',
};

const STATUS_CLASSES = {
  pending: 'border border-amber-200 bg-amber-50 text-amber-700',
  review: 'border border-blue-200 bg-blue-50 text-blue-700',
  shortlisted: 'border border-violet-200 bg-violet-50 text-violet-700',
  interviewed: 'border border-indigo-200 bg-indigo-50 text-indigo-700',
  hired: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border border-rose-200 bg-rose-50 text-rose-700',
};

const STATUS_ALIASES = {
  all: 'all',
  pending: 'pending',
  applied: 'pending',
  submitted: 'pending',
  new: 'pending',
  review: 'review',
  'under-review': 'review',
  'under review': 'review',
  'in-review': 'review',
  'in review': 'review',
  shortlisted: 'shortlisted',
  interview: 'interviewed',
  interviewed: 'interviewed',
  'interview-scheduled': 'interviewed',
  'interview scheduled': 'interviewed',
  hired: 'hired',
  accepted: 'hired',
  'offer': 'hired',
  rejected: 'rejected',
  declined: 'rejected',
  withdrawn: 'rejected',
};

export function normalizePipelineStatus(value) {
  if (value === null || value === undefined) return 'pending';

  const raw = String(value).trim().toLowerCase();
  if (!raw) return 'pending';

  const normalized = raw.replace(/\s+/g, '-');
  return STATUS_ALIASES[raw] || STATUS_ALIASES[normalized] || normalized;
}

export function getPipelineStatusLabel(value) {
  const normalized = normalizePipelineStatus(value);

  if (normalized === 'all') return 'All statuses';

  return LABELS[normalized] || normalized
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getPipelineStatusClasses(value) {
  const normalized = normalizePipelineStatus(value);
  return STATUS_CLASSES[normalized] || 'border border-slate-200 bg-slate-100 text-slate-600';
}
