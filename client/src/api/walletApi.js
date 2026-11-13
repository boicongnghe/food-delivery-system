import axiosClient from './axiosClient.js'

const WALLET_URL = '/restaurants/me/wallet'

const walletApi = {
  // ----- Customer Virtual Wallet -----
  // Lấy thông tin ví và lịch sử giao dịch (Customer)
  getMyWallet: async () => {
    const response = await axiosClient.get('/wallet/my-wallet')
    return response.data
  },

  // Bank accounts of the signed-in customer / shipper (several, one default). Each call returns the masked list.
  getMyPayoutAccounts: async () => {
    const response = await axiosClient.get('/wallet/payout-accounts')
    return response.data
  },

  addMyPayoutAccount: async (payload) => {
    const response = await axiosClient.post('/wallet/payout-accounts', payload)
    return response.data
  },

  setMyDefaultPayoutAccount: async (accountId) => {
    const response = await axiosClient.patch(`/wallet/payout-accounts/${accountId}/default`)
    return response.data
  },

  removeMyPayoutAccount: async (accountId) => {
    const response = await axiosClient.delete(`/wallet/payout-accounts/${accountId}`)
    return response.data
  },

  // Tạo yêu cầu rút tiền (Customer): { amount } -> chuyển về tài khoản mặc định đã lưu
  requestWithdrawal: async (data) => {
    const response = await axiosClient.post('/wallet/withdraw', data)
    return response.data
  },

  // Tạo yêu cầu nạp tiền vào ví VietQR (Customer): { amount }
  createDeposit: async (data) => {
    const response = await axiosClient.post('/wallet/deposit/create', data)
    return response.data
  },

  // Trạng thái yêu cầu nạp tiền: ví chỉ được cộng khi webhook ngân hàng báo tiền đã về
  getDepositStatus: async (depositId) => {
    const response = await axiosClient.get(`/wallet/deposit/${depositId}`)
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

  // Bank accounts receiving the withdrawals (one default). Each call returns the account list, masked.
  // payload: { bankName, accountNumber, accountHolder, makeDefault }
  addPayoutAccount: async (payload) => {
    const response = await axiosClient.post(`${WALLET_URL}/payout-accounts`, payload)
    return response.data
  },

  setDefaultPayoutAccount: async (accountId) => {
    const response = await axiosClient.patch(`${WALLET_URL}/payout-accounts/${accountId}/default`)
    return response.data
  },

  removePayoutAccount: async (accountId) => {
    const response = await axiosClient.delete(`${WALLET_URL}/payout-accounts/${accountId}`)
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
