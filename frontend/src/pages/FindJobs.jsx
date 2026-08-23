import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import JobSearchBar from '../components/jobs/JobSearchBar';
import JobFilters from '../components/jobs/JobFilters';
import FilterDrawerModal from '../components/jobs/FilterDrawerModal';
import JobCard from '../components/jobs/JobCard';
import { searchJobs, getSavedJobsState, saveJob, unsaveJob } from '../services/jobService';
import { useAuth } from '../context/AuthContext';

const defaultFilters = {
  type: '',
  experience: '',
  location: '',
  salary: '',
  minSalary: ''
};

export default function FindJobs() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setSavedJobs(getSavedJobsState());
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeBadges = useMemo(() => {
    const badges = [];
    if (query.trim()) badges.push(`Search: ${query.trim()}`);
    if (filters.type) badges.push(`Type: ${filters.type}`);
    if (filters.experience) badges.push(`Experience: ${filters.experience}`);
    if (filters.location) badges.push(`Location: ${filters.location}`);
    if (filters.salary) badges.push(`Salary: ${filters.salary}`);
    return badges;
  }, [query, filters]);

  const runSearch = async (nextQuery = query, nextFilters = filters) => {
    setIsLoading(true);
    try {
      const result = await searchJobs({
        q: nextQuery,
        type: nextFilters.type,
        experience: nextFilters.experience,
        location: nextFilters.location,
        salary: nextFilters.salary || nextFilters.minSalary
      });
      setJobs(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to load jobs', error);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      runSearch(query, filters);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query, filters]);

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setQuery('');
  };

  const handleSaveToggle = async (jobId) => {
    const isSaved = savedJobs.includes(String(jobId));
    try {
      if (isSaved) {
        await unsaveJob(jobId);
        setSavedJobs((current) => current.filter((item) => String(item) !== String(jobId)));
        setToast('Job removed from saved list.');
      } else {
        await saveJob(jobId);
        const next = Array.from(new Set([...savedJobs, String(jobId)]));
        setSavedJobs(next);
        setToast('Job saved successfully!');
      }
    } catch (error) {
      console.error('Save job failed', error);
      setToast('Unable to update saved jobs.');
    }
  };

  return (
    <div className="jobs-page min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Find jobs</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Explore opportunities</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered matches
          </div>
        </div>

        <JobSearchBar
          query={query}
          onQueryChange={setQuery}
          onSearch={() => runSearch(query, filters)}
          onClear={() => {
            setQuery('');
            setFilters(defaultFilters);
          }}
        />

        <div className="hidden xl:block">
          <JobFilters filters={filters} onChange={handleFilterChange} onClear={handleClearFilters} />
        </div>

        <div className="xl:hidden">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            Filters
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-700">Showing {jobs.length} jobs found</p>
          {activeBadges.map((badge) => (
            <span key={badge} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              {badge}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="mt-3 h-6 w-2/3 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-1/2 rounded bg-slate-200" />
                <div className="mt-5 h-4 w-full rounded bg-slate-200" />
                <div className="mt-2 h-4 w-5/6 rounded bg-slate-200" />
                <div className="mt-6 flex gap-3">
                  <div className="h-9 flex-1 rounded bg-slate-200" />
                  <div className="h-9 w-24 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="jobs-empty-state rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-xl font-bold text-slate-900">No jobs found matching your criteria.</h3>
            <p className="mt-2 text-sm text-slate-600">Try adjusting your filters or broadening your search.</p>
            <button type="button" onClick={handleClearFilters} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                saved={savedJobs.includes(String(job.id))}
                onToggleSave={handleSaveToggle}
              />
            ))}
          </div>
        )}

        {toast && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {toast}
          </div>
        )}
      </div>

      <FilterDrawerModal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onChange={handleFilterChange}
        onClear={() => {
          handleClearFilters();
          setIsFilterOpen(false);
        }}
      />
    </div>
  );
}
