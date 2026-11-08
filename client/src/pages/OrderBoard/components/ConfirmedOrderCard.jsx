import { Hourglass, Info, RefreshCw } from 'lucide-react'
import { formatClock, formatCountdown, formatDuration } from '../../../utils/formatTime.js'
import OrderCardHeader from './OrderCardHeader.jsx'
import OrderItemList from './OrderItemList.jsx'

// Accepted by the restaurant, shown to shippers. The kitchen waits: cooking starts once a shipper takes it.
export default function ConfirmedOrderCard({ order, now, onView }) {
  const waitedMs = now - new Date(order.waitingShipperSince || order.acceptedAt).getTime()
  const deadline = order.shipperDeadline ? new Date(order.shipperDeadline).getTime() : null

  const badge = (
    <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-bold text-sky-800">
      <RefreshCw className="h-3 w-3 animate-spin [animation-duration:3s]" />
      TÌM SHIPPER: {formatDuration(waitedMs)}
    </span>
  )

  return (
    <article className="space-y-3 rounded-lg border border-sky-200 bg-white p-4 shadow-sm">
      <OrderCardHeader orderCode={order.orderCode} badge={badge} onView={onView} />

      <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
        <p className="flex items-center gap-2 font-bold text-sky-900">
          <Hourglass className="h-4 w-4" />
          Chưa cần nấu – đang chờ shipper nhận đơn
        </p>
        <p className="text-xs text-sky-800">Quán nhận đơn lúc {formatClock(order.acceptedAt)}. Bếp sẽ được báo ngay khi có shipper.</p>
      </div>

      <div className="border-t border-brand-soft/60 pt-3">
        <OrderItemList items={order.items} />
      </div>

      {deadline && (
        <p className="flex items-center gap-1.5 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {deadline > now
            ? `Tự hủy lúc ${formatClock(deadline)} (${formatCountdown(deadline - now)}) nếu không có shipper. Không tính lỗi cho quán.`
            : 'Đã quá hạn tìm shipper – đơn sắp tự hủy. Không tính lỗi cho quán.'}
        </p>
      )}
    </article>
  )
}
