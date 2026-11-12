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
  getFoodReviews: async (id, params) => {
    const response = await axiosClient.get(`/foods/${id}/reviews`, { params })
    return response.data
  },
  getMyDishReviewStatus: async (id) => {
    const response = await axiosClient.get(`/foods/${id}/my-review-status`)
    return response.data
  },
  createDishReview: async (id, data) => {
    const response = await axiosClient.post(`/foods/${id}/reviews`, data)
    return response.data
  },
}

export default foodApi
