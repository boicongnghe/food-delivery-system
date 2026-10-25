import axiosClient from './axiosClient.js'

export const authApi = {
  login: (data) => axiosClient.post('/auth/login', data),
  getMe: () => axiosClient.get('/auth/me'),
}
