import axiosClient from './axiosClient.js';

const notificationApi = {
  getNotifications: async (params) => {
    const response = await axiosClient.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await axiosClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await axiosClient.patch('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await axiosClient.delete(`/notifications/${id}`);
    return response.data;
  },

  clearAll: async () => {
    const response = await axiosClient.delete('/notifications/clear-all');
    return response.data;
  },
};

export default notificationApi;
