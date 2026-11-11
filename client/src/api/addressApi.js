import axiosClient from './axiosClient.js'

export const addressApi = {
  getAddresses: async () => {
    const response = await axiosClient.get('/addresses')
    return response.data
  },
  createAddress: async (data) => {
    const response = await axiosClient.post('/addresses', data)
    return response.data
  },
  updateAddress: async (id, data) => {
    const response = await axiosClient.put(`/addresses/${id}`, data)
    return response.data
  },
  setDefaultAddress: async (id) => {
    const response = await axiosClient.patch(`/addresses/${id}/default`)
    return response.data
  },
  deleteAddress: async (id) => {
    const response = await axiosClient.delete(`/addresses/${id}`)
    return response.data
  },
}

export default addressApi
