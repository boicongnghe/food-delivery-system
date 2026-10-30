import axiosClient from './axiosClient.js'

export const authApi = {
  login: async (credentials) => {
    const response = await axiosClient.post('/auth/login', credentials)
    return response.data
  },

  googleLogin: async (googleData) => {
    const response = await axiosClient.post('/auth/google', googleData)
    return response.data
  },

  facebookLogin: async (facebookData) => {
    const response = await axiosClient.post('/auth/facebook', facebookData)
    return response.data
  },

  register: async (userData) => {
    const response = await axiosClient.post('/auth/register', userData)
    return response.data
  },

  verifyEmail: async (token) => {
    const response = await axiosClient.post('/auth/verify-email', { token })
    return response.data
  },

  resendVerification: async (email) => {
    const response = await axiosClient.post('/auth/resend-verification', { email })
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

  changePassword: async (passwordData) => {
    const response = await axiosClient.put('/auth/change-password', passwordData)
    return response.data
  },

  deleteAccount: async (data) => {
    const response = await axiosClient.delete('/users/me', { data })
    return response.data
  },

  getAddresses: async () => {
    const response = await axiosClient.get('/users/addresses')
    return response.data
  },

  addAddress: async (addressData) => {
    const response = await axiosClient.post('/users/addresses', addressData)
    return response.data
  },

  updateAddress: async (addressId, addressData) => {
    const response = await axiosClient.put(`/users/addresses/${addressId}`, addressData)
    return response.data
  },

  deleteAddress: async (addressId) => {
    const response = await axiosClient.delete(`/users/addresses/${addressId}`)
    return response.data
  },

  setDefaultAddress: async (addressId) => {
    const response = await axiosClient.patch(`/users/addresses/${addressId}/default`)
    return response.data
  },
}

export default authApi
