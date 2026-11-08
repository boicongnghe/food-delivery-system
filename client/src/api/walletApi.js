import axiosClient from './axiosClient.js'

const walletApi = {
  // Lấy thông tin ví và lịch sử giao dịch (Customer)
  getMyWallet: async () => {
    const response = await axiosClient.get('/wallet/my-wallet')
    return response.data
  },

  // Tạo yêu cầu rút tiền về ngân hàng (Customer)
  requestWithdrawal: async (data) => {
    const response = await axiosClient.post('/wallet/withdraw', data)
    return response.data
  },

  // Lấy danh sách yêu cầu rút tiền (Admin)
  getAdminWithdrawals: async (params) => {
    const response = await axiosClient.get('/wallet/admin/withdrawals', { params })
    return response.data
  },

  // Admin duyệt chuyển tiền thành công
  approveWithdrawal: async (id, data) => {
    const response = await axiosClient.patch(`/wallet/admin/withdrawals/${id}/approve`, data)
    return response.data
  },

  // Admin từ chối yêu cầu rút tiền (hoàn lại ví)
  rejectWithdrawal: async (id, data) => {
    const response = await axiosClient.patch(`/wallet/admin/withdrawals/${id}/reject`, data)
    return response.data
  },
}

export default walletApi

