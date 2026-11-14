import axiosClient from './axiosClient'

const getDashboard = async (period, signal) => {
  const response = await axiosClient.get('/drivers/me/dashboard', {
    params: { period },
    signal,
  })
  return response.data.data
}

const getSettings = async () => {
  const response = await axiosClient.get('/drivers/me/settings')
  return response.data.data
}

const updateOnlineStatus = async (isOnline) => {
  const response = await axiosClient.patch('/drivers/me/status', { isOnline })
  return response.data.data
}

const updateSettings = async (settings) => {
  const response = await axiosClient.patch('/drivers/me/settings', settings)
  return response.data.data
}

const changePassword = async (passwords) => {
  const response = await axiosClient.patch('/drivers/me/password', passwords)
  return response.data.data
}

const requestWithdrawal = async (amount) => {
  const response = await axiosClient.post('/drivers/me/withdrawals', { amount })
  return response.data
}

// params: { page, limit } -> { items, pagination }
const getWithdrawals = async (params) => {
  const response = await axiosClient.get('/drivers/me/withdrawals', { params })
  return response.data.data
}

// Profile under review: status, the admin's reason, fields and checklist
const getApplication = async () => {
  const response = await axiosClient.get('/drivers/me/application')
  return response.data.data
}

// Saves the corrected profile; a rejected profile goes back to "pending"
const resubmitApplication = async (data) => {
  const response = await axiosClient.put('/drivers/me/application', data)
  return response.data
}

// Delivery issue reports sent by the shipper. params: { page, limit } -> { items, pagination }
const getDeliveryIssues = async (params) => {
  const response = await axiosClient.get('/drivers/me/delivery-issues', { params })
  return response.data.data
}

const driverApi = {
  getDashboard,
  getSettings,
  updateOnlineStatus,
  updateSettings,
  changePassword,
  requestWithdrawal,
  getWithdrawals,
  getApplication,
  resubmitApplication,
  getDeliveryIssues,
};

export default driverApi
