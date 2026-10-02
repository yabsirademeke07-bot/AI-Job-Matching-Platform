import api from './api';

export const getConversations = () => api.get('/employer/messages/conversations');
export const getConversation = (conversationId) => api.get(`/employer/messages/conversations/${conversationId}`);
export const sendMessage = (conversationId, message) => api.post(`/employer/messages/conversations/${conversationId}/messages`, { message });
export const markConversationAsRead = (conversationId) => api.patch(`/employer/messages/conversations/${conversationId}/read`);
export const getUnreadMessageCount = () => api.get('/employer/messages/conversations/unread-count');
export const deleteConversation = (conversationId) => api.delete(`/employer/messages/conversations/${conversationId}`);
