import { Star } from 'lucide-react'
import OrderBrief from '../../../components/OrderBrief/OrderBrief.jsx'
import { formatDate, formatDateTime } from '../../../utils/formatDate.js'

// Delivered order waiting for a review (UC17)
export default function ReviewableOrderCard({ order, onReview }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <OrderBrief order={order}>
        <p className="mt-1 text-xs text-slate-400">
          Đã giao {formatDateTime(order.closedAt)} · Hạn đánh giá {formatDate(order.deadline)}
        </p>
      </OrderBrief>
      <button
        type="button"
        onClick={() => onReview(order)}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white shadow-md shadow-primary/30 transition-colors hover:bg-primary-hover"
      >
        <Star className="h-4 w-4" /> Đánh giá
      </button>
    </div>
  )
}
