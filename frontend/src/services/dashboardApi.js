import api from './api';

const getApplications = async (userId) => {
  const { data } = await api.get('/seeker/applications');
  const applications = Array.isArray(data?.applications) ? data.applications : [];
  return applications
    .filter((application) => !userId || String(application.applicant_id ?? application.job_seeker_id ?? userId) === String(userId))
    .map((item) => ({
      ...item,
      role: item.role || item.jobTitle || item.title,
      company: item.company || item.company_name,
      appliedDate: item.appliedAt || item.applied_at,
      status: String(item.status || '').toLowerCase() === 'under-review' ? 'Under Review' : item.status,
    }));
};

export async function fetchDashboardSummary() {
  const { data } = await api.get('/seeker/profile/full');
  const profile = data?.profile || {};
  return {
    skills: Array.isArray(data?.skills) ? data.skills : [],
    profile: {
      ...profile,
      name: profile.full_name || profile.fullName || '',
      skills: Array.isArray(data?.skills) ? data.skills : [],
      preferredSector: profile.preferred_sector || profile.preferredSector || profile.job_category || profile.jobCategory || '',
      profileCompletion: Number(profile.completionPercentage ?? profile.profile_completion ?? 0),
      avatarUrl: profile.avatar_url || profile.avatarUrl || '',
    },
  };
}

export async function fetchJobMatches() {
  const { data } = await api.get('/seeker/matched-jobs', { params: { all: 'true' } });
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

export async function fetchRecentApplications(userId) {
  return getApplications(userId);
}

export async function fetchMatchedJobs() {
  return fetchJobMatches();
}

export async function fetchUpcomingInterviews(userId) {
  const applications = await getApplications(userId);
  return applications
    .filter((application) => application.interview_id && String(application.interview_status || '').toLowerCase() === 'scheduled')
    .map((application) => ({
      ...application,
      id: application.interview_id,
      jobTitle: application.jobTitle || application.title,
      date: application.interview_scheduled_at,
      status: 'Scheduled',
      meetingUrl: application.interview_url,
    }));
}

export async function fetchRecommendedJobs() {
  return fetchJobMatches();
}

export const getDashboardSummary = fetchDashboardSummary;
export const getJobMatches = fetchJobMatches;
export const getRecentApplications = fetchRecentApplications;
export const getUpcomingInterviews = fetchUpcomingInterviews;
export const getRecommendedJobs = fetchRecommendedJobs;
export const getMatchedJobs = fetchMatchedJobs;
