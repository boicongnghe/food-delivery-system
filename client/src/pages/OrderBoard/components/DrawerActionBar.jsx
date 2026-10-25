import { Bike, CircleCheck, Info, Receipt, SquareCheck, X } from 'lucide-react'

const spinner = <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />

const secondaryClass =
  'inline-flex items-center justify-center gap-2 rounded-md bg-brand-light px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-brand-soft disabled:opacity-50'

// Sticky bottom bar: the actions that make sense for the order's current status
export default function DrawerActionBar({ order, busy, acceptBlockedReason, onAccept, onReject, onReady, onPrintSlip }) {
  if (order.status === 'pending') {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={busy || Boolean(acceptBlockedReason)}
          title={acceptBlockedReason || undefined}
          className="flex w-full items-center justify-center gap-3 rounded-md bg-brand px-4 py-4 font-serif text-lg font-bold uppercase text-white shadow hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? spinner : <CircleCheck className="h-6 w-6" />}
          Nhận đơn bếp (Ctrl+Enter)
        </button>
        {acceptBlockedReason && <p className="text-center text-xs text-amber-800">{acceptBlockedReason}</p>}
        <button type="button" onClick={onReject} disabled={busy} className={`${secondaryClass} w-full text-brand`}>
          <X className="h-4 w-4" />
          Từ chối đơn
        </button>
      </div>
    )
  }

  if (order.status === 'preparing') {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={onReady}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-md bg-brand px-4 py-4 font-serif text-lg font-bold uppercase text-white shadow hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? spinner : <SquareCheck className="h-6 w-6" />}
          Xác nhận xong bếp – gọi tài xế (Ctrl+Enter)
        </button>
        <button type="button" onClick={onPrintSlip} className={`${secondaryClass} w-full`}>
          <Receipt className="h-4 w-4" />
          In phiếu giao shipper
        </button>
      </div>
    )
  }

  if (order.status === 'ready_for_pickup') {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-900">
          <Bike className="h-4 w-4" />
          {order.shipper?.fullName
            ? `Shipper ${order.shipper.fullName} đã nhận đơn – đang đến quán`
            : 'Đã báo xong bếp – đang chờ shipper nhận đơn'}
        </p>
        <button type="button" onClick={onPrintSlip} className={`${secondaryClass} w-full`}>
          <Receipt className="h-4 w-4" />
          In phiếu giao shipper
        </button>
      </div>
    )
  }

  // delivering / delivered / cancelled: read only
  return (
    <p className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
      <Info className="h-4 w-4 shrink-0" />
      Đơn đã rời bếp – chỉ xem, không còn thao tác.
    </p>
  )
}
