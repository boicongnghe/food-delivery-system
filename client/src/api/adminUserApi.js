import axiosClient from './axiosClient.js'

// UC37 - Manage accounts
const adminUserApi = {
  // params: { page, limit, keyword, role, status: 'all' | 'active' | 'locked' }
  getUsers: async (params) => {
    const response = await axiosClient.get('/admin/users', { params })
    return response.data
  },

  // { user, restaurant, shipperProfile, orderStats, feedback, violations }
  getUser: async (id) => {
    const response = await axiosClient.get(`/admin/users/${id}`)
    return response.data
  },

  updateRole: async (id, role) => {
    const response = await axiosClient.patch(`/admin/users/${id}/role`, { role })
    return response.data
  },

  updateStatus: async (id, isActive) => {
    const response = await axiosClient.patch(`/admin/users/${id}/status`, { isActive })
    return response.data
  },
}

export default adminUserApi
