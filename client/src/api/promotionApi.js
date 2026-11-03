import axiosClient from './axiosClient.js'

// Checkout only; admins manage codes through promotionRuleApi (/admin/promotion-rules)
export const promotionApi = {
  getPromotions: (params) => axiosClient.get('/promotions', { params }),
  applyPromotion: (data) => axiosClient.post('/promotions/apply', data),
}
