import axiosClient from './axiosClient.js'

export const paymentApi = {
  getPaymentQrInfo: (orderId) => axiosClient.get(`/payments/${orderId}/qr`),
  checkPaymentStatus: (orderId) => axiosClient.get(`/payments/${orderId}/status`),
  processPayment: (orderId, data) => axiosClient.post(`/payments/${orderId}`, data),
  retryPayment: (orderId, data) => axiosClient.post(`/payments/${orderId}/retry`, data),
  getPaymentByOrder: (orderId) => axiosClient.get(`/payments/${orderId}`),
  simulateWebhook: (data) => axiosClient.post('/payments/simulate-webhook', data),
}
