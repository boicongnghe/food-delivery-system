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

  // Pause / resume new orders (no cook on duty, too many orders)
  setAcceptingOrders: async (isAcceptingOrders) => {
    const response = await axiosClient.patch('/restaurants/me/accepting-orders', { isAcceptingOrders })
    return response.data
  },
}

export default restaurantApi
