import { Link } from 'react-router-dom'
import { ReceiptText } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import OrderStatusBadge from './OrderStatusBadge.jsx'

// Latest orders of the period; each one opens in the kitchen drawer
export default function RecentOrders({ orders, onShowAll }) {
  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-900">
          <ReceiptText className="h-5 w-5 text-brand" aria-hidden="true" />
          Đơn hàng gần đây
        </h2>
        <button type="button" onClick={onShowAll} className="text-sm font-semibold text-brand hover:underline">
          Xem tất cả
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Chưa có đơn hàng trong kỳ.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {orders.map((order) => (
            <li key={order._id}>
              <Link
                to={`/restaurant/orders?order=${order._id}`}
                className="flex items-center gap-3 py-2.5 hover:bg-brand-light/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    #{order.orderCode} <span className="font-normal text-slate-500">· {order.customerName || 'Khách hàng'}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {formatDateTime(order.createdAt)} · {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums text-slate-900">{formatCurrency(order.grossRevenue)}</span>
                  <OrderStatusBadge order={order} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
