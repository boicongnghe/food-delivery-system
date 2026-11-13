import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { orderApi } from '../../api/orderApi.js'
import { paymentApi } from '../../api/paymentApi.js'
import toast from 'react-hot-toast'

function PaymentResult() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [qrInfo, setQrInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('pending') // pending, success, failed
  const [failureReason, setFailureReason] = useState('')
  const [transactionCode, setTransactionCode] = useState('')
  const [copiedField, setCopiedField] = useState(null)
  const [timeLeft, setTimeLeft] = useState(600) // 10 phút = 600 giây

  const pollingRef = useRef(null)

  // Đếm ngược 10 phút chuyển khoản
  useEffect(() => {
    if (paymentStatus !== 'pending') return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setPaymentStatus('failed')
          setFailureReason('Hết thời gian chờ thanh toán (10 phút). Vui lòng quét lại mã hoặc đặt lại.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentStatus])

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 1. Tải thông tin đơn hàng và mã VietQR động từ server
  useEffect(() => {
    if (!orderId) {
      navigate('/')
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        let ord = null
        let qr = null

        try {
          const orderRes = await orderApi.getOrderById(orderId)
          ord = orderRes.data?.data || orderRes.data
          setOrder(ord)
        } catch (e) {
          console.error('Error fetching order', e)
        }

        try {
          const qrRes = await paymentApi.getPaymentQrInfo(orderId)
          qr = qrRes.data?.data
          setQrInfo(qr)
        } catch (e) {
          console.error('Error fetching qr info from server', e)
        }

        if (ord?.paymentStatus === 'paid') {
          setPaymentStatus('success')
        } else if (ord?.paymentStatus === 'failed') {
          setPaymentStatus('failed')
        }
      } catch (err) {
        console.error('Failed to load payment info', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [orderId, navigate])

  // 2. Lắng nghe tự động: Polling định kỳ kiểm tra biến động số dư ngân hàng qua SePay webhook
  useEffect(() => {
    if (paymentStatus !== 'pending' || !orderId) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await paymentApi.checkPaymentStatus(orderId)
        if (res.data?.data?.paymentStatus === 'paid') {
          setPaymentStatus('success')
          clearInterval(pollingRef.current)
        }
      } catch {
        // bỏ qua lỗi tạm thời khi polling
      }
    }, 2500)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [orderId, paymentStatus])

  // Hàm sao chép thông tin
  const handleCopy = (text, fieldName) => {
    if (!text) return
    navigator.clipboard.writeText(String(text))
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Giả lập webhook SePay nhận tiền thành công (hỗ trợ test localhost)
  const handleSimulateReceiveMoney = async () => {
    try {
      setProcessing(true)
      const res = await paymentApi.simulateWebhook({ orderId })
      if (res.data?.success) {
        setPaymentStatus('success')
        setTransactionCode(res.data.data?.payment?.transactionCode || 'SIM-SEPAY-SUCCESS')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Giả lập tiền vào tài khoản thất bại')
    } finally {
      setProcessing(false)
    }
  }

  // Thử lại thanh toán
  const handleRetryPayment = () => {
    setPaymentStatus('pending')
    setTimeLeft(600)
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] text-center py-20 px-0">
        <p className="text-slate-500">Đang tạo mã VietQR thanh toán cho đơn hàng...</p>
      </div>
    )
  }

  if (!order || !qrInfo) {
    return (
      <div className="mx-auto w-full max-w-[1200px] text-center py-20 px-0">
        <h2>Không tìm thấy đơn hàng</h2>
        <Link to="/" className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-5 py-2.5 text-[0.95rem] border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500 mt-4">
          Về trang chủ
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full animate-fade-in max-w-[680px] pb-[60px]">
      {/* 1. Màn hình THANH TOÁN THÀNH CÔNG */}
      {paymentStatus === 'success' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md text-center py-12 px-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full inline-flex items-center justify-center text-[2.5rem] mb-5">
            ✓
          </div>
          <h1 className="text-3xl font-extrabold text-emerald-800 mt-0 mb-2.5 mx-0">
            Tài khoản đã nhận tiền thành công!
          </h1>
          <p className="text-slate-500 mt-0 mb-6 mx-0">
            Hệ thống đã xác nhận số tiền chuyển khoản của đơn hàng <strong>{order.orderNumber}</strong>. Đơn hàng đang được gửi đến nhà hàng để chuẩn bị.
          </p>

          <div className="bg-slate-50 rounded-xl text-left mb-7 p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Mã giao dịch / Mã đơn:</span>
              <span className="font-bold">{transactionCode || order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Phương thức:</span>
              <span className="font-bold">Chuyển khoản Ngân hàng (VietQR)</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold">
              <span>Số tiền đã nhận:</span>
              <span className="text-orange-500">{order.totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link to={`/orders/${order._id}`} className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-7 py-3.5 text-[1.05rem] border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500">
              Theo dõi đơn hàng (Order Tracking) ➔
            </Link>
            <Link to="/" className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-5 py-2.5 text-[0.95rem] border-slate-200 bg-white text-slate-900 hover:border-slate-500 hover:bg-slate-50">
              Về trang chủ
            </Link>
          </div>
        </div>
      )}

      {/* 2. Màn hình THANH TOÁN THẤT BẠI (UC16) */}
      {paymentStatus === 'failed' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md text-center py-12 px-8">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full inline-flex items-center justify-center text-[2.5rem] mb-5">
            ✕
          </div>
          <h1 className="text-3xl font-extrabold text-red-500 mt-0 mb-2.5 mx-0">
            Thanh toán không thành công!
          </h1>
          <p className="text-slate-500 mt-0 mb-5 mx-0">
            {failureReason || 'Giao dịch qua ngân hàng bị từ chối hoặc hết thời gian chờ.'}
          </p>

          <div className="bg-red-50 border border-[rgba(239,68,68,0.2)] rounded-xl text-sm text-red-800 mb-7 p-4">
            Đơn hàng <strong>{order.orderNumber}</strong> của bạn vẫn được lưu lại. Bạn có thể bấm nút bên dưới để quét lại mã VietQR.
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-7 py-3.5 text-[1.05rem] border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500"
              disabled={processing}
              onClick={handleRetryPayment}
            >
              Quay lại quét mã VietQR để thanh toán
            </button>

            <Link
              to={`/orders/${order._id}`}
              className="text-slate-500 text-sm mt-3"
            >
              Xem chi tiết đơn hàng
            </Link>
          </div>
        </div>
      )}

      {/* 3. Màn hình CHỜ QUÉT MÃ VIETQR VÀ TỰ ĐỘNG DUYỆT KHI TIỀN VỀ */}
      {paymentStatus === 'pending' && !qrInfo && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600 font-semibold mb-4">Đang tải thông tin thanh toán VietQR từ hệ thống...</p>
        </div>
      )}

      {paymentStatus === 'pending' && qrInfo && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="text-center mb-5">
            <div className="flex items-center justify-center flex-wrap gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-amber-50 text-amber-700">
                Đang chờ chuyển khoản
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                Thời gian còn lại: <span className="font-mono font-extrabold text-sm">{formatCountdown(timeLeft)}</span>
              </span>
            </div>
            <h1 className="text-[1.6rem] font-extrabold my-1.5 mx-0 text-slate-900">
              Quét mã VietQR để thanh toán
            </h1>
            <p className="text-slate-500 text-sm m-0">
              Mở app ngân hàng bất kỳ để quét mã. Số tiền và nội dung sẽ được điền tự động.
            </p>
          </div>

          {/* Khung chứa mã QR VietQR động */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 px-5 py-6 text-center">
            <div className="inline-block bg-white rounded-xl shadow-md mb-4 p-4">
              <img
                src={qrInfo.qrUrl}
                alt="VietQR Payment"
                className="w-[220px] h-[220px] block my-0 mx-auto"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-semibold mb-4">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] animate-pulse" />
              Hệ thống đang tự động lắng nghe tiền vào tài khoản...
            </div>

            {/* Bảng chi tiết chuyển khoản thủ công nếu không quét được QR */}
            <div className="bg-white rounded-xl border border-slate-200 text-left text-sm flex flex-col gap-2.5 p-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                <span className="font-bold">{qrInfo.bankId}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold">{qrInfo.accountName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tài khoản:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-base">
                    {qrInfo.accountNo}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(qrInfo.accountNo, 'accountNo')}
                    className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border-slate-200 bg-white text-slate-900 hover:border-slate-500 hover:bg-slate-50 text-xs py-0.5 px-2"
                  >
                    {copiedField === 'accountNo' ? '✓ Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tiền cần chuyển:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-orange-500 text-lg">
                    {order.totalPrice.toLocaleString('vi-VN')}đ
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.totalPrice, 'amount')}
                    className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border-slate-200 bg-white text-slate-900 hover:border-slate-500 hover:bg-slate-50 text-xs py-0.5 px-2"
                  >
                    {copiedField === 'amount' ? '✓ Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-dashed border-slate-200 bg-amber-50 mt-1 -mb-4 -mx-4 py-3 px-4 rounded-b-xl">
                <div>
                  <div className="text-xs text-amber-700 font-semibold">
                    Nội dung chuyển khoản (bắt buộc chính xác):
                  </div>
                  <div className="font-extrabold text-amber-800 text-base tracking-[0.5px]">
                    {qrInfo.transferContent}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(qrInfo.transferContent, 'content')}
                  className="inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg text-xs bg-amber-100 border border-amber-500 text-amber-700 font-bold py-1 px-2.5"
                >
                  {copiedField === 'content' ? '✓ Đã chép' : 'Sao chép nội dung'}
                </button>
              </div>
            </div>
          </div>

          {/* Nút Bắn Webhook xác nhận tiền đã vào tài khoản */}
          <div className="flex flex-col gap-3 mt-5">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-7 py-3.5 text-[1.05rem] border-transparent bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px active:translate-y-0 disabled:translate-y-0 disabled:bg-orange-500 w-full cursor-pointer"
              disabled={processing}
              onClick={handleSimulateReceiveMoney}
            >
              {processing ? 'Đang gửi sự kiện...' : 'Bắn Webhook: Tiền đã vào tài khoản'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentResult
