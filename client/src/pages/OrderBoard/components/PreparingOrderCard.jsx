import { AlarmClock, ChefHat, PackageCheck } from 'lucide-react'
import { formatClock, formatCountdown, formatDuration } from '../../../utils/formatTime.js'
import CustomerNote from './CustomerNote.jsx'
import OrderCardHeader from './OrderCardHeader.jsx'
import OrderItemList from './OrderItemList.jsx'

export default function PreparingOrderCard({ order, now, busy, onReady, onView }) {
  const cookingMs = now - new Date(order.acceptedAt).getTime()
  const dueAt = order.kitchenDueAt ? new Date(order.kitchenDueAt).getTime() : null
  const isLate = dueAt !== null && now > dueAt

  const badge = (
    <>
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
        <ChefHat className="h-3 w-3" />
        BẾP NẤU: {formatDuration(cookingMs)}
      </span>
      {dueAt && (
        <p className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] font-semibold ${isLate ? 'text-red-600' : 'text-slate-500'}`}>
          <AlarmClock className="h-3 w-3" />
          Bàn giao {formatClock(dueAt)} ({formatCountdown(dueAt - now)})
        </p>
      )}
    </>
  )

  return (
    <article
      className={`space-y-3 rounded-lg border bg-white p-4 shadow-sm ${
        isLate ? 'border-red-300 ring-1 ring-red-200' : 'border-brand-soft/70'
      }`}
    >
      <OrderCardHeader orderCode={order.orderCode} badge={badge} onView={onView} />
      {order.kitchenTicketNo && (
        <p className="text-xs font-bold uppercase tracking-wide text-brand">
          Phiếu bếp #{String(order.kitchenTicketNo).padStart(2, '0')}
        </p>
      )}
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
