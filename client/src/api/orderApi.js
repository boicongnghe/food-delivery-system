import axiosClient from './axiosClient.js'

const RESTAURANT_ORDER_URL = '/restaurants/me/orders'

export const orderApi = {
  // ----- Customer orders -----
  createOrder: (data) => axiosClient.post('/orders', data),
  getOrderById: (id) => axiosClient.get(`/orders/${id}`),
  getCustomerOrders: (params) => axiosClient.get('/orders', { params }),
  cancelOrder: (id, data) => axiosClient.post(`/orders/${id}/cancel`, data),
  receiveOrder: (id) => axiosClient.patch(`/orders/${id}/receive`),
  progressOrder: (id, data) => axiosClient.patch(`/orders/${id}/progress`, data),

  // ----- Restaurant owner (kitchen board) -----
  getBoard: async () => {
    const response = await axiosClient.get(`${RESTAURANT_ORDER_URL}/board`)
    return response.data
  },

  // "GN-0042" -> { _id } (any status, own restaurant only)
  lookupOrder: async (code) => {
    const response = await axiosClient.get(`${RESTAURANT_ORDER_URL}/lookup`, { params: { code } })
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
  getAvailableOrderDetail: async (id) => {
    const response = await axiosClient.get(`/orders/available-for-pickup/${id}`)
    return response.data
  },
  getShipperActiveOrders: async () => {
    const response = await axiosClient.get('/orders/shipper/active')
    return response.data
  },
  acceptDeliveryOrder: async (id) => {
    const response = await axiosClient.patch(`/orders/${id}/shipper/accept`)
    return response.data
  },
  cancelDeliveryAcceptance: async id => {
    const response = await axiosClient.patch(`/orders/${id}/shipper/cancel-acceptance`)
    return response.data
  },
  confirmDeliveryPickup: async (id) => {
    const response = await axiosClient.patch(`/orders/${id}/shipper/picked-up`)
    return response.data
  },
  startCustomerWait: async id => {
    const response = await axiosClient.post(`/orders/${id}/shipper/customer-wait`)
    return response.data
  },
  recordUnansweredCall: async id => {
    const response = await axiosClient.post(`/orders/${id}/shipper/unanswered-call`)
    return response.data
  },
  confirmDeliveryDelivered: async id => {
    const response = await axiosClient.patch(`/orders/${id}/shipper/delivered`)
    return response.data
  },
}

export default orderApi
