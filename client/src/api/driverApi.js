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

const driverApi = {
  getDashboard,
  getSettings,
  updateOnlineStatus,
  updateSettings,
  changePassword,
}

export default driverApi
