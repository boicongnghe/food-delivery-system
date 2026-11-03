import axiosClient from './axiosClient.js'

// Restaurant and shipper management of the admin portal
const adminPartnerApi = {
  // params: { page, limit, keyword, status: 'all' | 'pending' | 'approved' | 'rejected' | 'suspended' }
  // -> { items, pagination, counts }
  getRestaurants: async (params) => {
    const response = await axiosClient.get('/admin/restaurants', { params })
    return response.data
  },

  // Full registration (license file included) + registrationChecks, orderStats, violationCount
  getRestaurant: async (id) => {
    const response = await axiosClient.get(`/admin/restaurants/${id}`)
    return response.data
  },

  // { status: 'approved' | 'rejected' | 'suspended', note } - note is required to reject / suspend
  changeRestaurantStatus: async (id, data) => {
    const response = await axiosClient.patch(`/admin/restaurants/${id}/status`, data)
    return response.data
  },

  getShippers: async (params) => {
    const response = await axiosClient.get('/admin/shippers', { params })
    return response.data
  },

  getShipper: async (id) => {
    const response = await axiosClient.get(`/admin/shippers/${id}`)
    return response.data
  },

  changeShipperStatus: async (id, data) => {
    const response = await axiosClient.patch(`/admin/shippers/${id}/status`, data)
    return response.data
  },
}

export default adminPartnerApi
