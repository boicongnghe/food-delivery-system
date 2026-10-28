import { CANCELLED_BY_LABELS, ORDER_STATUS_LABELS, ORDER_TAB_BADGES } from '../constants.js'

// Status of a report row; a cancelled order says who cancelled it
export default function OrderStatusBadge({ order }) {
  const label =
    order.status === 'cancelled'
      ? CANCELLED_BY_LABELS[order.cancellation?.by] || ORDER_STATUS_LABELS.cancelled
      : ORDER_STATUS_LABELS[order.status] || order.status

  return (
    <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${ORDER_TAB_BADGES[order.tab]}`}>
      {label}
    </span>
  )
}
