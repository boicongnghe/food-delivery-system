import { useState } from 'react'
import { X, QrCode, Copy, Check, ArrowRight, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import walletApi from '../../../api/walletApi.js'
import { paymentApi } from '../../../api/paymentApi.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000]

export default function CustomerDepositModal({ isOpen, onClose, onDone }) {
  const [step, setStep] = useState(1) // 1: Select amount, 2: Show QR & Confirm
  const [amount, setAmount] = useState(100000)
  const [customAmountStr, setCustomAmountStr] = useState('100000')
  const [depositData, setDepositData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [copiedField, setCopiedField] = useState(null)

  if (!isOpen) return null

  const handleCopy = (text, field) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('Đã sao chép vào bộ nhớ tạm')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSelectPreset = (val) => {
    setAmount(val)
    setCustomAmountStr(val.toString())
  }

  const handleCustomChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    setCustomAmountStr(raw)
    const val = Number(raw) || 0
    setAmount(val)
  }

  const handleCreateQr = async () => {
    if (amount < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000đ')
      return
    }
    if (amount > 50000000) {
      toast.error('Số tiền nạp tối đa mỗi lần là 50.000.000đ')
      return
    }

    try {
      setLoading(true)
      const res = await walletApi.createDeposit({ amount })
      if (res.success && res.data) {
        setDepositData(res.data)
        setStep(2)
      } else {
        toast.error(res.message || 'Không thể tạo mã VietQR')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo mã nạp tiền')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDeposit = async () => {
    if (!depositData) return
    try {
      setConfirming(true)
      // Bắn webhook SePay chuẩn hóa xử lý biến động số dư thực tế
      const res = await paymentApi.simulateWebhook({
        depositCode: depositData.depositCode,
        content: depositData.transferContent,
        amount: depositData.amount,
        transferAmount: depositData.amount,
      })

      const responseData = res.data?.data || res.data
      if (res.data?.success || res.success) {
        toast.success(`Webhook bắn thành công! Đã nạp ${formatCurrency(depositData.amount)} vào ví! 🎉`)
        if (typeof onDone === 'function') {
          onDone()
        }
        handleClose()
      } else {
        toast.error(responseData?.message || res.message || 'Xác nhận nạp tiền thất bại')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi gửi webhook nạp tiền')
    } finally {
      setConfirming(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setDepositData(null)
    setAmount(100000)
    setCustomAmountStr('100000')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {step === 1 ? 'Nạp tiền vào Ví FoodDelivery' : 'Quét mã VietQR chuyển khoản'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 1 ? 'Chọn số tiền bạn muốn nạp vào ví' : 'Sử dụng App ngân hàng để quét mã thanh toán'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {step === 1 ? (
            <div className="space-y-5">
              {/* Preset buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Mệnh giá phổ biến
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PRESET_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectPreset(val)}
                      className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                        amount === val
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {formatCurrency(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Hoặc nhập số tiền tùy ý
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customAmountStr ? Number(customAmountStr).toLocaleString('vi-VN') : ''}
                    onChange={handleCustomChange}
                    placeholder="Tối thiểu 10.000đ"
                    className="w-full px-4 py-3 text-lg font-black rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  * Tối thiểu 10.000đ, tối đa 50.000.000đ mỗi lần nạp.
                </p>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={handleCreateQr}
                disabled={loading || amount < 10000}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang tạo mã VietQR...</span>
                  </>
                ) : (
                  <>
                    <span>Tạo mã QR nạp {formatCurrency(amount)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#1E2028] rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <img
                    src={depositData?.qrUrl}
                    alt="VietQR nạp tiền"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 text-center font-medium">
                  Mở ứng dụng ngân hàng và quét mã QR trên để nạp tiền tự động
                </p>
              </div>

              {/* Bank Details */}
              <div className="space-y-2 text-xs bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400">Ngân hàng:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{depositData?.bankId}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400">Chủ tài khoản:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{depositData?.accountName}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-500 dark:text-slate-400">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                      {depositData?.accountNo}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(depositData?.accountNo, 'accountNo')}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedField === 'accountNo' ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400">Số tiền:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(depositData?.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(depositData?.amount), 'amount')}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedField === 'amount' ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-500 dark:text-slate-400">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                      {depositData?.transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(depositData?.transferContent, 'content')}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedField === 'content' ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={confirming}
                  className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Đổi số tiền</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeposit}
                  disabled={confirming}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi sự kiện Webhook...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Bắn Webhook: Tiền đã vào tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

