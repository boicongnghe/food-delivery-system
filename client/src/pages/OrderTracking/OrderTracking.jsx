import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { orderApi } from '../../api/orderApi.js'
import complaintApi from '../../api/complaintApi.js'
import { connectSocket } from '../../services/socket.js'
import toast from 'react-hot-toast'
import OrderChat from '../../components/OrderChat/OrderChat.jsx'
import useAuth from '../../hooks/useAuth.js'

// Quán nhận đơn -> shipper nhận đơn -> bếp mới nấu (server: docs/order-flow.md)
const STATUS_STEPS = [
  { key: 'pending', label: 'Chờ quán xác nhận', icon: '📝' },
  { key: 'confirmed', label: 'Quán nhận · tìm shipper', icon: '🔎' },
  { key: 'preparing', label: 'Có shipper · đang nấu', icon: '🍳' },
  { key: 'ready_for_pickup', label: 'Món xong · chờ lấy', icon: '🥡' },
  { key: 'delivering', label: 'Đang giao hàng', icon: '🛵' },
  { key: 'delivered', label: 'Đã nhận hàng', icon: '🎉' },
]

function OrderTracking() {
  const { id } = useParams()
  const { refreshUser } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('Tôi muốn thay đổi địa chỉ hoặc món ăn')
  const [showNotReceivedModal, setShowNotReceivedModal] = useState(false)
  const [notReceivedReason, setNotReceivedReason] = useState('Shipper chưa đến giao hàng nhưng đã bấm hoàn thành')
  const [notReceivedNote, setNotReceivedNote] = useState('')
  const [submittingComplaint, setSubmittingComplaint] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const res = await orderApi.getOrderById(id)
      setOrder(res.data?.data || res.data)
    } catch (err) {
      console.error('Failed to load order', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetails()

    // Lắng nghe cập nhật realtime từ Socket.io
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      const socket = connectSocket(token)
      const handleNewNotification = (notif) => {
        if (!notif) return
        const notifOrderId = notif.order?._id || notif.order
        if (notifOrderId === id || notif.type === 'order') {
          fetchOrderDetails()
        }
      }
      socket.on('new_notification', handleNewNotification)
      return () => {
        socket.off('new_notification', handleNewNotification)
      }
    }
  }, [id])

  // Tự động kiểm tra trạng thái đơn hàng định kỳ khi đơn đang xử lý
  useEffect(() => {
    if (!order || ['delivered', 'cancelled'].includes(order.status)) return
    const interval = setInterval(() => {
      orderApi.getOrderById(id).then((res) => {
        const orderData = res.data?.data || res.data
        if (orderData) {
          setOrder(orderData)
        }
      }).catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [id, order?.status])

  // UC17: Cancel Order & Refund
  const handleCancelOrder = async () => {
    try {
      setCancelling(true)
      const res = await orderApi.cancelOrder(id, { reason: cancelReason })
      setOrder({ ...order, ...(res.data?.data || res.data) })
      setShowCancelModal(false)
      setActionMsg(res.message || res.data?.message || 'Đã hủy đơn hàng thành công')
      
      // Cập nhật số dư ví ảo trên Header ngay lập tức không cần F5
      if (typeof refreshUser === 'function') refreshUser()
      window.dispatchEvent(new CustomEvent('wallet_updated', { detail: {} }))

      fetchOrderDetails()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy đơn hàng lúc này')
    } finally {
      setCancelling(false)
    }
  }

  // UC18: Customer Receive Order (Complete)
  const handleReceiveOrder = async () => {
    try {
      const res = await orderApi.receiveOrder(id)
      setOrder({ ...order, ...(res.data?.data || res.data) })
      setActionMsg('Cảm ơn bạn! Đơn hàng đã được đánh dấu là Đã nhận hàng thành công.')
      toast.success('🎉 Cảm ơn bạn! Đơn hàng đã được đánh dấu là Đã nhận hàng thành công.')
      fetchOrderDetails()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xác nhận nhận hàng')
    }
  }

  // Báo cáo chưa nhận được hàng
  const handleReportNotReceived = async (e) => {
    e?.preventDefault()
    if (!notReceivedNote.trim() && notReceivedReason === 'Lý do khác') {
      toast.error('Vui lòng nhập thêm ghi chú chi tiết')
      return
    }
    try {
      setSubmittingComplaint(true)
      const description = `[CHƯA NHẬN ĐƯỢC HÀNG] Lý do: ${notReceivedReason}. ${notReceivedNote.trim() ? `Ghi chú: ${notReceivedNote.trim()}` : 'Khách hàng báo cáo shipper xác nhận giao hàng nhưng thực tế chưa nhận được món.'}`
      await complaintApi.createComplaint(id, {
        category: 'other',
        description,
        images: [],
      })
      toast.success('Đã gửi báo cáo chưa nhận được hàng thành công! Đội ngũ hỗ trợ sẽ kiểm tra ngay.')
      setShowNotReceivedModal(false)
      fetchOrderDetails()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi báo cáo lúc này')
    } finally {
      setSubmittingComplaint(false)
    }
  }

  if (loading && !order) {
    return (
      <div className="mx-auto w-full max-w-[1200px] text-center py-20 px-0">
        <p className="text-slate-500">Đang tải tiến trình đơn hàng...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-[1200px] text-center py-20 px-0">
        <h2>Không tìm thấy đơn hàng</h2>
        <Link to="/orders" className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-5 py-2.5 text-[0.95rem] border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500 mt-4">
          <ArrowLeft className="w-4 h-4" />
          <span>Xem danh sách đơn hàng</span>
        </Link>
      </div>
    )
  }

  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'
  const canCancel = ['pending', 'confirmed'].includes(order.status)

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status)

  return (
    <div className="mx-auto w-full px-5 animate-fade-in max-w-[860px]">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-2.5 rounded-xl bg-white dark:bg-[#181A20] border border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold shadow-xs hover:border-orange-300 dark:hover:border-orange-500/40 hover:bg-orange-50/60 dark:hover:bg-orange-950/20 hover:text-primary dark:hover:text-primary transition-all duration-200 group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-200" />
            <span>Danh sách đơn hàng</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 mb-0 mx-0 tracking-tight">
            Đơn hàng #{order.orderNumber}
          </h1>
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 inline-block">
            Đặt lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
          </span>
        </div>

        <div>
          {isCancelled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide bg-red-50 text-red-700 text-sm py-2 px-3.5">
              Đã hủy đơn
            </span>
          ) : isDelivered ? (
            <span className="inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 text-sm py-2 px-3.5">
              {order.customerConfirmedAt ? 'Đã nhận hàng thành công' : 'Shipper báo đã giao hàng'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide bg-fuchsia-50 text-fuchsia-700 text-sm py-2 px-3.5">
              {STATUS_STEPS.find((step) => step.key === order.status)?.label || 'Đang thực hiện'}
            </span>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="bg-emerald-50 text-emerald-700 rounded-xl font-semibold mb-5 py-3 px-[18px]">
          ✓ {actionMsg}
        </div>
      )}

      {/* UC18: Order Status Progress Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md mb-6">
        <h2 className="text-xl font-bold mt-0 mb-6 mx-0">
          🛵 Tiến trình đơn hàng (Live Tracking)
        </h2>

        {!isCancelled ? (
          <div>
            {/* Visual Step Bar */}
            <div className="flex justify-between relative mb-8">
              {/* Connecting line track */}
              <div className="absolute top-5 left-10 right-10 h-1 bg-slate-200 z-[1] rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-400 rounded"
                  style={{
                    width: `${currentStepIndex <= 0 ? 0 : Math.min(100, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%`,
                  }}
                />
              </div>

              {STATUS_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex
                const isCurrent = idx === currentStepIndex

                return (
                  <div
                    key={step.key}
                    className="relative z-[3] flex flex-col items-center w-20"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-[3px] text-xl transition ${isPassed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-500'} ${isCurrent ? 'ring-4 ring-orange-500/25' : ''}`}
                    >
                      {step.icon}
                    </div>
                    <span
                      className={`text-xs text-center mt-2 ${isCurrent ? 'font-extrabold' : isPassed ? 'font-semibold' : 'font-medium'} ${isCurrent ? 'text-orange-500' : isPassed ? 'text-slate-900' : 'text-slate-500'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Khi shipper đã nhấn giao hàng: Hiện nút Đã nhận được hàng và Chưa nhận được hàng (không icon) */}
            {isDelivered && (
              <div className="mt-4">
                {!order.customerConfirmedAt && !order.complaint ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      className="flex-1 inline-flex items-center justify-center font-bold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-7 py-3.5 text-base border-transparent bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 cursor-pointer"
                      onClick={handleReceiveOrder}
                    >
                      Đã nhận được hàng
                    </button>
                    <button
                      type="button"
                      className="flex-1 inline-flex items-center justify-center font-bold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-7 py-3.5 text-base border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm cursor-pointer"
                      onClick={() => setShowNotReceivedModal(true)}
                    >
                      Chưa nhận được hàng
                    </button>
                  </div>
                ) : order.customerConfirmedAt ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <div className="font-bold text-emerald-800 text-base mb-1">
                      Bạn đã xác nhận nhận hàng thành công
                    </div>
                    <p className="text-sm text-emerald-700 m-0">
                      Cảm ơn bạn đã tin tưởng đặt món! Chúc bạn có một bữa ăn ngon miệng.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <div className="font-bold text-amber-800 text-base mb-1">
                      Đã ghi nhận báo cáo: Chưa nhận được hàng
                    </div>
                    <p className="text-sm text-amber-700 m-0">
                      Hệ thống đang kiểm tra với shipper để hỗ trợ bạn sớm nhất.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Cancel Action Button (UC17) - Nút hủy đơn to ra khi có thể hủy */}
            {canCancel && !isCancelled && (
              <div className="mt-5">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center font-bold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-7 py-3.5 text-base border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm cursor-pointer"
                  onClick={() => setShowCancelModal(true)}
                >
                  Hủy đơn hàng này
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Cancelled & Refund Notice (UC17) */
          <div className="bg-red-50 border border-[rgba(239,68,68,0.2)] rounded-xl text-center p-5">
            <h3 className="text-red-500 text-lg mt-0 mb-1.5 mx-0">
              Đơn hàng này đã bị hủy
            </h3>
            <p className="text-sm text-red-800 mt-0 mb-3 mx-0">
              Lý do: <strong>{order.cancelReason || 'Không có lý do cụ thể'}</strong>
            </p>

            {/* Refund Info */}
            {(() => {
              const refundAmount = order.refund?.amount || order.refundAmount || order.payment?.refundAmount || order.total || order.totalPrice || 0;
              const isRefunded = order.refundStatus === 'refunded' || order.refund?.status === 'succeeded' || order.payment?.status === 'refunded';
              const isRefundPending = order.refundStatus === 'pending' || order.refund?.status === 'pending';

              if (isRefunded) {
                return (
                  <div className="bg-green-50 border border-[#86efac] rounded-lg inline-block text-[#166534] font-semibold text-base text-center max-w-[520px] my-0 mx-auto py-3.5 px-[18px]">
                    <div className="flex items-center justify-center gap-2 font-bold text-base text-green-700 mb-1.5">
                      <span>💰</span>
                      <span>Hoàn tiền thành công</span>
                    </div>
                    <p className="text-sm text-[#166534] leading-normal mt-0 mb-3 mx-0">
                      Đã hoàn lại <strong>{refundAmount.toLocaleString('vi-VN')}đ</strong> vào <strong>Ví ảo</strong> của bạn. Bạn có thể kiểm tra số dư hoặc yêu cầu rút về tài khoản ngân hàng bất kỳ lúc nào.
                    </p>
                    <Link
                      to="/wallet"
                      className="inline-flex items-center gap-1.5 bg-green-600 text-white rounded-lg text-sm font-bold no-underline shadow-[0_2px_4px_rgba(22,163,74,0.2)] py-[7px] px-4"
                    >
                      <span>👛</span> Xem số dư Ví ảo & Rút tiền ➔
                    </Link>
                  </div>
                );
              }

              if (isRefundPending) {
                return (
                  <div className="bg-white border border-amber-500 rounded-lg inline-block text-amber-800 font-bold text-base py-3 px-4">
                    ⏳ Trạng thái hoàn tiền: Đang xử lý hoàn {refundAmount.toLocaleString('vi-VN')}đ vào ví ảo của bạn.
                  </div>
                );
              }

              return (
                <div className="text-sm text-slate-500">
                  Đơn hàng chưa thanh toán - Chưa phát sinh chi phí.
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {order.shipper && !isCancelled && (
        <div className="mb-6">
          <OrderChat
            orderId={order._id}
            status={order.status}
            otherPartyLabel="shipper"
          />
        </div>
      )}

      {isDelivered && order.deliveryProof?.imageUrl && (
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-slate-900">Ảnh chứng minh giao hàng</h2>
          <img
            className="max-h-[480px] w-full rounded-xl object-contain"
            src={order.deliveryProof.imageUrl}
            alt={`Ảnh chứng minh đơn hàng ${order.orderNumber} đã được giao`}
          />
          {order.deliveryProof.confirmedAt && (
            <p className="mt-2 text-sm text-slate-500">
              Xác nhận giao lúc {new Date(order.deliveryProof.confirmedAt).toLocaleString('vi-VN')}
            </p>
          )}
        </section>
      )}

      {/* Order Details & Items Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md mb-6">
        <h2 className="text-xl font-bold mt-0 mb-4 mx-0">
          🍽️ Chi tiết món ăn
        </h2>

        <div className="flex flex-col gap-3 mb-5">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div>
                <span className="font-bold">{item.quantity}x</span> {item.name}
                {item.options?.length > 0 && (
                  <span className="text-xs text-slate-500 block">
                    + Topping: {item.options.map((opt) => `${opt.name}${opt.quantity > 1 ? ` x${opt.quantity}` : ''}`).join(', ')}
                  </span>
                )}
                {item.note && (
                  <span className="text-xs text-slate-500 block">
                    ({item.note})
                  </span>
                )}
              </div>
              <span className="font-semibold">
                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 flex flex-col gap-2 text-sm pt-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Tạm tính:</span>
            <span>{order.subtotal?.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              Phí vận chuyển {order.distanceKm ? `(${order.distanceKm} km)` : ''}:
            </span>
            <span>{order.shippingFee?.toLocaleString('vi-VN')}đ</span>
          </div>
          {order.promotion?.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-500 font-bold">
              <span>Voucher ({order.promotion.code}):</span>
              <span>-{order.promotion.discountAmount.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-slate-200 text-xl font-extrabold mt-1.5 pt-3">
            <span>Tổng thanh toán:</span>
            <span className="text-orange-500">{order.totalPrice?.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      </div>

      {/* Delivery & Payment Info */}
      <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-5 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <h3 className="text-base font-bold mt-0 mb-2.5 mx-0">
            📍 Địa chỉ nhận hàng
          </h3>
          <p className="font-semibold mt-0 mb-1 mx-0">
            {order.deliveryAddress?.recipientName} ({order.deliveryAddress?.phone})
          </p>
          <p className="text-sm text-slate-500 m-0">
            {order.deliveryAddress?.addressLine}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <h3 className="text-base font-bold mt-0 mb-2.5 mx-0">
            💳 Thông tin thanh toán
          </h3>
          <p className="text-sm mt-0 mb-1 mx-0">
            Phương thức: <strong>{order.paymentMethod === 'wallet' ? 'Ví ảo FoodDelivery' : order.paymentMethod === 'banking' ? 'Chuyển khoản Ngân hàng (VietQR)' : order.paymentMethod?.toUpperCase()}</strong>
          </p>
          <p className="text-sm m-0">
            Trạng thái:{' '}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : order.paymentStatus === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              {order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentStatus === 'failed' ? 'Thanh toán lỗi' : 'Chờ thanh toán'}
            </span>
          </p>
        </div>
      </div>

      {/* UC17: Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-sm animate-fade-in flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md max-w-[480px] w-[90%] animate-fade-in">
            <h3 className="text-xl font-extrabold mt-0 mb-3 mx-0">
              Xác nhận hủy đơn hàng?
            </h3>
            <p className="text-sm text-slate-500 mt-0 mb-4 mx-0">
              {order.paymentStatus === 'paid'
                ? 'Đơn hàng này đã được thanh toán. Sau khi hủy, hệ thống sẽ tự động kích hoạt quy trình hoàn tiền cho bạn.'
                : 'Bạn có chắc chắn muốn hủy đơn hàng này không?'}
            </p>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">Chọn lý do hủy:</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[0.95rem] text-slate-900 outline-none transition focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/25"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="Tôi muốn thay đổi địa chỉ hoặc món ăn">Tôi muốn thay đổi địa chỉ hoặc món ăn</option>
                <option value="Thời gian giao hàng dự kiến quá lâu">Thời gian giao hàng dự kiến quá lâu</option>
                <option value="Tôi đặt nhầm món">Tôi đặt nhầm món</option>
                <option value="Lý do cá nhân khác">Lý do cá nhân khác</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end mt-5">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-slate-200 bg-white text-slate-900 hover:border-slate-500 hover:bg-slate-50 cursor-pointer"
                onClick={() => setShowCancelModal(false)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-transparent bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                disabled={cancelling}
                onClick={handleCancelOrder}
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo cáo Chưa nhận được hàng */}
      {showNotReceivedModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-w-[500px] w-full animate-fade-in">
            <h3 className="text-xl font-extrabold text-slate-900 mt-0 mb-2">
              Báo cáo chưa nhận được hàng
            </h3>
            <p className="text-sm text-slate-500 mt-0 mb-4">
              Shipper đã đánh dấu giao hàng nhưng bạn vẫn chưa nhận được món? Vui lòng chọn lý do để hệ thống đối soát và hỗ trợ bạn ngay lập tức.
            </p>

            <form onSubmit={handleReportNotReceived} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Lý do:
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  value={notReceivedReason}
                  onChange={(e) => setNotReceivedReason(e.target.value)}
                >
                  <option value="Shipper chưa đến giao hàng nhưng đã bấm hoàn thành">Shipper chưa đến giao hàng nhưng đã bấm hoàn thành</option>
                  <option value="Shipper giao nhầm địa chỉ hoặc không thấy đồ">Shipper giao nhầm địa chỉ hoặc không thấy đồ</option>
                  <option value="Không thể liên lạc được với shipper">Không thể liên lạc được với shipper</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Ghi chú chi tiết (nếu có):
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none h-24"
                  placeholder="Ví dụ: Tôi kiểm tra cửa và gọi shipper nhiều lần nhưng không được..."
                  value={notReceivedNote}
                  onChange={(e) => setNotReceivedNote(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center font-semibold rounded-xl px-4 py-2 text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => setShowNotReceivedModal(false)}
                  disabled={submittingComplaint}
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center font-semibold rounded-xl px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 cursor-pointer"
                  disabled={submittingComplaint}
                >
                  {submittingComplaint ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderTracking
