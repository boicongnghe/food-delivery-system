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
  // A penalty needs a hearing that has ended
  resolveDeliveryIssue: async (id, data) => {
    const response = await axiosClient.patch(`/admin/delivery-issues/${id}/resolution`, data)
    return response.data
  },

  // data: { orderAction: 'release' | 'cancel', note } - right away, apart from the decision
  applyOrderAction: async (id, data) => {
    const response = await axiosClient.patch(`/admin/delivery-issues/${id}/order-action`, data)
    return response.data
  },

  // data: { deadlineHours } (1-24)
  openHearing: async (id, data) => {
    const response = await axiosClient.patch(`/admin/delivery-issues/${id}/hearing`, data)
    return response.data
  },

  closeHearing: async (id) => {
    const response = await axiosClient.patch(`/admin/delivery-issues/${id}/hearing/close`)
    return response.data
  },

  getAdminHearingMessages: async (id) => {
    const response = await axiosClient.get(`/admin/delivery-issues/${id}/messages`)
    return response.data
  },

  sendAdminHearingMessage: async (id, message) => {
    const response = await axiosClient.post(`/admin/delivery-issues/${id}/messages`, { message })
    return response.data
  },

  // ----- Parties of the order: shipper, customer, restaurant owner (hearing) -----
  // params: { page, limit }
  getMyHearings: async (params) => {
    const response = await axiosClient.get('/delivery-issues/me/hearings', { params })
    return response.data
  },

  getHearing: async (id) => {
    const response = await axiosClient.get(`/delivery-issues/${id}`)
    return response.data
  },

  getHearingMessages: async (id) => {
    const response = await axiosClient.get(`/delivery-issues/${id}/messages`)
    return response.data
  },

  sendHearingMessage: async (id, message) => {
    const response = await axiosClient.post(`/delivery-issues/${id}/messages`, { message })
    return response.data
  },
}

export default deliveryIssueApi
