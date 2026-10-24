import axiosClient from './axiosClient.js'

const CATEGORY_URL = '/restaurants/me/menu-categories'
const ITEM_URL = '/restaurants/me/menu-items'

const menuApi = {
  // ----- Categories -----
  getCategories: async () => {
    const response = await axiosClient.get(CATEGORY_URL)
    return response.data
  },

  createCategory: async (data) => {
    const response = await axiosClient.post(CATEGORY_URL, data)
    return response.data
  },

  updateCategory: async (id, data) => {
    const response = await axiosClient.put(`${CATEGORY_URL}/${id}`, data)
    return response.data
  },

  deleteCategory: async (id) => {
    const response = await axiosClient.delete(`${CATEGORY_URL}/${id}`)
    return response.data
  },

  // ----- Menu items -----
  // params: { page, limit, keyword, category, status }
  getMenuItems: async (params) => {
    const response = await axiosClient.get(ITEM_URL, { params })
    return response.data
  },

  createMenuItem: async (data) => {
    const response = await axiosClient.post(ITEM_URL, data)
    return response.data
  },

  updateMenuItem: async (id, data) => {
    const response = await axiosClient.put(`${ITEM_URL}/${id}`, data)
    return response.data
  },

  setAvailability: async (id, isAvailable) => {
    const response = await axiosClient.patch(`${ITEM_URL}/${id}/availability`, { isAvailable })
    return response.data
  },

  setVisibility: async (id, isVisible) => {
    const response = await axiosClient.patch(`${ITEM_URL}/${id}/visibility`, { isVisible })
    return response.data
  },

  deleteMenuItem: async (id) => {
    const response = await axiosClient.delete(`${ITEM_URL}/${id}`)
    return response.data
  },
}

export default menuApi
