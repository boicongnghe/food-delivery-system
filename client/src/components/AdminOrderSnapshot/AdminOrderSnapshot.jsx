import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatDateTime } from '../../utils/formatDate.js'
import AdminBadge from '../AdminBadge/AdminBadge.jsx'
import AdminInfoRow from '../AdminInfoRow/AdminInfoRow.jsx'

const ORDER_STATUSES = {
  pending: { label: 'Chờ quán nhận', tone: 'amber' },
  preparing: { label: 'Đang chuẩn bị', tone: 'sky' },
  ready_for_pickup: { label: 'Chờ shipper lấy', tone: 'sky' },
  delivering: { label: 'Đang giao', tone: 'purple' },
  delivered: { label: 'Đã giao', tone: 'emerald' },
  cancelled: { label: 'Đã hủy', tone: 'red' },
}
const PAYMENT_METHOD_LABELS = { cod: 'Tiền mặt (COD)', momo: 'MoMo', vnpay: 'VNPay' }
const PAYMENT_STATUS_LABELS = {
  unpaid: 'chưa thanh toán',
  paid: 'đã thanh toán',
  refunded: 'đã hoàn tiền',
  cancelled: 'đã hủy',
}
const ACTOR_LABELS = { customer: 'Khách hàng', restaurant: 'Nhà hàng', shipper: 'Shipper', system: 'Hệ thống' }

// The order as it was placed (snapshot), used when handling a complaint or a delivery issue
export default function AdminOrderSnapshot({ order }) {
  if (!order) {
    return <p className="text-sm text-slate-500">Đơn hàng không còn tồn tại.</p>
  }
  const status = ORDER_STATUSES[order.status] || { label: order.status, tone: 'slate' }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-white">{order.orderCode}</p>
        <div className="flex items-center gap-2">
          <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
          <span className="text-xs text-slate-500">Đặt lúc {formatDateTime(order.createdAt)}</span>
        </div>
      </div>

      <ul className="divide-y divide-slate-800 text-sm">
        {order.items.map((item, index) => (
          <li key={index} className="flex justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="text-slate-200">
                <span className="font-bold text-purple-300">{item.quantity}×</span> {item.name}
              </p>
              {item.options?.length > 0 && (
                <p className="text-xs text-slate-500">{item.options.map((option) => option.name).join(', ')}</p>
              )}
              {item.note && <p className="text-xs italic text-amber-300/80">Ghi chú: {item.note}</p>}
            </div>
            <span className="shrink-0 text-slate-300">{formatCurrency(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-800 pt-2">
        <AdminInfoRow label="Tiền món">{formatCurrency(order.subtotal)}</AdminInfoRow>
        <AdminInfoRow label="Phí giao hàng">{formatCurrency(order.shippingFee)}</AdminInfoRow>
        {order.discount > 0 && <AdminInfoRow label="Giảm giá">-{formatCurrency(order.discount)}</AdminInfoRow>}
        <AdminInfoRow label="Tổng thanh toán">
          <span className="font-black text-white">{formatCurrency(order.total)}</span>
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
        <ol className="space-y-1.5 border-t border-slate-800 pt-3 text-xs">
          {order.statusHistory.map((entry) => (
            <li key={`${entry.status}-${entry.at}`} className="flex justify-between gap-3">
              <span className="text-slate-300">
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
