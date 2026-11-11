import axiosClient from './axiosClient.js'

// Admin: order timeout rules (docs/order-timeouts.md)
const settingApi = {
  // -> { values, defaults, updatedAt, updatedBy }
  getOrderTimeouts: async () => {
    const response = await axiosClient.get('/admin/settings/order-timeouts')
    return response.data
  },

  // values: every field of the form, in minutes
  updateOrderTimeouts: async (values) => {
    const response = await axiosClient.put('/admin/settings/order-timeouts', values)
    return response.data
  },

  // Violation policy -> { values: { autoSuspendThreshold }, defaults, updatedAt, updatedBy }
  getViolationPolicy: async () => {
    const response = await axiosClient.get('/admin/settings/violations')
    return response.data
  },

  // values: { autoSuspendThreshold } (0 turns the automatic suspension off)
  updateViolationPolicy: async (values) => {
    const response = await axiosClient.put('/admin/settings/violations', values)
    return response.data
  },
}

export default settingApi
