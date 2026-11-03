import axiosClient from './axiosClient.js'

const RULE_URL = '/admin/commission-rules'

// UC40 - Manage commission rules
const commissionRuleApi = {
  // { today, items, currentDefaults: { restaurant, shipper } }
  getRules: async () => {
    const response = await axiosClient.get(RULE_URL)
    return response.data
  },

  // data: { name, target, restaurant, rate, effectiveFrom, effectiveTo, note } - dates "YYYY-MM-DD"
  createRule: async (data) => {
    const response = await axiosClient.post(RULE_URL, data)
    return response.data
  },

  updateRule: async (id, data) => {
    const response = await axiosClient.put(`${RULE_URL}/${id}`, data)
    return response.data
  },

  deleteRule: async (id) => {
    const response = await axiosClient.delete(`${RULE_URL}/${id}`)
    return response.data
  },

  // Restaurant picker, from the admin restaurant list: [{ _id, name, status, ... }]
  searchRestaurants: async (keyword) => {
    const response = await axiosClient.get('/admin/restaurants', { params: { keyword, limit: 20 } })
    return response.data.data.items
  },
}

export default commissionRuleApi
