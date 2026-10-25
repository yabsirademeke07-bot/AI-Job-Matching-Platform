import api from './api';

export const getAdminDashboardStats = async () => {
  const { data } = await api.get('/admin/dashboard-stats');
  return data.stats;
};

export const getAdminOverview = async () => {
  const { data } = await api.get('/admin/overview');
  return data;
};

export const updateUserStatus = (userId, status) => api.patch(`/admin/users/${userId}/status`, { status });
export const updateCompanyVerification = (companyId, status) => api.patch(`/admin/company/${companyId}/verify`, { status });
export const updateJobStatus = (jobId, status, reason = '') => api.patch(`/admin/jobs/${jobId}/moderate`, { status, reason });
export const moderateJob = (jobId, action, reason = '') => api.post(`/admin/jobs/${jobId}/moderate`, { action, reason });
export const updateReportStatus = (reportId, status) => api.patch(`/admin/reports/${reportId}/status`, { status });
export const getAdminReports = (params = {}) => api.get('/admin/reports', { params });
export const submitUniversalReport = (formData) => api.post('/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAdminReportMessages = (reportId) => api.get(`/admin/reports/${reportId}/messages`);
export const replyToAdminReport = (reportId, payload) => api.post(`/admin/reports/${reportId}/reply`, payload);
export const resolveAdminReport = (reportId, payload) => api.post(`/admin/reports/${reportId}/resolve`, payload);
export const getAdminActivityLogs = (params = {}) => api.get('/admin/activity-logs', { params });
export const getJobPreview = (jobId) => api.get(`/admin/jobs/${jobId}/preview`);
export const deleteJob = (jobId) => api.delete(`/admin/jobs/${jobId}`);
