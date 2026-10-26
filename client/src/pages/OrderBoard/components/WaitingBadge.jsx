import { TriangleAlert, Zap } from 'lucide-react'
import { formatDuration } from '../../../utils/formatTime.js'
import { LATE_AFTER_MS, NEW_ORDER_MS } from '../constants.js'

// How long a new order has been waiting: "MỚI TINH" -> "x phút trước" -> red "QUÁ 5 PHÚT"
export default function WaitingBadge({ waitedMs }) {
  if (waitedMs >= LATE_AFTER_MS) {
    return (
      <>
        <span className="inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
          <TriangleAlert className="h-3 w-3" />
          QUÁ 5 PHÚT: {formatDuration(waitedMs)}
        </span>
        <p className="mt-0.5 text-[10px] font-bold text-red-600">CẦN NHẬN NGAY!</p>
      </>
    )
  }
  if (waitedMs < NEW_ORDER_MS) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] font-bold text-white">
        <Zap className="h-3 w-3" />
        MỚI TINH ({formatDuration(waitedMs)})
      </span>
    )
  }
  return (
    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
      {formatDuration(waitedMs)} ({Math.floor(waitedMs / 60000)} phút trước)
    </span>
  )
}
