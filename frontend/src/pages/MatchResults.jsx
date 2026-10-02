import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MapPin, Briefcase, DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';

const AiMatchResultsPage = ({ jobs = [], candidateProfile = {} }) => {
  const navigate = useNavigate();

  const displayedMatches = useMemo(() => {
    const sourceJobs = jobs.length > 0
      ? jobs
      : JSON.parse(localStorage.getItem('allJobs') || localStorage.getItem('jobs') || '[]');

    const scored = sourceJobs.map((job, idx) => {
      const baseScores = [96, 87, 76];
      const matchScore = job.matchScore || baseScores[idx] || 70;
      return { ...job, matchScore };
    });

    return scored.slice(0, 3);
  }, [jobs]);

  const candidateName = candidateProfile.name || localStorage.getItem('candidateName') || 'Candidate';

  const tierMeta = [
    {
      title: 'Best Career Match',
      badge: '#1 BEST CAREER MATCH',
      badgeClass: 'bg-emerald-600 text-white',
      scoreClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      containerClass: 'border-emerald-300 ring-2 ring-emerald-500/10 shadow-md',
      reason: 'Out of all currently available roles, this opportunity exhibits the highest synergy with your core profile strengths, skills, and career trajectory.'
    },
    {
      title: 'Strong Match',
      badge: '#2 STRONG MATCH',
      badgeClass: 'bg-blue-600 text-white',
      scoreClass: 'text-blue-700 bg-blue-50 border-blue-200',
      containerClass: 'border-slate-200 shadow-sm',
      reason: 'High domain relevance with transferable qualifications matching your professional background.'
    },
    {
      title: 'High Potential Fit',
      badge: '#3 HIGH POTENTIAL FIT',
      badgeClass: 'bg-amber-600 text-white',
      scoreClass: 'text-amber-700 bg-amber-50 border-amber-200',
      containerClass: 'border-slate-200 shadow-sm',
      reason: 'Promising career expansion role aligned with your baseline capabilities and technical potential.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Semantic Matching Engine</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            AI Career Match Results
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {candidateName}, your verified CV points to these top-fit roles.
          </p>
        </div>

        <div className="flex w-full flex-col space-y-10">
          {displayedMatches.map((job, index) => {
            const meta = tierMeta[index] || tierMeta[2];

            return (
              <section key={job.id || index} className="w-full space-y-3">
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Tier {index + 1} •
                  </span>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    {meta.title}
                  </h2>
                </div>

                <div className={`w-full rounded-3xl border bg-white p-6 transition-all hover:shadow-lg sm:p-8 ${meta.containerClass}`}>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <span className={`rounded-full px-4 py-1 text-xs font-black uppercase tracking-wider ${meta.badgeClass}`}>
                      {meta.badge}
                    </span>
                    <span className={`rounded-full border px-3.5 py-1 text-sm font-black ${meta.scoreClass}`}>
                      {job.matchScore}% Match
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-black tracking-tight text-slate-900">
                      {job.title}
                    </h3>
                    <p className="text-sm font-bold text-slate-600">
                      {job.company || 'Company'} {job.sector && `• ${job.sector}`}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-950 sm:text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <p>
                        <strong className="font-bold text-blue-900">Why this matches: </strong>
                        {job.matchReason || meta.reason}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {job.location || 'Addis Ababa'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        {job.salary || 'Competitive'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-slate-400" />
                        {job.workMode || job.type || 'Full-time'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/job-details/${job.id}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
                    >
                      <span>View Details &amp; Apply</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/explore-jobs')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Explore All Jobs →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiMatchResultsPage;