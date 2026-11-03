import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { ACTOR_LABELS, ORDER_STATUSES, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/orderLabels.js'
import AdminBadge from '../AdminBadge/AdminBadge.jsx'
import AdminInfoRow from '../AdminInfoRow/AdminInfoRow.jsx'

// The order as it was placed (snapshot): order list, complaints and delivery issues
export default function AdminOrderSnapshot({ order }) {
  if (!order) {
    return <p className="text-sm text-slate-500">Đơn hàng không còn tồn tại.</p>
  }
  const status = ORDER_STATUSES[order.status] || { label: order.status, tone: 'slate' }
  // Checkout writes the voucher in promotion.discountAmount, kitchen / seed orders in discount
  const discount = order.discount || order.promotion?.discountAmount || 0

  return (
    <div className="space-y-3 rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{order.orderCode || order.orderNumber}</p>
        <div className="flex items-center gap-2">
          <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
          <span className="text-xs text-slate-500">Đặt lúc {formatDateTime(order.createdAt)}</span>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-crave-border text-sm">
        {order.items.map((item, index) => (
          <li key={index} className="flex justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="text-slate-800 dark:text-slate-200">
                <span className="font-bold text-primary">{item.quantity}×</span> {item.name}
              </p>
              {item.options?.length > 0 && (
                <p className="text-xs text-slate-500">{item.options.map((option) => option.name).join(', ')}</p>
              )}
              {item.note && <p className="text-xs italic text-amber-700/80 dark:text-amber-300/80">Ghi chú: {item.note}</p>}
            </div>
            <span className="shrink-0 text-slate-700 dark:text-slate-300">
              {formatCurrency(item.lineTotal || (item.unitPrice || item.price || 0) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-100 dark:border-crave-border pt-2">
        <AdminInfoRow label="Tiền món">{formatCurrency(order.subtotal)}</AdminInfoRow>
        {order.packagingFee > 0 && <AdminInfoRow label="Phí đóng gói">{formatCurrency(order.packagingFee)}</AdminInfoRow>}
        <AdminInfoRow label="Phí giao hàng">{formatCurrency(order.shippingFee)}</AdminInfoRow>
        {discount > 0 && (
          <AdminInfoRow label={order.promotion?.code ? `Giảm giá (mã ${order.promotion.code})` : 'Giảm giá'}>
            -{formatCurrency(discount)}
          </AdminInfoRow>
        )}
        <AdminInfoRow label="Tổng thanh toán">
          <span className="font-black text-slate-900 dark:text-white">{formatCurrency(order.total || order.totalPrice)}</span>
        </AdminInfoRow>
        <AdminInfoRow label="Thanh toán">
          {PAYMENT_METHOD_LABELS[order.payment?.method] || order.payment?.method} ·{' '}
          {PAYMENT_STATUS_LABELS[order.payment?.status] || order.payment?.status}
        </AdminInfoRow>
        {order.payment?.refundAmount > 0 && (
          <AdminInfoRow label="Đã hoàn khi hủy đơn">{formatCurrency(order.payment.refundAmount)}</AdminInfoRow>
        )}
        {order.delivery?.address && <AdminInfoRow label="Giao đến">{order.delivery.address}</AdminInfoRow>}
      </div>

      {order.statusHistory?.length > 0 && (
        <ol className="space-y-1.5 border-t border-slate-100 dark:border-crave-border pt-3 text-xs">
          {order.statusHistory.map((entry) => (
            <li key={`${entry.status}-${entry.at}`} className="flex justify-between gap-3">
              <span className="text-slate-700 dark:text-slate-300">
                {ORDER_STATUSES[entry.status]?.label || entry.status}
                <span className="text-slate-500"> · {ACTOR_LABELS[entry.byRole] || entry.byRole}</span>
              </span>
              <span className="text-slate-500">{formatDateTime(entry.at)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
