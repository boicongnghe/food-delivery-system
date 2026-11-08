import axiosClient from './axiosClient.js'

// Platform orders of the admin portal (read + record the result of a refund transfer)
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

  // data: { note } -> updated order detail (TO-05: cancel on behalf of the customer)
  cancelOrder: async (id, data) => {
    const response = await axiosClient.patch(`/admin/orders/${id}/cancel`, data)
    return response.data
  },

  // data: { note } -> updated order detail (shipper accepted but does not pick up: back to the pool)
  releaseShipper: async (id, data) => {
    const response = await axiosClient.patch(`/admin/orders/${id}/release-shipper`, data)
    return response.data
  },

  // data: { result: 'succeeded' | 'failed', reference, note } -> updated order detail
  resolveRefund: async (id, data) => {
    const response = await axiosClient.patch(`/admin/orders/${id}/refund`, data)
    return response.data
  },
}

export default adminOrderApi
