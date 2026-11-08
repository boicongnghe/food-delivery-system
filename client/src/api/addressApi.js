import axiosClient from './axiosClient.js'

export const addressApi = {
  getAddresses: () => axiosClient.get('/addresses'),
  createAddress: (data) => axiosClient.post('/addresses', data),
  updateAddress: (id, data) => axiosClient.put(`/addresses/${id}`, data),
  setDefaultAddress: (id) => axiosClient.patch(`/addresses/${id}/default`),
  deleteAddress: (id) => axiosClient.delete(`/addresses/${id}`),
}
