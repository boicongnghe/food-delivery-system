import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { orderApi } from '../../api/orderApi.js'

const STATUS_STEPS = [
  { key: 'pending', label: 'Chờ xác nhận', icon: '📝' },
  { key: 'confirmed', label: 'Quán xác nhận', icon: '👨‍🍳' },
  { key: 'preparing', label: 'Đang chuẩn bị', icon: '🍳' },
  { key: 'delivering', label: 'Đang giao hàng', icon: '🛵' },
  { key: 'delivered', label: 'Đã nhận hàng', icon: '🎉' },
]

function OrderTracking() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('Tôi muốn thay đổi địa chỉ hoặc món ăn')
  const [actionMsg, setActionMsg] = useState('')

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const res = await orderApi.getOrderById(id)
      setOrder(res.data.data)
    } catch (err) {
      console.error('Failed to load order', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetails()
  }, [id])

  // UC17: Cancel Order & Refund
  const handleCancelOrder = async () => {
    try {
      setCancelling(true)
      const res = await orderApi.cancelOrder(id, { reason: cancelReason })
      setOrder({ ...order, ...res.data.data })
      setShowCancelModal(false)
      setActionMsg(res.data.message || 'Đã hủy đơn hàng thành công')
      fetchOrderDetails()
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể hủy đơn hàng lúc này')
    } finally {
      setCancelling(false)
    }
  }

  // UC18: Customer Receive Order (Complete)
  const handleReceiveOrder = async () => {
    try {
      const res = await orderApi.receiveOrder(id)
      setOrder({ ...order, ...res.data.data })
      setActionMsg('Cảm ơn bạn! Đơn hàng đã được đánh dấu là Đã nhận hàng thành công.')
      fetchOrderDetails()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xác nhận nhận hàng')
    }
  }

  // Helper for demo simulation: Advance status
  const handleProgressDemo = async (nextStatus) => {
    try {
      await orderApi.progressOrder(id, { status: nextStatus })
      fetchOrderDetails()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật tiến độ')
    }
  }

  if (loading && !order) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Đang tải tiến trình đơn hàng...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <h2>Không tìm thấy đơn hàng</h2>
        <Link to="/orders" className="btn btn-primary" style={{ marginTop: 16 }}>
          Xem danh sách đơn hàng
        </Link>
      </div>
    )
  }

  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'
  const canCancel = ['pending', 'confirmed'].includes(order.status)

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status)

  return (
    <div className="container animate-fade-in" style={{ maxWidth: 860 }}>
      {/* Back button & Title */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link to="/orders" style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>
            ← Danh sách đơn hàng
          </Link>
          <h1 style={{ margin: '6px 0 0', fontSize: '1.8rem', fontWeight: 800 }}>
            Đơn hàng #{order.orderNumber}
          </h1>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Đặt lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
          </span>
        </div>

        <div>
          {isCancelled ? (
            <span className="badge badge-cancelled" style={{ fontSize: '0.9rem', padding: '8px 14px' }}>
              Đã hủy đơn
            </span>
          ) : isDelivered ? (
            <span className="badge badge-delivered" style={{ fontSize: '0.9rem', padding: '8px 14px' }}>
              Đã giao thành công
            </span>
          ) : (
            <span className="badge badge-preparing" style={{ fontSize: '0.9rem', padding: '8px 14px' }}>
              Đang thực hiện ({order.status})
            </span>
          )}
        </div>
      </div>

      {actionMsg && (
        <div style={{
          padding: '12px 18px',
          background: 'var(--secondary-light)',
          color: '#047857',
          borderRadius: 'var(--radius-md)',
          marginBottom: 20,
          fontWeight: 600,
        }}>
          ✓ {actionMsg}
        </div>
      )}

      {/* UC18: Order Status Progress Timeline */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '1.2rem', fontWeight: 700 }}>
          🛵 Tiến trình đơn hàng (Live Tracking)
        </h2>

        {!isCancelled ? (
          <div>
            {/* Visual Step Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              position: 'relative',
              marginBottom: 32,
            }}>
              {/* Connecting line */}
              <div style={{
                position: 'absolute',
                top: 20,
                left: '5%',
                right: '5%',
                height: 4,
                background: 'var(--border)',
                zIndex: 1,
              }} />
              <div style={{
                position: 'absolute',
                top: 20,
                left: '5%',
                width: `${Math.max(0, currentStepIndex) * 25}%`,
                height: 4,
                background: 'var(--secondary)',
                zIndex: 2,
                transition: 'width 0.4s ease',
              }} />

              {STATUS_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex
                const isCurrent = idx === currentStepIndex

                return (
                  <div
                    key={step.key}
                    style={{
                      position: 'relative',
                      zIndex: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: 80,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: isPassed ? 'var(--secondary)' : '#ffffff',
                        border: `3px solid ${isPassed ? 'var(--secondary)' : 'var(--border)'}`,
                        color: isPassed ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        boxShadow: isCurrent ? '0 0 0 4px var(--primary-glow)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {step.icon}
                    </div>
                    <span
                      style={{
                        marginTop: 8,
                        fontSize: '0.8rem',
                        fontWeight: isCurrent ? 800 : isPassed ? 600 : 500,
                        color: isCurrent ? 'var(--primary)' : isPassed ? 'var(--text-main)' : 'var(--text-muted)',
                        textAlign: 'center',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Quick Demo Advancement Bar for Professor/Testing */}
            <div style={{
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ⚡ Nút điều khiển tiến trình (Demo):
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleProgressDemo('confirmed')}
                  disabled={order.status !== 'pending'}
                >
                  Quán nhận đơn
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleProgressDemo('preparing')}
                  disabled={order.status !== 'confirmed'}
                >
                  Đang nấu
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleProgressDemo('delivering')}
                  disabled={order.status !== 'preparing'}
                >
                  Shipper giao
                </button>
              </div>
            </div>

            {/* Customer Completion Button (UC18: Complete Order) */}
            {!isDelivered && (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginBottom: 12 }}
                onClick={handleReceiveOrder}
              >
                ✅ Tôi đã nhận được hàng (Xác nhận hoàn thành)
              </button>
            )}
          </div>
        ) : (
          /* Cancelled & Refund Notice (UC17) */
          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'center',
          }}>
            <h3 style={{ margin: '0 0 6px', color: 'var(--danger)', fontSize: '1.15rem' }}>
              Đơn hàng này đã bị hủy
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#991b1b' }}>
              Lý do: <strong>{order.cancelReason || 'Không có lý do cụ thể'}</strong>
            </p>

            {/* Refund Info */}
            {order.refundStatus === 'refunded' ? (
              <div style={{
                background: '#ffffff',
                border: '1px solid var(--secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'inline-block',
                color: '#065f46',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}>
                💰 Trạng thái hoàn tiền: Đã hoàn lại {order.refundAmount?.toLocaleString('vi-VN')}đ về tài khoản ngân hàng của bạn.
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Đơn hàng chưa thanh toán - Chưa phát sinh chi phí.
              </div>
            )}
          </div>
        )}

        {/* Cancel Action Button (UC17) */}
        {canCancel && !isCancelled && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-danger-outline btn-sm"
              onClick={() => setShowCancelModal(true)}
            >
              Hủy đơn hàng này
            </button>
          </div>
        )}
      </div>

      {/* Order Details & Items Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 700 }}>
          🍽️ Chi tiết món ăn
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {order.items?.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 700 }}>{item.quantity}x</span> {item.name}
                {item.note && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                    ({item.note})
                  </span>
                )}
              </div>
              <span style={{ fontWeight: 600 }}>
                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
              </span>
            </div>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontSize: '0.92rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tạm tính:</span>
            <span>{order.subtotal?.toLocaleString('vi-VN')}đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Phí vận chuyển:</span>
            <span>{order.shippingFee?.toLocaleString('vi-VN')}đ</span>
          </div>
          {order.promotion?.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary)', fontWeight: 700 }}>
              <span>Voucher ({order.promotion.code}):</span>
              <span>-{order.promotion.discountAmount.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 12,
            marginTop: 6,
            borderTop: '2px solid var(--border)',
            fontSize: '1.2rem',
            fontWeight: 800,
          }}>
            <span>Tổng thanh toán:</span>
            <span style={{ color: 'var(--primary)' }}>{order.totalPrice?.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      </div>

      {/* Delivery & Payment Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginBottom: 32,
      }}>
        <div className="card">
          <h3 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 700 }}>
            📍 Địa chỉ nhận hàng
          </h3>
          <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
            {order.deliveryAddress?.recipientName} ({order.deliveryAddress?.phone})
          </p>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            {order.deliveryAddress?.addressLine}
          </p>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 700 }}>
            💳 Thông tin thanh toán
          </h3>
          <p style={{ margin: '0 0 4px', fontSize: '0.9rem' }}>
            Phương thức: <strong>{order.paymentMethod === 'banking' ? 'Chuyển khoản Ngân hàng (VietQR)' : order.paymentMethod?.toUpperCase()}</strong>
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Trạng thái:{' '}
            <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-paid' : order.paymentStatus === 'failed' ? 'badge-failed' : 'badge-pending'}`}>
              {order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentStatus === 'failed' ? 'Thanh toán lỗi' : 'Chờ thanh toán'}
            </span>
          </p>
        </div>
      </div>

      {/* UC17: Cancel Modal */}
      {showCancelModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: 480, width: '90%', animation: 'fadeIn 0.2s ease' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.3rem', fontWeight: 800 }}>
              Xác nhận hủy đơn hàng?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {order.paymentStatus === 'paid'
                ? 'Đơn hàng này đã được thanh toán. Sau khi hủy, hệ thống sẽ tự động kích hoạt quy trình hoàn tiền cho bạn.'
                : 'Bạn có chắc chắn muốn hủy đơn hàng này không?'}
            </p>

            <div className="form-group">
              <label className="form-label">Chọn lý do hủy:</label>
              <select
                className="form-select"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="Tôi muốn thay đổi địa chỉ hoặc món ăn">Tôi muốn thay đổi địa chỉ hoặc món ăn</option>
                <option value="Thời gian giao hàng dự kiến quá lâu">Thời gian giao hàng dự kiến quá lâu</option>
                <option value="Tôi đặt nhầm món">Tôi đặt nhầm món</option>
                <option value="Lý do cá nhân khác">Lý do cá nhân khác</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCancelModal(false)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={cancelling}
                onClick={handleCancelOrder}
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderTracking
