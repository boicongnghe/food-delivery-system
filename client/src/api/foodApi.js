import axiosClient from './axiosClient.js'

export const foodApi = {
  getFoods: (params) => axiosClient.get('/foods', { params }),
  getRestaurants: () => axiosClient.get('/foods/restaurants'),
  getFoodById: (id) => axiosClient.get(`/foods/${id}`),
}
