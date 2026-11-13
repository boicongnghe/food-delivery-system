import axiosClient from './axiosClient.js'

// Hearings seen by the parties of an order (shipper, customer, restaurant owner): delivery issues and complaints.
// caseType: 'delivery_issue' | 'complaint' (server values), sent in the URL as its segment
export const HEARING_SEGMENTS = { delivery_issue: 'delivery-issues', complaint: 'complaints' }

const hearingApi = {
  // params: { page, limit } -> { items: [{ _id, caseType, code, orderCode, kind, status, restaurantName, deadline, hearingState }] }
  getMyHearings: async (params) => {
    const response = await axiosClient.get('/hearings/me', { params })
    return response.data
  },

  getHearing: async (caseType, id) => {
    const response = await axiosClient.get(`/hearings/${HEARING_SEGMENTS[caseType]}/${id}`)
    return response.data
  },

  getMessages: async (caseType, id) => {
    const response = await axiosClient.get(`/hearings/${HEARING_SEGMENTS[caseType]}/${id}/messages`)
    return response.data
  },

  sendMessage: async (caseType, id, message) => {
    const response = await axiosClient.post(`/hearings/${HEARING_SEGMENTS[caseType]}/${id}/messages`, { message })
    return response.data
  },
}

export default hearingApi
