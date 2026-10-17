import api, { data, cleanParams } from './api.js';

export const listNotifications = (params) => data(api.get('/notifications', { params: cleanParams(params) }));
export const getUnreadCount = () => data(api.get('/notifications/unread-count'));
export const markNotificationRead = (id) => data(api.patch(`/notifications/${id}/read`));
export const markAllNotificationsRead = () => data(api.patch('/notifications/read-all'));