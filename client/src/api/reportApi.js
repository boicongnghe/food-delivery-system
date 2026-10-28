import axiosClient from './axiosClient.js'

const REPORT_URL = '/restaurants/me/reports'

// Revenue report of the owner's restaurant. Every call takes { from, to } as Vietnam days "YYYY-MM-DD".
const reportApi = {
  getOverview: async (params) => {
    const response = await axiosClient.get(`${REPORT_URL}/overview`, { params })
    return response.data
  },

  // params: { from, to, status: 'all' | 'delivered' | 'in_progress' | 'cancelled' | 'rejected', keyword, page, limit }
  getOrders: async (params) => {
    const response = await axiosClient.get(`${REPORT_URL}/orders`, { params })
    return response.data
  },

  // Same filters as getOrders without paging (CSV export)
  exportOrders: async (params) => {
    const response = await axiosClient.get(`${REPORT_URL}/orders/export`, { params })
    return response.data
  },

  // params: { from, to, rating, page, limit }
  getReviews: async (params) => {
    const response = await axiosClient.get(`${REPORT_URL}/reviews`, { params })
    return response.data
  },

  getSettlements: async (params) => {
    const response = await axiosClient.get(`${REPORT_URL}/settlements`, { params })
    return response.data
  },
}

export default reportApi
