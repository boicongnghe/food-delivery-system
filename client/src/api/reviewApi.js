import axiosClient from './axiosClient.js'

const reviewApi = {
  // ----- Customer (UC17) -----
  // data: { restaurantRating, comment, shipperRating, shipperComment } - shipperRating required when the order had a shipper
  createReview: async (orderId, data) => {
    const response = await axiosClient.post(`/orders/${orderId}/reviews`, data)
    return response.data
  },

  getMyReviews: async (params) => {
    const response = await axiosClient.get('/reviews/me', { params })
    return response.data
  },

  // Delivered orders still waiting for a review: { items, windowDays }
  getReviewableOrders: async () => {
    const response = await axiosClient.get('/reviews/me/reviewable-orders')
    return response.data
  },

  // ----- Admin moderation (UC43) -----
  // params: { page, limit, keyword, visibility: 'all' | 'visible' | 'hidden', rating }
  getReviews: async (params) => {
    const response = await axiosClient.get('/admin/reviews', { params })
    return response.data
  },

  getReview: async (id) => {
    const response = await axiosClient.get(`/admin/reviews/${id}`)
    return response.data
  },

  // data: { isHidden: true, reason, note } to hide, { isHidden: false } to restore
  setVisibility: async (id, data) => {
    const response = await axiosClient.patch(`/admin/reviews/${id}/visibility`, data)
    return response.data
  },
}

export default reviewApi
