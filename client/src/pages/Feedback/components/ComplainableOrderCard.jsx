import { MessageSquareWarning } from 'lucide-react'
import OrderBrief from '../../../components/OrderBrief/OrderBrief.jsx'
import { formatDate, formatDateTime } from '../../../utils/formatDate.js'

// Delivered / cancelled order that can still get a complaint (UC18)
export default function ComplainableOrderCard({ order, onComplain }) {
  const closedLabel = order.status === 'cancelled' ? 'Đã hủy' : 'Đã giao'

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <OrderBrief order={order}>
        <p className="mt-1 text-xs text-slate-400">
          {closedLabel} {formatDateTime(order.closedAt)} · Hạn khiếu nại {formatDate(order.deadline)}
        </p>
      </OrderBrief>
      <button
        type="button"
        onClick={() => onComplain(order)}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-primary/40 px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary-light"
      >
        <MessageSquareWarning className="h-4 w-4" /> Khiếu nại
      </button>
    </div>
  )
}
