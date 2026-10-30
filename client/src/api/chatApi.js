import axiosClient from './axiosClient.js'

export const chatApi = {
  sendMessage: async ({ message, history = [] }) => {
    const response = await axiosClient.post('/chat/assistant', { message, history })
    return response.data
  },
}

export default chatApi

