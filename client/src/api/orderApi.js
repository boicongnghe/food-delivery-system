import axiosClient from './axiosClient.js'

export const orderApi = {
  createOrder: (data) => axiosClient.post('/orders', data),
  getOrderById: (id) => axiosClient.get(`/orders/${id}`),
  getCustomerOrders: (params) => axiosClient.get('/orders', { params }),
  cancelOrder: (id, data) => axiosClient.post(`/orders/${id}/cancel`, data),
  receiveOrder: (id) => axiosClient.patch(`/orders/${id}/receive`),
  progressOrder: (id, data) => axiosClient.patch(`/orders/${id}/progress`, data),
}
