import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import { ADMIN_TABLE_CELL, ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { ORDER_STATUSES, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../../../utils/orderLabels.js'

export default function OrderTable({ orders, onSelect }) {
  return (
    // relative: the sr-only header text is absolutely positioned and must stay inside the scroll box
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[960px]">
        <thead className="border-b border-slate-100 dark:border-crave-border">
          <tr>
            <th className={ADMIN_TABLE_HEAD}>Mã đơn</th>
            <th className={ADMIN_TABLE_HEAD}>Khách hàng</th>
            <th className={ADMIN_TABLE_HEAD}>Nhà hàng</th>
            <th className={ADMIN_TABLE_HEAD}>Shipper</th>
            <th className={ADMIN_TABLE_HEAD}>Tổng tiền</th>
            <th className={ADMIN_TABLE_HEAD}>Trạng thái</th>
            <th className={ADMIN_TABLE_HEAD}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-crave-border">
          {orders.map((order) => {
            const status = ORDER_STATUSES[order.status] || { label: order.status, tone: 'slate' }
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
            return (
              <tr key={order._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                <td className={ADMIN_TABLE_CELL}>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{order.orderCode || order.orderNumber}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                </td>
                <td className={ADMIN_TABLE_CELL}>
                  <p className="truncate">{order.customer?.fullName || order.delivery?.recipientName || '—'}</p>
                  <p className="truncate text-xs text-slate-500">{order.customer?.email || 'Tài khoản đã xóa'}</p>
                </td>
                <td className={ADMIN_TABLE_CELL}>{order.restaurant?.name || '—'}</td>
                <td className={ADMIN_TABLE_CELL}>
                  {order.shipper?.fullName || <span className="text-slate-400">Chưa có</span>}
                </td>
                <td className={ADMIN_TABLE_CELL}>
                  <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(order.total || order.totalPrice)}</p>
                  <p className="text-xs text-slate-500">
                    {itemCount} món · {PAYMENT_METHOD_LABELS[order.payment?.method] || order.payment?.method}
                    {order.payment?.status && `, ${PAYMENT_STATUS_LABELS[order.payment.status] || order.payment.status}`}
                  </p>
                </td>
                <td className={ADMIN_TABLE_CELL}>
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                </td>
                <td className={`${ADMIN_TABLE_CELL} text-right`}>
                  <button
                    type="button"
                    onClick={() => onSelect(order._id)}
                    className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
                  >
                    Chi tiết
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
