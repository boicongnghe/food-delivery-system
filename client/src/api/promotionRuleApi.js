import axiosClient from './axiosClient.js'

const PROMOTION_URL = '/admin/promotion-rules'

// UC41 - Manage promotion rules (admin). Checkout applies the same codes.
const promotionRuleApi = {
  // params: { page, limit, keyword, status: 'all' | 'active' | 'scheduled' | 'expired' | 'disabled' | 'exhausted' }
  getPromotions: async (params) => {
    const response = await axiosClient.get(PROMOTION_URL, { params })
    return response.data
  },

  createPromotion: async (data) => {
    const response = await axiosClient.post(PROMOTION_URL, data)
    return response.data
  },

  updatePromotion: async (id, data) => {
    const response = await axiosClient.put(`${PROMOTION_URL}/${id}`, data)
    return response.data
  },

  deletePromotion: async (id) => {
    const response = await axiosClient.delete(`${PROMOTION_URL}/${id}`)
    return response.data
  },
}

export default promotionRuleApi
