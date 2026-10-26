import axiosClient from './axiosClient.js'

// UC44 - View analytics and reports
const analyticsApi = {
  // params: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } (Vietnam days, both inclusive, max 366 days)
  getAnalytics: async (params) => {
    const response = await axiosClient.get('/admin/analytics', { params })
    return response.data
  },
}

export default analyticsApi
