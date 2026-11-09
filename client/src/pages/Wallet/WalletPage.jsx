import { useState, useEffect } from 'react'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import walletApi from '../../api/walletApi.js'
import PayoutAccountsCard from '../../components/PayoutAccountsCard/PayoutAccountsCard.jsx'
import useAuth from '../../hooks/useAuth.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatDateTime } from '../../utils/formatDate.js'
import CustomerWithdrawForm from './components/CustomerWithdrawForm.jsx'

const USER_ACCOUNT_API = {
  add: walletApi.addMyPayoutAccount,
  setDefault: walletApi.setMyDefaultPayoutAccount,
  remove: walletApi.removeMyPayoutAccount,
}

export default function WalletPage() {
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [walletData, setWalletData] = useState({
    balance: 0,
    transactions: [],
    withdrawals: [],
    payoutAccounts: [],
    maxPayoutAccounts: 5,
    minWithdrawal: 10000,
  })

  // After a withdrawal or an account change: fresh balance, history and accounts (+ the balance shown in the navbar)
  const reload = async () => {
    await fetchWallet()
    if (typeof refreshUser === 'function') refreshUser()
  }

  // Active tab: 'transactions' or 'withdrawals'
  const [activeTab, setActiveTab] = useState('transactions')

  const fetchWallet = async () => {
    try {
      setLoading(true)
      const res = await walletApi.getMyWallet()
      if (res.success && res.data) {
        setWalletData(res.data)
      }
    } catch {
      toast.error('Không thể tải thông tin ví ảo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWallet()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0D0F12] py-8 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Ví ảo FoodDelivery
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Nhận tiền hoàn tự động từ đơn hàng bị huỷ và rút về tài khoản ngân hàng
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchWallet}
            disabled={loading}
            className="self-start sm:self-center flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Balance Overview Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-emerald-900/10">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Số dư khả dụng
              </span>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                {formatCurrency(walletData.balance)}
              </div>
              <p className="text-xs text-emerald-100/80 max-w-md flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Tiền được hoàn tự động 100% khi đơn hàng thanh toán trước bị huỷ. Rút tiền tối thiểu 10.000đ.
              </p>
            </div>

          </div>
        </div>

        {/* Bank accounts (one default) + withdrawal, same layout as the restaurant wallet */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PayoutAccountsCard
            accounts={walletData.payoutAccounts || []}
            maxAccounts={walletData.maxPayoutAccounts}
            api={USER_ACCOUNT_API}
            onChanged={reload}
          />
          <CustomerWithdrawForm
            balance={walletData.balance}
            minAmount={walletData.minWithdrawal || 10000}
            defaultAccount={(walletData.payoutAccounts || []).find((account) => account.isDefault) || null}
            onDone={reload}
          />
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Lịch sử biến động ({walletData.transactions?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'withdrawals'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Lệnh rút tiền ({walletData.withdrawals?.length || 0})
          </button>
        </div>

        {/* Tab 1: Biến động số dư */}
        {activeTab === 'transactions' && (
          <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            {walletData.transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <Wallet className="w-12 h-12 mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-sm">Chưa có giao dịch nào</p>
                <p className="text-xs">Khi có đơn hàng bị huỷ, số tiền hoàn sẽ hiển thị chi tiết tại đây.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {walletData.transactions.map((tx) => {
                  const isPlus = tx.amount > 0
                  return (
                    <div
                      key={tx._id}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isPlus
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isPlus ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {tx.description || (isPlus ? 'Hoàn tiền vào ví' : 'Rút tiền khỏi ví')}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            <span>{formatDateTime(tx.createdAt)}</span>
                            <span>•</span>
                            <span>Số dư sau: {formatCurrency(tx.balanceAfter)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm sm:text-base font-black ${
                            isPlus ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'
                          }`}
                        >
                          {isPlus ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                        </div>
                        <span
                          className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                            tx.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : tx.status === 'pending'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {tx.status === 'completed'
                            ? 'Thành công'
                            : tx.status === 'pending'
                            ? 'Đang xử lý'
                            : 'Thất bại'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Lệnh rút tiền */}
        {activeTab === 'withdrawals' && (
          <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            {walletData.withdrawals.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <ArrowUpRight className="w-12 h-12 mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-sm">Chưa có yêu cầu rút tiền nào</p>
                <p className="text-xs">Bấm "Rút tiền về ngân hàng" để gửi yêu cầu chuyển tiền về tài khoản của bạn.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {walletData.withdrawals.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          {formatCurrency(item.amount)}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : item.status === 'pending'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {item.status === 'completed'
                            ? 'Đã chuyển tiền'
                            : item.status === 'pending'
                            ? 'Chờ Admin duyệt & chuyển khoản'
                            : 'Bị từ chối (Đã hoàn lại ví)'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.bankInfo?.bankName}
                        </span>
                        <span>•</span>
                        <span>STK: <strong className="font-mono text-slate-800 dark:text-slate-200">{item.bankInfo?.accountNumber}</strong></span>
                        <span>•</span>
                        <span>Chủ TK: {item.bankInfo?.accountHolder}</span>
                      </div>

                      {item.status === 'completed' && item.reference && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Mã giao dịch ngân hàng: <strong className="font-mono">{item.reference}</strong>
                        </p>
                      )}

                      {item.status === 'rejected' && item.rejectionReason && (
                        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Lý do từ chối: {item.rejectionReason}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-400">Yêu cầu lúc: {formatDateTime(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

