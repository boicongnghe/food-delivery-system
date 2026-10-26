import axiosClient from './axiosClient.js'

export const promotionApi = {
  getPromotions: (params) => axiosClient.get('/promotions', { params }),
  applyPromotion: (data) => axiosClient.post('/promotions/apply', data),
  createPromotion: (data) => axiosClient.post('/promotions', data),
  updatePromotion: (id, data) => axiosClient.put(`/promotions/${id}`, data),
  deletePromotion: (id) => axiosClient.delete(`/promotions/${id}`),
}
