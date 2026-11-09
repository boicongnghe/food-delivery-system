import { useState, useEffect } from 'react'
import {
  HandCoins,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Building2,
  CreditCard,
  User,
  Phone,
  Mail,
  Copy,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import walletApi from '../../api/walletApi.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatDateTime } from '../../utils/formatDate.js'

// Mapping tên ngân hàng sang Bank Bin cho VietQR
const BANK_BINS = {
  'Vietcombank (VCB)': 'vietcombank',
  'MBBank (MB)': 'mbbank',
  'Techcombank (TCB)': 'techcombank',
  'VietinBank (CTG)': 'vietinbank',
  BIDV: 'bidv',
  ACB: 'acb',
  VPBank: 'vpbank',
  TPBank: 'tpbank',
  Sacombank: 'sacombank',
  HDBank: 'hdbank',
  VIB: 'vib',
  OCB: 'ocb',
  SHB: 'shb',
}

export default function AdminWithdrawals() {
  const [loading, setLoading] = useState(true)
  const [withdrawals, setWithdrawals] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [statusFilter, setStatusFilter] = useState('pending') // default to pending for admin focus

  // Modals state
  const [selectedItem, setSelectedItem] = useState(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  // Form states
  const [approveForm, setApproveForm] = useState({ reference: '', note: '' })
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const fetchWithdrawals = async () => {
    try {
      setLoading(true)
      const res = await walletApi.getAdminWithdrawals({
        status: statusFilter,
        page: pagination.page,
      })
      if (res.success && res.data) {
        setWithdrawals(res.data.withdrawals || [])
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 })
      }
    } catch {
      toast.error('Không thể tải danh sách yêu cầu rút tiền')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
  }, [statusFilter, pagination.page])

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Đã sao chép vào bộ nhớ tạm')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleOpenApprove = (item) => {
    setSelectedItem(item)
    setApproveForm({ reference: '', note: '' })
    setShowApproveModal(true)
  }

  const handleOpenReject = (item) => {
    setSelectedItem(item)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleOpenQr = (item) => {
    setSelectedItem(item)
    setShowQrModal(true)
  }

  const handleApproveSubmit = async (e) => {
    e.preventDefault()
    if (!approveForm.reference.trim()) {
      toast.error('Vui lòng nhập mã giao dịch ngân hàng')
      return
    }

    try {
      setProcessing(true)
      const res = await walletApi.approveWithdrawal(selectedItem._id, approveForm)
      if (res.success) {
        toast.success(res.message || 'Đã duyệt yêu cầu rút tiền')
        setShowApproveModal(false)
        fetchWithdrawals()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt yêu cầu')
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }

    try {
      setProcessing(true)
      const res = await walletApi.rejectWithdrawal(selectedItem._id, { reason: rejectReason.trim() })
      if (res.success) {
        toast.success(res.message || 'Đã từ chối yêu cầu và hoàn lại tiền vào ví khách')
        setShowRejectModal(false)
        fetchWithdrawals()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối yêu cầu')
    } finally {
      setProcessing(false)
    }
  }

  // Tạo URL VietQR
  const getVietQrUrl = (item) => {
    if (!item?.bankInfo) return ''
    const bin = BANK_BINS[item.bankInfo.bankName] || 'vietcombank'
    const account = encodeURIComponent(item.bankInfo.accountNumber)
    const amount = item.amount
    const desc = encodeURIComponent(`RUT TIEN FD ${item._id?.slice(-6) || ''}`)
    return `https://img.vietqr.io/image/${bin}-${account}-compact2.png?amount=${amount}&addInfo=${desc}&accountName=${encodeURIComponent(item.bankInfo.accountHolder || '')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <HandCoins className="w-7 h-7 text-primary" />
            Yêu cầu rút tiền từ ví ảo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Duyệt và xác nhận chuyển khoản ngân hàng cho các lệnh rút tiền từ ví ảo của khách hàng
          </p>
        </div>

        <button
          onClick={fetchWithdrawals}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-crave-surface text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold transition-all shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { key: 'pending', label: 'Chờ duyệt' },
          { key: 'completed', label: 'Đã hoàn tất' },
          { key: 'rejected', label: 'Đã từ chối' },
          { key: 'all', label: 'Tất cả' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === tab.key
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-crave-surface border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table List */}
      <div className="bg-white dark:bg-crave-surface rounded-2xl border border-slate-100 dark:border-crave-border overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-xs font-semibold">Đang tải danh sách yêu cầu...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <HandCoins className="w-12 h-12 mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-sm">Không có yêu cầu rút tiền nào</p>
            <p className="text-xs">Hiện tại không có yêu cầu nào khớp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-crave-border text-slate-500 uppercase font-black tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Khách hàng</th>
                  <th className="px-5 py-3.5">Số tiền rút</th>
                  <th className="px-5 py-3.5">Thông tin tài khoản ngân hàng</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-crave-border font-medium">
                {withdrawals.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                    {/* Khách hàng */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                          alt={item.user?.fullName}
                          className="w-9 h-9 rounded-xl object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.user?.fullName || 'Khách hàng'}</p>
                          <p className="text-[11px] text-slate-400">{item.user?.phone || item.user?.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Số tiền rút */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.amount)}
                      </span>
                    </td>

                    {/* Ngân hàng */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {item.bankInfo?.bankName}
                        </p>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          <span>STK: <strong className="text-slate-900 dark:text-white">{item.bankInfo?.accountNumber}</strong></span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.bankInfo?.accountNumber, item._id)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-600"
                            title="Sao chép số tài khoản"
                          >
                            {copiedId === item._id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">Chủ TK: <strong className="uppercase">{item.bankInfo?.accountHolder}</strong></p>
                        {item.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleOpenQr(item)}
                            className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-primary hover:underline"
                          >
                            <QrCode className="w-3 h-3" />
                            Quét mã VietQR chuyển nhanh
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : item.status === 'pending'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          }`}
                        >
                          {item.status === 'completed'
                            ? 'Đã chuyển tiền'
                            : item.status === 'pending'
                            ? 'Chờ duyệt'
                            : 'Đã từ chối'}
                        </span>
                        {item.status === 'completed' && item.reference && (
                          <p className="text-[11px] text-slate-500 font-mono">Mã: {item.reference}</p>
                        )}
                        {item.status === 'rejected' && item.rejectionReason && (
                          <p className="text-[11px] text-red-500 line-clamp-1" title={item.rejectionReason}>
                            Lý do: {item.rejectionReason}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Thời gian */}
                    <td className="px-5 py-4 text-slate-500 text-[11px]">
                      {formatDateTime(item.createdAt)}
                    </td>

                    {/* Thao tác */}
                    <td className="px-5 py-4 text-right">
                      {item.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenApprove(item)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:scale-105 active:scale-95 transition-all"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleOpenReject(item)}
                            className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs transition-colors"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Duyệt Chuyển Tiền */}
      {showApproveModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-crave-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Xác nhận đã chuyển tiền
            </h3>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <p>Khách hàng: <strong className="text-slate-900 dark:text-white">{selectedItem.user?.fullName}</strong></p>
              <p>Số tiền: <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(selectedItem.amount)}</strong></p>
              <p>Ngân hàng: <strong>{selectedItem.bankInfo?.bankName}</strong></p>
              <p>STK: <strong className="font-mono">{selectedItem.bankInfo?.accountNumber}</strong> ({selectedItem.bankInfo?.accountHolder})</p>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mã giao dịch ngân hàng (FT/Reference) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={approveForm.reference}
                  onChange={(e) => setApproveForm({ ...approveForm, reference: e.target.value })}
                  placeholder="VD: FT26307123456"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={approveForm.note}
                  onChange={(e) => setApproveForm({ ...approveForm, note: e.target.value })}
                  placeholder="VD: Đã chuyển qua Internet Banking"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20"
                >
                  {processing ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Từ Chối */}
      {showRejectModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-crave-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Từ chối yêu cầu rút tiền
            </h3>

            <p className="text-xs text-slate-500">
              Khi từ chối, số tiền <strong className="text-red-500">{formatCurrency(selectedItem.amount)}</strong> sẽ được{' '}
              <strong>tự động hoàn lại vào ví ảo</strong> của khách hàng.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="VD: Sai số tài khoản, Tên chủ thẻ không khớp..."
                  rows={3}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-600/20"
                >
                  {processing ? 'Đang xử lý...' : 'Xác nhận từ chối & Hoàn ví'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quét VietQR */}
      {showQrModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-crave-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Quét mã VietQR để chuyển tiền
            </h3>
            <p className="text-xs text-slate-500">
              Số tiền: <strong className="text-emerald-600 text-sm">{formatCurrency(selectedItem.amount)}</strong>
            </p>

            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-inner flex justify-center">
              <img
                src={getVietQrUrl(selectedItem)}
                alt="VietQR Chuyển khoản"
                className="w-56 h-auto rounded-xl"
              />
            </div>

            <div className="text-xs text-slate-500 space-y-0.5 text-left bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
              <p>Ngân hàng: <strong>{selectedItem.bankInfo?.bankName}</strong></p>
              <p>STK: <strong className="font-mono">{selectedItem.bankInfo?.accountNumber}</strong></p>
              <p>Chủ TK: <strong className="uppercase">{selectedItem.bankInfo?.accountHolder}</strong></p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-xs font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false)
                  handleOpenApprove(selectedItem)
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
              >
                Đã chuyển xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

