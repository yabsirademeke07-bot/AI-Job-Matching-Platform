import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardSummary, fetchJobMatches, fetchRecentApplications, fetchRecommendedJobs, fetchUpcomingInterviews } from '../services/dashboardApi';
import type { ApplicationStats, DashboardSummary, JobApplication, JobMatch, RecommendedJob, UpcomingInterview, UserProfile } from '../types/dashboard';
import ProfileWelcomeBanner from '../components/dashboard/ProfileWelcomeBanner';
import ApplicationStatsGrid from '../components/dashboard/ApplicationStatsGrid';
import AiJobMatchesList from '../components/dashboard/AiJobMatchesList';
import RecentApplicationsTable from '../components/dashboard/RecentApplicationsTable';
import UpcomingInterviewCard from '../components/dashboard/UpcomingInterviewCard';
import RecommendedJobsGrid from '../components/dashboard/RecommendedJobsGrid';

type Resource<T> = { data: T | null; isLoading: boolean; error: string | null };

function useResource<T>(loader: () => Promise<T>, initialData?: T): Resource<T> & { retry: () => void } {
  const [resource, setResource] = useState<Resource<T>>({ data: initialData ?? null, isLoading: !initialData, error: null });
  const load = useCallback(() => {
    setResource((current) => ({ ...current, isLoading: true, error: null }));
    loader().then((data) => setResource({ data, isLoading: false, error: null })).catch((error: unknown) => setResource({ data: null, isLoading: false, error: error instanceof Error ? error.message : 'Unable to load this section.' }));
  }, [loader]);
  useEffect(() => { load(); }, [load]);
  return { ...resource, retry: load };
}

const emptyProfile: UserProfile = { id: '', name: 'Job Seeker', email: '', headline: '', profileCompletion: 0, cvReviewScore: 0 };
const emptyStats: ApplicationStats = { total: 0, pending: 0, shortlisted: 0, interviewScheduled: 0, hired: 0 };

export default function JobSeekerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const summaryLoader = useCallback(() => fetchDashboardSummary(), []);
  const matchesLoader = useCallback(() => fetchJobMatches(), []);
  const applicationsLoader = useCallback(() => fetchRecentApplications(), []);
  const interviewsLoader = useCallback(() => fetchUpcomingInterviews(), []);
  const recommendedLoader = useCallback(() => fetchRecommendedJobs(), []);
  const summary = useResource<DashboardSummary>(summaryLoader);
  const matches = useResource<JobMatch[]>(matchesLoader);
  const applications = useResource<JobApplication[]>(applicationsLoader);
  const interviews = useResource<UpcomingInterview[]>(interviewsLoader);
  const recommended = useResource<RecommendedJob[]>(recommendedLoader);
  const profile = summary.data?.profile ?? { ...emptyProfile, name: user?.name || user?.full_name || 'Job Seeker', email: user?.email || '' };
  const stats = summary.data?.stats ?? emptyStats;

  const goTo = (path: string) => navigate(path);
  const hasErrors = Boolean(summary.error || matches.error || applications.error || interviews.error || recommended.error);

  return <div className="information-page min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-8">
    <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-[var(--brand-deep)]">Job Matching AI</p><h1 className="text-2xl font-black text-slate-900">Your career dashboard</h1></div>{hasErrors && <button type="button" onClick={() => { summary.retry(); matches.retry(); applications.retry(); interviews.retry(); recommended.retry(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm hover:border-[var(--brand-primary)]"><RefreshCw className="h-4 w-4" /> Refresh</button>}</div>
    {summary.error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle className="h-4 w-4" /> {summary.error}</div>}
    {summary.isLoading ? <div className="h-48 animate-pulse rounded-3xl bg-slate-200" /> : <ProfileWelcomeBanner profile={profile} onEditProfile={() => goTo('/profile')} />}
    {summary.isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div> : <ApplicationStatsGrid stats={stats} />}
    <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]"><AiJobMatchesList jobs={matches.data ?? []} isLoading={matches.isLoading} error={matches.error} onRetry={matches.retry} onViewDetails={(id) => goTo(`/jobs/${id}`)} /><UpcomingInterviewCard interview={interviews.data?.[0] ?? null} isLoading={interviews.isLoading} error={interviews.error} onRetry={interviews.retry} onViewDetails={(id) => goTo(`/interviews/${id}`)} /></div>
    <div className="grid gap-8 lg:grid-cols-2"><RecentApplicationsTable applications={applications.data ?? []} isLoading={applications.isLoading} error={applications.error} onRetry={applications.retry} onViewDetails={(id) => goTo(`/applications/${id}`)} /><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">Application tip</p><h2 className="mt-2 text-lg font-black text-slate-900">Stand out to employers</h2><p className="mt-2 text-sm leading-6 text-slate-500">Keep your skills and preferred role current so our AI can surface opportunities that fit your goals.</p><button type="button" onClick={() => goTo('/profile')} className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)]">Update profile</button></div></div>
    <RecommendedJobsGrid jobs={recommended.data ?? []} isLoading={recommended.isLoading} error={recommended.error} onRetry={recommended.retry} onViewDetails={(id) => goTo(`/jobs/${id}`)} />
  </div></div>;
}
