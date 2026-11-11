import axiosClient from './axiosClient.js'

export const foodApi = {
  getFoods: async (params) => {
    const response = await axiosClient.get('/foods', { params })
    return response.data
  },
  getRestaurants: async () => {
    const response = await axiosClient.get('/foods/restaurants')
    return response.data
  },
  getFoodById: async (id) => {
    const response = await axiosClient.get(`/foods/${id}`)
    return response.data
  },
}

export default foodApi
