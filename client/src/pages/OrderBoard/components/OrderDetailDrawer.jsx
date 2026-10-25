import { useEffect, useState } from 'react'
import { Activity, MapPin, User, X } from 'lucide-react'
import orderApi from '../../../api/orderApi.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatClock } from '../../../utils/formatTime.js'
import { CANCELLED_BY_LABELS, ORDER_STATUS_LABELS, REJECT_REASONS } from '../constants.js'
import CustomerNote from './CustomerNote.jsx'
import OrderTimeline from './OrderTimeline.jsx'
import PaymentBadge from './PaymentBadge.jsx'

const sectionTitle = 'text-[11px] font-bold uppercase tracking-wide text-slate-600'
const reasonLabel = (reason) => REJECT_REASONS.find((item) => item.value === reason)?.label

// Right side panel with the full order (opened with the eye icon)
export default function OrderDetailDrawer({ orderId, onClose }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    orderApi
      .getOrder(orderId)
      .then((response) => {
        if (!ignore) setOrder(response.data)
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || 'Không tải được chi tiết đơn hàng')
      })
    return () => {
      ignore = true
    }
  }, [orderId])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const itemCount = order?.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col bg-cream shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-brand-soft/60 bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Chi tiết đơn hàng</p>
            {order && (
              <p className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                #{order.orderCode}
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} title="Đóng (Esc)" className="rounded p-1.5 text-slate-500 hover:bg-brand-light">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {!order && !error && (
            <div className="space-y-3">
              {[1, 2, 3].map((key) => (
                <div key={key} className="h-24 animate-pulse rounded-lg bg-brand-light" />
              ))}
            </div>
          )}

          {order && (
            <>
              <section className="space-y-1 rounded-lg border border-brand-soft/60 bg-white p-4">
                <p className={sectionTitle}>Thông tin người nhận</p>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <User className="h-4 w-4 text-brand" />
                    {order.delivery.recipientName}
                  </span>
                  <span className="font-semibold text-brand">{order.delivery.phone}</span>
                </p>
                <p className="flex items-start gap-1.5 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {order.delivery.address}
                </p>
                {order.delivery.expectedAt && (
                  <p className="text-sm text-slate-600">Hẹn giao: {formatClock(order.delivery.expectedAt)}</p>
                )}
              </section>

              <CustomerNote note={order.customerNote} label="Ghi chú của khách hàng" />

              {order.cancellation?.by && (
                <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <p className={`${sectionTitle} text-red-800`}>Thông tin hủy đơn</p>
                  <p>
                    Hủy bởi: <strong>{CANCELLED_BY_LABELS[order.cancellation.by]}</strong> lúc{' '}
                    {formatClock(order.cancellation.at)}
                  </p>
                  {(reasonLabel(order.cancellation.reason) || order.cancellation.note) && (
                    <p>
                      Lý do: {reasonLabel(order.cancellation.reason)}
                      {reasonLabel(order.cancellation.reason) && order.cancellation.note && ' – '}
                      {order.cancellation.note}
                    </p>
                  )}
                  {order.payment.status === 'refunded' && (
                    <p>Đã hoàn tiền: <strong>{formatCurrency(order.payment.refundAmount)}</strong></p>
                  )}
                </section>
              )}

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={sectionTitle}>Danh sách món ăn &amp; topping</p>
                  <span className="text-xs text-slate-500">{itemCount} món</span>
                </div>
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-3 rounded-lg border border-brand-soft/60 bg-white p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand-light text-sm font-extrabold text-brand">
                      {item.quantity}x
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="font-bold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                      </div>
                      {item.options.map((option) => (
                        <p key={`${option.groupName}-${option.name}`} className="text-xs text-slate-500">
                          • {option.groupName}: {option.name}
                          {option.price > 0 && ` (+${formatCurrency(option.price)})`}
                        </p>
                      ))}
                      {item.note && <p className="text-xs italic text-slate-500">• Yêu cầu: {item.note}</p>}
                      <p className="text-right font-mono text-[11px] text-slate-400">
                        {formatCurrency(item.unitPrice)} / suất
                      </p>
                    </div>
                  </div>
                ))}
              </section>

              <section className="space-y-1.5 rounded-lg border border-brand-soft/60 bg-white p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className={sectionTitle}>Thanh toán</p>
                  <PaymentBadge payment={order.payment} />
                </div>
                <p className="flex justify-between text-slate-600">
                  <span>Tạm tính món ăn:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </p>
                <p className="flex justify-between text-slate-600">
                  <span>Phí đóng gói:</span>
                  <span>{formatCurrency(order.packagingFee)}</span>
                </p>
                <p className="flex justify-between text-slate-600">
                  <span>Phí giao hàng:</span>
                  <span>{formatCurrency(order.shippingFee)}</span>
                </p>
                <p className="flex justify-between text-slate-600">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </p>
                <p className="flex justify-between border-t border-brand-soft/60 pt-2 font-bold text-slate-900">
                  <span>Tổng tiền đơn hàng:</span>
                  <span className="text-brand">{formatCurrency(order.total)}</span>
                </p>
              </section>

              <section className="space-y-3 rounded-lg border border-brand-soft/60 bg-white p-4">
                <p className={`${sectionTitle} flex items-center justify-between`}>
                  Tiến trình đơn hàng
                  <Activity className="h-4 w-4 text-slate-400" />
                </p>
                <OrderTimeline history={order.statusHistory} status={order.status} />
              </section>
            </>
          )}
        </div>

        <div className="border-t border-brand-soft/60 bg-white p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-brand-light py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-soft"
          >
            Đóng
          </button>
        </div>
      </aside>
    </div>
  )
}
