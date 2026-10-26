import { CircleCheck, X } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { LATE_AFTER_MS } from '../constants.js'
import CustomerNote from './CustomerNote.jsx'
import OrderCardHeader from './OrderCardHeader.jsx'
import OrderItemList from './OrderItemList.jsx'
import PaymentBadge from './PaymentBadge.jsx'
import RecipientLine from './RecipientLine.jsx'
import WaitingBadge from './WaitingBadge.jsx'

export default function PendingOrderCard({ order, now, busy, acceptBlockedReason, onAccept, onReject, onView }) {
  const waitedMs = now - new Date(order.createdAt).getTime()
  const isLate = waitedMs >= LATE_AFTER_MS

  return (
    <article
      className={`space-y-3 rounded-lg border bg-white p-4 shadow-sm ${
        isLate ? 'border-red-300 ring-1 ring-red-200' : 'border-brand-soft/70'
      }`}
    >
      <OrderCardHeader orderCode={order.orderCode} badge={<WaitingBadge waitedMs={waitedMs} />} onView={onView} />
      <RecipientLine delivery={order.delivery} />
      <OrderItemList items={order.items} />
      <CustomerNote note={order.customerNote} />

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-slate-600">
          Thanh toán: <PaymentBadge payment={order.payment} />
        </span>
        <span className="text-base font-extrabold text-slate-900">{formatCurrency(order.total)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand-light py-2.5 text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Từ chối
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={busy || Boolean(acceptBlockedReason)}
          title={acceptBlockedReason || undefined}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <CircleCheck className="h-4 w-4" />
          )}
          Nhận đơn bếp
        </button>
      </div>
    </article>
  )
}
