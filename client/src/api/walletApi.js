import axiosClient from './axiosClient.js'

const WALLET_URL = '/restaurants/me/wallet'

const walletApi = {
  // ----- Customer Virtual Wallet -----
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

  // ----- Restaurant Wallet -----
  // Wallet of the owner's restaurant: balance from delivered orders, withdrawals to the bank account
  getWallet: async () => {
    const response = await axiosClient.get(WALLET_URL)
    return response.data
  },

  // payload: { bankName, accountNumber, accountHolder } -> the updated restaurant
  updatePayoutAccount: async (payload) => {
    const response = await axiosClient.put(`${WALLET_URL}/payout-account`, payload)
    return response.data
  },

  // params: { page, limit }
  getWithdrawals: async (params) => {
    const response = await axiosClient.get(`${WALLET_URL}/withdrawals`, { params })
    return response.data
  },

  // payload: { amount, idempotencyKey } - the same key is sent again on a retry of the same form
  createWithdrawal: async (payload) => {
    const response = await axiosClient.post(`${WALLET_URL}/withdrawals`, payload)
    return response.data
  },
}

export default walletApi
