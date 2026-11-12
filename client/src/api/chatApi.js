import axiosClient from './axiosClient.js'

export const chatApi = {
  sendMessage: async ({ message, history = [] }) => {
    const response = await axiosClient.post('/chat/assistant', { message, history })
    return response.data
  },
  getOrderMessages: async (orderId) => {
    const response = await axiosClient.get(`/chat/orders/${orderId}/messages`)
    return response.data
  },
  sendOrderMessage: async (orderId, message) => {
    const response = await axiosClient.post(`/chat/orders/${orderId}/messages`, { message })
    return response.data
  },
}

export default chatApi
