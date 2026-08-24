const PENDING_KEY = 'pendingApplication';
const APPLICATIONS_KEY = 'mockApplications';

export function getPendingApplication() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setPendingApplication(jobId, job = null) {
  const pending = { jobId: String(jobId), createdAt: new Date().toISOString() };
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
    return Boolean(profile && profile.completionPercentage >= 80);
  } catch {
    return false;
  }
}

export function hasCompletedCv() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return Boolean(user?.cvFileName);
  } catch {
    return false;
  }
}

export function getNextApplicationStep(jobId) {
  if (!hasCompletedCv()) return `/upload-cv?jobId=${encodeURIComponent(jobId)}`;
  if (!hasCompletedProfile()) return `/profile?jobId=${encodeURIComponent(jobId)}`;
  return `/job-details/${encodeURIComponent(jobId)}`;
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

export function saveMockApplication(application) {
  const applications = [application, ...getMockApplications().filter((item) => String(item.jobId) !== String(application.jobId))];
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
  clearPendingApplication();
  return applications;
}
