import api from './api';

export const getNotifications = (params = {}) => api.get('/employer/notifications', { params });
export const getUnreadNotificationCount = () => api.get('/employer/notifications/unread-count');
export const markNotificationAsRead = (notificationId) => api.patch(`/employer/notifications/${notificationId}/read`);
export const markAllNotificationsAsRead = () => api.patch('/employer/notifications/read-all');
export const deleteNotification = (notificationId) => api.delete(`/employer/notifications/${notificationId}`);
export const deleteReadNotifications = () => api.delete('/employer/notifications/read');
