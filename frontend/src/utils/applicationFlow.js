const PENDING_KEY = 'pendingApplication';
const APPLICATIONS_KEY = 'mockApplications';

export function getPendingApplication() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setPendingApplication(jobId, job = null, details = {}) {
  const pending = { jobId: String(jobId), action: 'apply', sourcePage: details.sourcePage || `/job-details/${jobId}`, returnPath: details.returnPath || `/job-details/${jobId}`, currentStep: details.currentStep || 'START', createdAt: new Date().toISOString() };
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  if (job) localStorage.setItem('pendingApplicationJob', JSON.stringify(job));
  return pending;
}

export function clearPendingApplication() {
  localStorage.removeItem(PENDING_KEY);
  localStorage.removeItem('pendingApplicationJob');
}

export function getApplicationJobId() {
  return getPendingApplication()?.jobId || '';
}

export function hasCompletedProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem('userProfile') || 'null');
    return Boolean(profile && (profile.completionPercentage >= 80 || (profile.name && profile.email && profile.phone && profile.location)));
  } catch {
    return false;
  }
}

export function hasCompletedCv() {
  try {
    if (JSON.parse(localStorage.getItem('seekerResume') || 'null')?.fileName) return true;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return Boolean(user?.cvFileName);
  } catch {
    return false;
  }
}

export function getNextApplicationStep(jobId) {
  if (!hasCompletedCv()) return `/resume?jobId=${encodeURIComponent(jobId)}`;
  if (!hasCompletedProfile()) return `/profile/me?jobId=${encodeURIComponent(jobId)}`;
  return getApplicationSubmitPath(jobId);
}

export function getApplicationSubmitPath(jobId) {
  return `/apply/${encodeURIComponent(jobId)}`;
}

export function getMockApplications() {
  try {
    const applications = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]');
    return Array.isArray(applications) ? applications : [];
  } catch {
    return [];
  }
}

export function getApplicationForJob(jobId) {
  return getMockApplications().find((application) => String(application.jobId) === String(jobId)) || null;
}

export function beginApplication(jobId, job, navigate, details = {}) {
  const existing = getApplicationForJob(jobId);
  if (existing) {
    navigate(`/applications/${encodeURIComponent(String(existing.id))}`, { state: { application: existing } });
    return 'ALREADY_APPLIED';
  }
  setPendingApplication(jobId, job, details);
  if (!details.isAuthenticated) {
    navigate('/login', { state: { intent: 'apply', jobId: String(jobId), from: details.returnPath || `/job-details/${jobId}` } });
    return 'AUTH_REQUIRED';
  }
  const role = String(details.role || '').toLowerCase();
  if (['employer', 'company', 'recruiter'].includes(role)) {
    navigate('/dashboard', { state: { message: 'Employer accounts cannot submit job seeker applications.' } });
    return 'ROLE_BLOCKED';
  }
  if (!['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(role)) {
    navigate(`/select-role?jobId=${encodeURIComponent(jobId)}`);
    return 'ROLE_REQUIRED';
  }
  navigate(getNextApplicationStep(jobId));
  return hasCompletedCv() && hasCompletedProfile() ? 'READY_TO_APPLY' : 'REQUIREMENT_REQUIRED';
}

export function saveMockApplication(application) {
  const applications = [application, ...getMockApplications().filter((item) => String(item.jobId) !== String(application.jobId))];
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
  clearPendingApplication();
  return applications;
}
