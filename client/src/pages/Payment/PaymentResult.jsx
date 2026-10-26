import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { orderApi } from '../../api/orderApi.js'
import { paymentApi } from '../../api/paymentApi.js'

function PaymentResult() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [qrInfo, setQrInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('pending') // pending, success, failed
  const [failureReason, setFailureReason] = useState('')
  const [transactionCode, setTransactionCode] = useState('')
  const [copiedField, setCopiedField] = useState(null)

  const pollingRef = useRef(null)

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
          ord = orderRes.data.data
          setOrder(ord)
        } catch (e) {
          console.error('Error fetching order', e)
        }

        try {
          const qrRes = await paymentApi.getPaymentQrInfo(orderId)
          qr = qrRes.data.data
          setQrInfo(qr)
        } catch (e) {
          console.error('Error fetching qr info', e)
        }

        // Fallback: Nếu API qr có trục trặc nhưng có đơn hàng, tự sinh VietQR ngay tại client
        if (ord && !qr) {
          const bankId = 'TPB'
          const accountNo = '0393863658'
          const accountName = 'DO MANH DUONG'
          const amount = ord.totalPrice
          const transferContent = ord.orderNumber
          const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`
          const fallbackQr = {
            orderId: ord._id,
            orderNumber: ord.orderNumber,
            amount,
            bankId,
            accountNo,
            accountName,
            transferContent,
            qrUrl,
            paymentStatus: ord.paymentStatus,
          }
          setQrInfo(fallbackQr)
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

  // Nút kiểm tra thủ công
  const handleManualCheck = async () => {
    try {
      setCheckingStatus(true)
      const res = await paymentApi.checkPaymentStatus(orderId)
      if (res.data?.data?.paymentStatus === 'paid') {
        setPaymentStatus('success')
      } else {
        alert('Hệ thống chưa nhận được thông báo tiền vào tài khoản. Nếu bạn vừa chuyển khoản, vui lòng đợi 10 - 30 giây để ngân hàng gửi thông báo!')
      }
    } catch {
      alert('Không thể kiểm tra trạng thái lúc này')
    } finally {
      setCheckingStatus(false)
    }
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
      alert(err.response?.data?.message || 'Giả lập tiền vào tài khoản thất bại')
    } finally {
      setProcessing(false)
    }
  }

  // Giả lập lỗi thanh toán (UC16)
  const handleSimulateFailure = async () => {
    try {
      setProcessing(true)
      const res = await paymentApi.processPayment(orderId, {
        paymentMethod: 'banking',
        simulateFailure: true,
      })
      const data = res.data.data
      setPaymentStatus('failed')
      setFailureReason(data.failureReason || 'Giao dịch bị từ chối từ ngân hàng')
    } catch (err) {
      setPaymentStatus('failed')
      setFailureReason(err.response?.data?.message || 'Giao dịch bị từ chối')
    } finally {
      setProcessing(false)
    }
  }

  // Thử lại thanh toán
  const handleRetryPayment = () => {
    setPaymentStatus('pending')
  }

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Đang tạo mã VietQR thanh toán cho đơn hàng...</p>
      </div>
    )
  }

  if (!order || !qrInfo) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <h2>Không tìm thấy đơn hàng</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
          Về trang chủ
        </Link>
      </div>
    )
  }

  return (
    <div className="container animate-fade-in" style={{ maxWidth: 680, paddingBottom: 60 }}>
      {/* 1. Màn hình THANH TOÁN THÀNH CÔNG */}
      {paymentStatus === 'success' && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'var(--secondary-light)',
            color: 'var(--secondary)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            marginBottom: 20,
          }}>
            ✓
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: '1.8rem', fontWeight: 800, color: '#065f46' }}>
            Tài khoản đã nhận tiền thành công!
          </h1>
          <p style={{ margin: '0 0 24px', color: 'var(--text-muted)' }}>
            Hệ thống đã xác nhận số tiền chuyển khoản của đơn hàng <strong>{order.orderNumber}</strong>. Đơn hàng đang được gửi đến nhà hàng để chuẩn bị.
          </p>

          <div style={{
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            marginBottom: 28,
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.92rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mã giao dịch / Mã đơn:</span>
              <span style={{ fontWeight: 700 }}>{transactionCode || order.orderNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.92rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Phương thức:</span>
              <span style={{ fontWeight: 700 }}>Chuyển khoản Ngân hàng (VietQR)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
              <span>Số tiền đã nhận:</span>
              <span style={{ color: 'var(--primary)' }}>{order.totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to={`/orders/${order._id}`} className="btn btn-primary btn-lg">
              Theo dõi đơn hàng (Order Tracking) ➔
            </Link>
            <Link to="/" className="btn btn-secondary">
              Về trang chủ
            </Link>
          </div>
        </div>
      )}

      {/* 2. Màn hình THANH TOÁN THẤT BẠI (UC16) */}
      {paymentStatus === 'failed' && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            marginBottom: 20,
          }}>
            ✕
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)' }}>
            Thanh toán không thành công!
          </h1>
          <p style={{ margin: '0 0 20px', color: 'var(--text-muted)' }}>
            {failureReason || 'Giao dịch qua ngân hàng bị từ chối hoặc hết thời gian chờ.'}
          </p>

          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: 28,
            fontSize: '0.9rem',
            color: '#991b1b',
          }}>
            Đơn hàng <strong>{order.orderNumber}</strong> của bạn vẫn được lưu lại. Bạn có thể bấm nút bên dưới để quét lại mã VietQR.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={processing}
              onClick={handleRetryPayment}
            >
              Quay lại quét mã VietQR để thanh toán
            </button>

            <Link
              to={`/orders/${order._id}`}
              style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 12 }}
            >
              Xem chi tiết đơn hàng
            </Link>
          </div>
        </div>
      )}

      {/* 3. Màn hình CHỜ QUÉT MÃ VIETQR VÀ TỰ ĐỘNG DUYỆT KHI TIỀN VỀ */}
      {paymentStatus === 'pending' && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span className="badge badge-pending" style={{ marginBottom: 8 }}>
              Đang chờ chuyển khoản
            </span>
            <h1 style={{ margin: '6px 0', fontSize: '1.6rem', fontWeight: 800 }}>
              Quét mã VietQR để thanh toán
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Mở app ngân hàng bất kỳ để quét mã. Số tiền và nội dung sẽ được điền tự động.
            </p>
          </div>

          {/* Khung chứa mã QR VietQR động */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 20px',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            <div style={{
              display: 'inline-block',
              background: '#ffffff',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              marginBottom: 16,
            }}>
              <img
                src={qrInfo.qrUrl}
                alt="VietQR Payment"
                style={{ width: 220, height: 220, display: 'block', margin: '0 auto' }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: '0.88rem',
              color: '#059669',
              fontWeight: 600,
              marginBottom: 16,
            }}>
              <span style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)',
                animation: 'pulse 1.5s infinite',
              }} />
              Hệ thống đang tự động lắng nghe tiền vào tài khoản...
            </div>

            {/* Bảng chi tiết chuyển khoản thủ công nếu không quét được QR */}
            <div style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              border: '1px solid var(--border)',
              textAlign: 'left',
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ngân hàng thụ hưởng:</span>
                <span style={{ fontWeight: 700 }}>{qrInfo.bankId}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Chủ tài khoản:</span>
                <span style={{ fontWeight: 700 }}>{qrInfo.accountName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Số tài khoản:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>
                    {qrInfo.accountNo}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(qrInfo.accountNo, 'accountNo')}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    {copiedField === 'accountNo' ? '✓ Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Số tiền cần chuyển:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                    {order.totalPrice.toLocaleString('vi-VN')}đ
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.totalPrice, 'amount')}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    {copiedField === 'amount' ? '✓ Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 8,
                borderTop: '1px dashed var(--border)',
                background: '#fffbeb',
                margin: '4px -16px -16px',
                padding: '12px 16px',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>
                    Nội dung chuyển khoản (bắt buộc chính xác):
                  </div>
                  <div style={{ fontWeight: 800, color: '#92400e', fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                    {qrInfo.transferContent}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(qrInfo.transferContent, 'content')}
                  className="btn btn-sm"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    background: '#fef3c7',
                    border: '1px solid #f59e0b',
                    color: '#b45309',
                    fontWeight: 700,
                  }}
                >
                  {copiedField === 'content' ? '✓ Đã chép' : 'Sao chép nội dung'}
                </button>
              </div>
            </div>
          </div>

          {/* Nút hỗ trợ người dùng */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={checkingStatus}
              onClick={handleManualCheck}
            >
              {checkingStatus ? 'Đang kiểm tra giao dịch...' : '🔄 Tôi đã chuyển tiền (Kiểm tra ngay)'}
            </button>

            {/* Khung Test công cụ Dev / Chấm điểm đồ án */}
            <div style={{
              marginTop: 12,
              padding: '16px',
              border: '1px dashed #cbd5e1',
              borderRadius: 'var(--radius-md)',
              background: '#f8fafc',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
                ⚡ Công cụ kiểm thử SePay Webhook (Dành cho demo localhost):
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={processing}
                  onClick={handleSimulateReceiveMoney}
                  title="Giả lập sự kiện SePay webhook gửi báo có số tiền về tài khoản ngân hàng"
                >
                  {processing ? 'Đang gửi sự kiện...' : '⚡ Bắn Webhook: Tiền đã vào tài khoản'}
                </button>

                <button
                  type="button"
                  className="btn btn-danger-outline btn-sm"
                  disabled={processing}
                  onClick={handleSimulateFailure}
                  title="Test kịch bản thất bại UC16"
                >
                  ⚠️ Test UC16: Báo thất bại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentResult
