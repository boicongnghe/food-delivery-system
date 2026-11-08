import { TriangleAlert, Zap } from 'lucide-react'
import { formatDuration } from '../../../utils/formatTime.js'
import { NEW_ORDER_MS } from '../constants.js'

/**
 * How long a new order has been waiting: "MỚI TINH" -> "x phút trước" -> red countdown once the
 * reminder time passed (TO-02), until the order cancels itself (TO-03).
 * @param {number|null} cancelInMs - time left before the automatic cancel (null = unknown)
 */
export default function WaitingBadge({ waitedMs, isLate, cancelInMs }) {
  if (isLate) {
    return (
      <>
        <span className="inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
          <TriangleAlert className="h-3 w-3" />
          {cancelInMs > 0 ? `TỰ HỦY SAU ${formatDuration(cancelInMs)}` : 'ĐANG TỰ HỦY'}
        </span>
        <p className="mt-0.5 text-[10px] font-bold text-red-600">CẦN NHẬN NGAY! Đã chờ {formatDuration(waitedMs)}</p>
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
