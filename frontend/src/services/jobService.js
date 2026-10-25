import api from './api';
import { buildApplicationSubmissionPayload } from '../utils/applicationFlow';

export function sanitizeAndDeduplicateJobs(jobsList = []) {
  const seen = new Set();
  return (Array.isArray(jobsList) ? jobsList : []).filter((job) => {
    const title = String(job?.title || job?.jobTitle || '').trim().toLowerCase();
    const company = String(job?.company || job?.companyName || job?.company_name || '').trim().toLowerCase();
    const sector = String(job?.sector || job?.category || '').trim().toLowerCase();
    const fingerprint = `${title}_${company}_${sector}`;
    if (!title && !company && !sector) return true;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

const readJobs = (data) => sanitizeAndDeduplicateJobs(data?.jobs || data || []);

export async function getJobsPage(queryParams = {}) {
  const { data } = await api.get('/jobs', { params: queryParams });
  return { jobs: readJobs(data), pagination: data?.pagination || null };
}

async function getAllFilteredJobs(queryParams = {}) {
  const jobs = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const { data } = await api.get('/jobs', {
      params: { ...queryParams, page, limit: 50 },
    });
    const receivedCount = Array.isArray(data?.jobs)
      ? data.jobs.length
      : Array.isArray(data) ? data.length : 0;
    const pageJobs = readJobs(data);
    jobs.push(...pageJobs);
    hasMore = receivedCount > 0 && (typeof data?.pagination?.hasMore === 'boolean'
      ? data.pagination.hasMore
      : receivedCount === 50);
    page += 1;
  }
  return sanitizeAndDeduplicateJobs(jobs);
}

export async function searchJobs(queryParams = {}) {
  if (queryParams.page !== undefined || queryParams.limit !== undefined) {
    return (await getJobsPage(queryParams)).jobs;
  }
  return getAllFilteredJobs(queryParams);
}

export async function getAllJobs() {
  return getAllFilteredJobs();
}

export async function getJobById(jobId) {
  const { data } = await api.get(`/jobs/${encodeURIComponent(String(jobId))}`);
  return data?.job || data;
}

export async function saveJob(jobId) {
  const { data } = await api.post('/seeker/saved-jobs', { jobId });
  return data;
}

export async function unsaveJob(jobId) {
  const { data } = await api.delete(`/seeker/saved-jobs/${encodeURIComponent(String(jobId))}`);
  return data;
}

export async function applyForJob(jobId, payload = {}) {
  const { data } = await api.post('/applications/apply', buildApplicationSubmissionPayload(
    typeof jobId === 'object' ? jobId : { id: jobId },
    payload,
  ));
  return data;
}

export async function getApplicationById(applicationId) {
  const { data } = await api.get(`/seeker/applications/${encodeURIComponent(String(applicationId))}`);
  return data?.application || null;
}

export async function withdrawApplication(applicationId) {
  const { data } = await api.post(`/seeker/applications/${encodeURIComponent(String(applicationId))}/withdraw`);
  return data;
}

export async function getSavedJobsState() {
  const { data } = await api.get('/seeker/saved-jobs');
  return readJobs(data).map((job) => String(job.id));
}

export default {
  getAllJobs,
  getJobsPage,
  searchJobs,
  getJobById,
  saveJob,
  unsaveJob,
  applyForJob,
  getApplicationById,
  withdrawApplication,
  getSavedJobsState,
};
