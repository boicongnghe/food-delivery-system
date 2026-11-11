import axiosClient from './axiosClient.js'

// Checkout only; admins manage codes through promotionRuleApi (/admin/promotion-rules)
export const promotionApi = {
  getPromotions: async (params) => {
    const response = await axiosClient.get('/promotions', { params })
    return response.data
  },
  applyPromotion: async (data) => {
    const response = await axiosClient.post('/promotions/apply', data)
    return response.data
  },
}

export default promotionApi
