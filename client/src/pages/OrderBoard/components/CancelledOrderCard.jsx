import { CircleX, Eye, Info } from 'lucide-react'
import OrderItemList from './OrderItemList.jsx'

// Order the customer cancelled before the kitchen accepted it (read-only, shown for a few minutes)
export default function CancelledOrderCard({ order, onView }) {
  const isRefunded = order.payment.status === 'refunded'

  return (
    <article className="space-y-2 rounded-lg border-2 border-dashed border-slate-300 bg-white/70 p-4 opacity-80">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-500">
          MÃ ĐƠN: <span className="font-bold text-slate-700">#{order.orderCode}</span>
        </p>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">
            <CircleX className="h-3 w-3" />
            KHÁCH ĐÃ HỦY
          </span>
          <button
            type="button"
            onClick={onView}
            title="Xem chi tiết đơn"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">Khách: {order.delivery.recipientName}</p>
      <OrderItemList items={order.items} struck />
      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Khách đã hủy đơn trước khi quán bấm tiếp nhận.
        {isRefunded ? ' Hệ thống đã tự hoàn tiền.' : ''}
      </p>
    </article>
  )
}
