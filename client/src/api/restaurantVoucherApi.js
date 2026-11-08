import axiosClient from './axiosClient.js'

const OWNER_URL = '/restaurants/me/vouchers'

// Restaurant vouchers: the owner manages them, customers see and apply them at checkout
const restaurantVoucherApi = {
  // ---------- owner (Khuyến mãi page) -> { items, summary }
  getMyVouchers: async () => {
    const response = await axiosClient.get(OWNER_URL)
    return response.data
  },

  createVoucher: async (payload) => {
    const response = await axiosClient.post(OWNER_URL, payload)
    return response.data
  },

  updateVoucher: async (id, payload) => {
    const response = await axiosClient.put(`${OWNER_URL}/${id}`, payload)
    return response.data
  },

  setVoucherActive: async (id, isActive) => {
    const response = await axiosClient.patch(`${OWNER_URL}/${id}/active`, { isActive })
    return response.data
  },

  deleteVoucher: async (id) => {
    const response = await axiosClient.delete(`${OWNER_URL}/${id}`)
    return response.data
  },

  // ---------- customers (checkout). restaurantId may be an id, a slug or a name (as kept in the cart)
  getRunningVouchers: async (restaurantId) => {
    const response = await axiosClient.get('/restaurant-vouchers', { params: { restaurantId } })
    return response.data
  },

  // { restaurantId, code, subtotal } -> { code, title, discountAmount }
  applyVoucher: async (payload) => {
    const response = await axiosClient.post('/restaurant-vouchers/apply', payload)
    return response.data
  },
}

export default restaurantVoucherApi
