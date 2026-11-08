import axiosClient from './axiosClient.js'

const WALLET_URL = '/restaurants/me/wallet'

// Wallet of the owner's restaurant: balance from delivered orders, withdrawals to the bank account
const walletApi = {
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
