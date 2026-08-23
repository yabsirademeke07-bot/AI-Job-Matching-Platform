import { Search, X } from 'lucide-react';

export default function JobSearchBar({ query, onQueryChange, onSearch, onClear }) {
  return (
    <div className="jobs-search-panel rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSearch();
              }
            }}
            placeholder="Search by job title, skill, or company"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            aria-label="Search for jobs"
          />
        </div>

        <div className="flex items-center gap-2 md:w-auto">
          {query && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={onSearch}
            className="brand-button px-5 py-3 text-sm sm:px-6"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
