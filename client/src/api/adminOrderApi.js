import axiosClient from './axiosClient.js'

// Platform orders of the admin portal (read only)
const adminOrderApi = {
  // params: { page, limit, keyword, status, paymentMethod, from, to } -> { items, pagination, counts }
  getOrders: async (params) => {
    const response = await axiosClient.get('/admin/orders', { params })
    return response.data
  },

  // Full order + related: { complaint, review, deliveryIssues }
  getOrder: async (id) => {
    const response = await axiosClient.get(`/admin/orders/${id}`)
    return response.data
  },
}

export default adminOrderApi
