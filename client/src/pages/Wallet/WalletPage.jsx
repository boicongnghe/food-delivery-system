import { useState, useEffect } from 'react'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  CreditCard,
  User,
  RefreshCw,
  Info,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import walletApi from '../../api/walletApi.js'
import useAuth from '../../hooks/useAuth.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatDateTime } from '../../utils/formatDate.js'

const POPULAR_BANKS = [
  'Vietcombank (VCB)',
  'MBBank (MB)',
  'Techcombank (TCB)',
  'VietinBank (CTG)',
  'BIDV',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'OCB',
  'SHB',
  'Ví MoMo',
]

export default function WalletPage() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [walletData, setWalletData] = useState({
    balance: 0,
    transactions: [],
    withdrawals: [],
  })

  // Modal rút tiền state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    bankName: POPULAR_BANKS[0],
    accountNumber: '',
    accountHolder: '',
  })

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

  const handleOpenModal = () => {
    setFormData({
      amount: '',
      bankName: POPULAR_BANKS[0],
      accountNumber: '',
      accountHolder: user?.fullName?.toUpperCase() || '',
    })
    setShowWithdrawModal(true)
  }

  const handleQuickAmount = (val) => {
    setFormData((prev) => ({ ...prev, amount: String(val) }))
  }

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault()
    const amountNum = Number(formData.amount)

    if (!amountNum || amountNum < 10000) {
      toast.error('Số tiền rút tối thiểu là 10.000đ')
      return
    }

    if (amountNum > walletData.balance) {
      toast.error('Số dư ví khả dụng không đủ')
      return
    }

    if (!formData.bankName || !formData.accountNumber.trim() || !formData.accountHolder.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng')
      return
    }

    try {
      setSubmitting(true)
      const res = await walletApi.requestWithdrawal({
        amount: amountNum,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber.trim(),
        accountHolder: formData.accountHolder.trim().toUpperCase(),
      })

      if (res.success) {
        toast.success(res.message || 'Yêu cầu rút tiền thành công!')
        setShowWithdrawModal(false)
        await fetchWallet()
        if (typeof refreshUser === 'function') {
          refreshUser()
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu rút tiền'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

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

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenModal}
                disabled={walletData.balance < 10000}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 text-sm font-black shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                Rút tiền về ngân hàng
              </button>
            </div>
          </div>
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

      {/* Modal Rút Tiền */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Rút tiền về ngân hàng</h3>
                  <p className="text-xs text-slate-500">Số dư hiện có: {formatCurrency(walletData.balance)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {/* Số tiền rút */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số tiền muốn rút (VNĐ) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10000"
                    max={walletData.balance}
                    step="1000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="VD: 50000 (Tối thiểu 10.000đ)"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    đ
                  </span>
                </div>

                {/* Gợi ý số tiền nhanh */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[20000, 50000, 100000, 200000].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      disabled={quick > walletData.balance}
                      onClick={() => handleQuickAmount(quick)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
                    >
                      {formatCurrency(quick)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(walletData.balance)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                  >
                    Rút tất cả
                  </button>
                </div>
              </div>

              {/* Ngân hàng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ngân hàng thụ hưởng <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Số tài khoản */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số tài khoản ngân hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Nhập số tài khoản ngân hàng"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Tên chủ tài khoản */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên chủ tài khoản (Viết in hoa không dấu) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value.toUpperCase() })}
                  placeholder="VD: NGUYEN VAN A"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Admin sẽ duyệt và chuyển khoản theo số tài khoản bạn cung cấp. Nếu từ chối, số tiền sẽ được hoàn lại vào ví ảo.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu rút tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

