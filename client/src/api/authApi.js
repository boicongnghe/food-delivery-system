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

  forgotPassword: async (email) => {
    const response = await axiosClient.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async ({ email, otp, newPassword }) => {
    const response = await axiosClient.post('/auth/reset-password', { email, otp, newPassword })
    return response.data
  },

  updateProfile: async (profileData) => {
    const response = await axiosClient.put('/users/profile', profileData)
    return response.data
  },
}

export default authApi
