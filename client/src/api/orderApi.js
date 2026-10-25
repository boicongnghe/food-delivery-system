import axiosClient from './axiosClient.js'

const RESTAURANT_ORDER_URL = '/restaurants/me/orders'

const orderApi = {
  // ----- Restaurant owner (kitchen board) -----
  // Returns { pending, preparing, readyForPickup, recentlyCancelled, stats }
  getBoard: async () => {
    const response = await axiosClient.get(`${RESTAURANT_ORDER_URL}/board`)
    return response.data
  },

  getOrder: async (id) => {
    const response = await axiosClient.get(`${RESTAURANT_ORDER_URL}/${id}`)
    return response.data
  },

  acceptOrder: async (id) => {
    const response = await axiosClient.patch(`${RESTAURANT_ORDER_URL}/${id}/accept`)
    return response.data
  },

  // data: { reason: 'out_of_stock' | 'too_busy' | 'closing_soon' | 'other', note }
  rejectOrder: async (id, data) => {
    const response = await axiosClient.patch(`${RESTAURANT_ORDER_URL}/${id}/reject`, data)
    return response.data
  },

  markReady: async (id) => {
    const response = await axiosClient.patch(`${RESTAURANT_ORDER_URL}/${id}/ready`)
    return response.data
  },

  // ----- Shipper -----
  getAvailableForPickup: async (params) => {
    const response = await axiosClient.get('/orders/available-for-pickup', { params })
    return response.data
  },
}

export default orderApi
