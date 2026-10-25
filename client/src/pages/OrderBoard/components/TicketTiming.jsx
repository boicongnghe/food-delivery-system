import { AlarmClock, Clock } from 'lucide-react'
import { formatClock, formatCountdown, formatTimeAgo } from '../../../utils/formatTime.js'

const ACTIVE_KITCHEN_STATUSES = ['preparing']

// "Thời gian nhận 11:42 (23 phút trước)" | "Hẹn bàn giao xe 12:15 (Còn 10 phút / Trễ 3 phút)"
export default function TicketTiming({ order, now }) {
  const receivedAt = order.acceptedAt || order.createdAt
  const receivedLabel = order.acceptedAt ? 'Thời gian nhận' : 'Thời gian đặt'
  const dueAt = order.kitchenDueAt ? new Date(order.kitchenDueAt).getTime() : null
  const showCountdown = dueAt && ACTIVE_KITCHEN_STATUSES.includes(order.status)
  const isLate = showCountdown && now > dueAt

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-brand-light/70 p-3">
      <div>
        <p className="text-[11px] font-bold uppercase text-slate-600">{receivedLabel}</p>
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Clock className="h-4 w-4" />
          {formatClock(receivedAt)} ({formatTimeAgo(now - new Date(receivedAt).getTime())})
        </p>
      </div>
      <div>
        <p className={`text-[11px] font-bold uppercase ${isLate ? 'text-red-700' : 'text-brand'}`}>Hẹn bàn giao xe</p>
        {dueAt ? (
          <p className={`flex items-center gap-1.5 text-sm font-bold ${isLate ? 'text-red-700' : 'text-brand'}`}>
            <AlarmClock className="h-4 w-4" />
            {formatClock(dueAt)}
            {showCountdown && ` (${formatCountdown(dueAt - now)})`}
          </p>
        ) : (
          <p className="text-sm text-slate-500">{order.status === 'pending' ? 'Tính khi quán nhận đơn' : '—'}</p>
        )}
      </div>
    </div>
  )
}
