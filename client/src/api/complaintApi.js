import axiosClient from './axiosClient.js'

const complaintApi = {
  // ----- Customer (UC18) -----
  // data: { category, description, images: [cloudinary url] }
  createComplaint: async (orderId, data) => {
    const response = await axiosClient.post(`/orders/${orderId}/complaints`, data)
    return response.data
  },

  getMyComplaints: async (params) => {
    const response = await axiosClient.get('/complaints/me', { params })
    return response.data
  },

  // Delivered / cancelled orders that can still get a complaint: { items, windowDays }
  getEligibleOrders: async () => {
    const response = await axiosClient.get('/complaints/me/eligible-orders')
    return response.data
  },

  // ----- Admin (UC42) -----
  // params: { page, limit, keyword, status, category }
  getComplaints: async (params) => {
    const response = await axiosClient.get('/admin/complaints', { params })
    return response.data
  },

  getComplaint: async (id) => {
    const response = await axiosClient.get(`/admin/complaints/${id}`)
    return response.data
  },

  // data: { decision: 'resolved' | 'rejected', note, refundAmount }
  resolveComplaint: async (id, data) => {
    const response = await axiosClient.patch(`/admin/complaints/${id}/resolution`, data)
    return response.data
  },
}

export default complaintApi
