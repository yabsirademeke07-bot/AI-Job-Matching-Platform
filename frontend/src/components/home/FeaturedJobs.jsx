import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Sparkles, ArrowRight, Briefcase } from 'lucide-react';
import api from '../../services/api';

export default function FeaturedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/jobs', { params: { page: 1, limit: 3 } })
      .then(({ data }) => {
        if (active) setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      })
      .catch((requestError) => {
        if (active) {
          console.error('Unable to load featured jobs:', requestError);
          setError(requestError.response?.data?.message || 'Unable to load featured jobs.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Opportunities</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Featured Opportunities
          </h2>
          <p className="text-slate-500 text-sm">Current jobs posted by employers.</p>
        </div>

        <Link 
          to="/jobs" 
          className="text-blue-600 hover:text-blue-700 font-bold text-sm inline-flex items-center gap-1.5 transition-colors group"
        >
          <span>Browse All Jobs</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? <p className="col-span-full text-center text-sm text-slate-500">Loading open jobs...</p> : null}
        {!loading && error ? <p className="col-span-full text-center text-sm text-rose-700">{error}</p> : null}
        {!loading && !error && jobs.length === 0 ? (
          <p className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            ምንም ክፍት ስራዎች አልተገኙም (No active jobs posted yet)
          </p>
        ) : null}
        {!loading && !error && jobs.map((job) => (
          <div 
            key={job.id}
            className="card-floating flex flex-col justify-between group sm:p-9"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
                  {job.job_type || 'Job'}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                {job.title}
              </h3>

              <div className="space-y-1.5 mb-5">
                <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{job.company_name || 'Company'}</span>
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{job.location || 'Location not specified'}</span>
                </p>
              </div>
            </div>

            <Link 
              to={`/jobs/${encodeURIComponent(String(job.id))}`}
              className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-xs transition shadow-sm shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>View Job</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}