import { formatClock } from '../../../utils/formatTime.js'
import { HISTORY_LABELS } from '../constants.js'

// Next steps shown greyed out after the latest status
const NEXT_STEPS = {
  pending: ['Quán nhận đơn', 'Bếp hoàn tất – sẵn sàng'],
  preparing: ['Bếp hoàn tất – sẵn sàng', 'Chờ shipper lấy hàng'],
  ready_for_pickup: ['Chờ shipper lấy hàng'],
  delivering: ['Giao hàng thành công'],
}

export default function OrderTimeline({ history, status }) {
  const lastIndex = history.length - 1

  return (
    <ol className="space-y-3">
      {history.map((entry, index) => (
        <li key={`${entry.status}-${entry.at}`} className="flex items-center gap-3 text-sm">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              entry.status === 'cancelled' ? 'bg-red-600' : index === lastIndex ? 'bg-amber-600' : 'bg-emerald-700'
            }`}
          />
          <span className="w-12 shrink-0 font-mono text-xs text-slate-500">{formatClock(entry.at)}</span>
          <span className={index === lastIndex ? 'font-semibold text-slate-900' : 'text-slate-700'}>
            {HISTORY_LABELS[entry.status]}
          </span>
        </li>
      ))}
      {(NEXT_STEPS[status] || []).map((label) => (
        <li key={label} className="flex items-center gap-3 text-sm text-slate-400">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200" />
          <span className="w-12 shrink-0 font-mono text-xs">--:--</span>
          <span className="italic">{label}</span>
        </li>
      ))}
    </ol>
  )
}
