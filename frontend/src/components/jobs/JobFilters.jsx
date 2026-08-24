import { SlidersHorizontal, X } from 'lucide-react';

const jobTypes = ['Full Time', 'Part Time', 'Contract', 'Remote', 'Internship'];
const experienceLevels = ['Entry Level', 'Mid Level', 'Senior', 'Lead'];
const locations = ['Addis Ababa', 'Hawassa', 'Remote', 'Bahir Dar', 'Dire Dawa', 'Adama'];
const salaryRanges = [
  { label: 'Any salary', value: '' },
  { label: 'ETB 30k+', value: '30000' },
  { label: 'ETB 50k+', value: '50000' },
  { label: 'ETB 80k+', value: '80000' },
  { label: 'ETB 100k+', value: '100000' }
];

export default function JobFilters({ filters, onChange, onClear, mobile = false }) {
  const selectClassName = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none';

  return (
    <div className={`jobs-filter-panel rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${mobile ? 'w-full' : ''}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Filters</h3>
        </div>
        <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <X className="h-3.5 w-3.5" />
          Clear Filters
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Job Type</label>
          <select value={filters.type || ''} onChange={(event) => onChange('type', event.target.value)} className={selectClassName}>
            <option value="">Any</option>
            {jobTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Experience</label>
          <select value={filters.experience || ''} onChange={(event) => onChange('experience', event.target.value)} className={selectClassName}>
            <option value="">Any level</option>
            {experienceLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Location</label>
          <select value={filters.location || ''} onChange={(event) => onChange('location', event.target.value)} className={selectClassName}>
            <option value="">Any location</option>
            {locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Salary Min</label>
          <select value={filters.minSalary || ''} onChange={(event) => onChange('minSalary', event.target.value)} className={selectClassName}>
            <option value="">No minimum</option>
            {[30000, 50000, 80000, 100000].map((value) => (
              <option key={value} value={value}>ETB {value.toLocaleString()}+</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Salary Range</label>
          <select value={filters.salary || ''} onChange={(event) => onChange('salary', event.target.value)} className={selectClassName}>
            {salaryRanges.map((range) => (
              <option key={range.label} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
