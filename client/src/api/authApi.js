import axiosClient from './axiosClient.js'

const authApi = {
  login: async (credentials) => {
    const response = await axiosClient.post('/auth/login', credentials)
    return response.data
  },

  register: async (userData) => {
    const response = await axiosClient.post('/auth/register', userData)
    return response.data
  },

  getMe: async () => {
    const response = await axiosClient.get('/auth/me')
    return response.data
  },
}

export default authApi
