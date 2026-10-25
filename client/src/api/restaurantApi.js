import axiosClient from './axiosClient.js'

const restaurantApi = {
  getMyRestaurant: async () => {
    const response = await axiosClient.get('/restaurants/me')
    return response.data
  },

  updateMyRestaurant: async (profileData) => {
    const response = await axiosClient.put('/restaurants/me', profileData)
    return response.data
  },
}

export default restaurantApi
