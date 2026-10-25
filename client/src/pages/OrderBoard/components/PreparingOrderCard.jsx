import { ChefHat, PackageCheck } from 'lucide-react'
import { formatClock, formatDuration } from '../../../utils/formatTime.js'
import CustomerNote from './CustomerNote.jsx'
import OrderCardHeader from './OrderCardHeader.jsx'
import OrderItemList from './OrderItemList.jsx'

export default function PreparingOrderCard({ order, now, busy, onReady, onView }) {
  const cookingMs = now - new Date(order.acceptedAt).getTime()

  const badge = (
    <>
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
        <ChefHat className="h-3 w-3" />
        BẾP NẤU: {formatDuration(cookingMs)}
      </span>
      {order.delivery.expectedAt && (
        <p className="mt-0.5 text-[11px] text-slate-500">Hẹn giao: {formatClock(order.delivery.expectedAt)}</p>
      )}
    </>
  )

  return (
    <article className="space-y-3 rounded-lg border border-brand-soft/70 bg-white p-4 shadow-sm">
      <OrderCardHeader orderCode={order.orderCode} badge={badge} onView={onView} />
      <div className="border-t border-brand-soft/60 pt-3">
        <OrderItemList items={order.items} />
      </div>
      <CustomerNote note={order.customerNote} label="Ghi chú đóng gói" />

      <button
        type="button"
        onClick={onReady}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-800 py-2.5 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <PackageCheck className="h-4 w-4" />
        )}
        Đã xong – Chờ shipper
      </button>
    </article>
  )
}
