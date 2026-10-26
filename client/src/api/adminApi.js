import axiosClient from './axiosClient.js'

const adminApi = {
  getPendingApprovals: async () => {
    const response = await axiosClient.get('/admin/pending-approvals')
    return response.data
  },

  updateRestaurantStatus: async (restaurantId, status) => {
    const response = await axiosClient.patch(`/admin/restaurants/${restaurantId}/status`, { status })
    return response.data
  },

  updateShipperStatus: async (shipperId, status) => {
    const response = await axiosClient.patch(`/admin/shippers/${shipperId}/status`, { status })
    return response.data
  },

  getStats: async () => {
    const response = await axiosClient.get('/admin/stats')
    return response.data
  },
}

export default adminApi
