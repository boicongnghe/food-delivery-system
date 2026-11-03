import axiosClient from './axiosClient.js'

const adminApi = {
  getPendingApprovals: async () => {
    const response = await axiosClient.get('/admin/pending-approvals')
    return response.data
  },

  getStats: async () => {
    const response = await axiosClient.get('/admin/stats')
    return response.data
  },
}

export default adminApi
