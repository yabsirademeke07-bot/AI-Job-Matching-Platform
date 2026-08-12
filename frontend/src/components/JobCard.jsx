import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const JobCard = ({ job, isAuthenticated }) => {
  const [showMore, setShowMore] = useState(false);
  const SNIPPET_LENGTH = 220;

  const description = job.description || '';
  const needsTruncate = description.length > SNIPPET_LENGTH;
  const snippet = needsTruncate ? description.slice(0, SNIPPET_LENGTH).trim() + '…' : description;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{job.title}</h3>
          <p className="text-sm text-slate-600">{job.company_name}</p>
          <p className="mt-2 text-sm text-slate-500">
            {job.city}, {job.country}
          </p>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-700">
          {job.job_type}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {job.work_mode && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{job.work_mode}</span>
        )}
        {job.category && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{job.category}</span>
        )}
      </div>

      <div className="mt-4">
        {/* Description with Show More / Show Less */}
        <p className="text-sm text-slate-700 leading-relaxed">
          {showMore || !needsTruncate ? description : snippet}
        </p>

        {needsTruncate && (
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="mt-3 inline-block text-sm font-medium text-slate-900 hover:underline"
          >
            {showMore ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-900">
          {job.currency} {job.salary_min?.toLocaleString()} - {job.currency} {job.salary_max?.toLocaleString()}
        </p>

        <Link
          className="rounded-3xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          to={`/jobs/${job.id}`}
        >
          View Details
        </Link>
      </div>

      <div className="mt-4">
        {isAuthenticated ? (
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
            AI Match Score: {job.ai_match_score ?? 'N/A'}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            Log in to see AI Match Score
          </span>
        )}
      </div>
    </div>
  );
};

export default JobCard;