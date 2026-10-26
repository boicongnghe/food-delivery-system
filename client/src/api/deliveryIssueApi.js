import axiosClient from './axiosClient.js'

const deliveryIssueApi = {
  // ----- Shipper (UC34) - for the shipper screens -----
  // data: { type, description, images: [cloudinary url from folder 'delivery-issues'] }
  createDeliveryIssue: async (orderId, data) => {
    const response = await axiosClient.post(`/orders/${orderId}/delivery-issues`, data)
    return response.data
  },

  // ----- Admin (UC45) -----
  // params: { page, limit, keyword, status, type }
  getDeliveryIssues: async (params) => {
    const response = await axiosClient.get('/admin/delivery-issues', { params })
    return response.data
  },

  getDeliveryIssue: async (id) => {
    const response = await axiosClient.get(`/admin/delivery-issues/${id}`)
    return response.data
  },

  // data: { decision: 'resolved' | 'dismissed', note, penalty: { target, action, fineAmount } | null }
  resolveDeliveryIssue: async (id, data) => {
    const response = await axiosClient.patch(`/admin/delivery-issues/${id}/resolution`, data)
    return response.data
  },
}

export default deliveryIssueApi
