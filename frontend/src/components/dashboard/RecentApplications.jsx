import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import ApplicationCard from './ApplicationCard';
export default function RecentApplications({
  applications = [],
  onViewDetails,
  onViewAll,
  onExploreJobs,
  isLoading,
  error,
  onRetry,
  className = "",
  title = "Recent Applications",
  subtitle,
}) {
  return (
    <section className={`space-y-6 ${className}`} aria-labelledby="recent-applications-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="recent-applications-heading" className="text-2xl font-black italic tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 max-w-2xl text-xs italic leading-relaxed text-slate-500 sm:text-sm">{subtitle}</p>}
        </div>
        {applications.length > 0 && (
          <button type="button" onClick={onViewAll} className="inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-deep)]">
            View All <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {isLoading && <div className="space-y-3">{[1, 2, 3].map((id) => <div key={id} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>}
        {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={onRetry} className="ml-3 font-bold underline">Refresh</button></div>}
        {!isLoading && !error && applications.length === 0 && (
          <div className="rounded-xl bg-slate-50 p-8 text-center">
            <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 font-bold text-slate-800">You haven't submitted any applications yet</p>
            <p className="mt-1 text-sm text-slate-500">Explore current openings and apply for a role that fits your skills.</p>
            <button type="button" onClick={onExploreJobs} className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white">Explore Jobs</button>
          </div>
        )}
        {!isLoading && !error && applications.map((application) => (
          <ApplicationCard key={application.id} application={application} onViewDetails={onViewDetails} />
        ))}
      </div>
    </section>
  );
}
