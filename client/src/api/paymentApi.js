import axiosClient from './axiosClient.js'

// Dev / demo only: the server must also run with ENABLE_PAYMENT_SIMULATION=true
export const isPaymentSimulationEnabled = import.meta.env.VITE_ENABLE_PAYMENT_SIMULATION === 'true'

export const paymentApi = {
  getPaymentQrInfo: (orderId) => axiosClient.get(`/payments/${orderId}/qr`),
  checkPaymentStatus: (orderId) => axiosClient.get(`/payments/${orderId}/status`),
  getPaymentByOrder: (orderId) => axiosClient.get(`/payments/${orderId}`),
  // Body { orderId } or { depositCode }: the server uses the amount it stored, never one from the client
  simulateWebhook: (data) => axiosClient.post('/payments/simulate-webhook', data),
}
