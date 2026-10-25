import { Eye } from 'lucide-react'

// "MÃ ĐƠN #GN-8902 (eye)" on the left, a status/timer badge on the right
export default function OrderCardHeader({ orderCode, badge, onView }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mã đơn</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold text-slate-900">#{orderCode}</span>
          <button
            type="button"
            onClick={onView}
            title="Xem chi tiết đơn"
            className="rounded-full p-1 text-slate-500 hover:bg-brand-light hover:text-brand"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="text-right">{badge}</div>
    </div>
  )
}
