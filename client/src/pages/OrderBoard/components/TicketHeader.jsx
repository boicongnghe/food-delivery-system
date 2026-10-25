import { Bike, Printer, X } from 'lucide-react'
import { DELIVERY_TYPE_LABELS } from '../constants.js'
import DrawerMoreMenu from './DrawerMoreMenu.jsx'
import StatusSticker from './StatusSticker.jsx'
import TicketTiming from './TicketTiming.jsx'

const formatTicketNo = (number) => (number ? `#${String(number).padStart(2, '0')}` : 'Chưa có số')

// Top card of the kitchen ticket: actions, ticket number, order code, status, timing, delivery type
export default function TicketHeader({ order, now, onClose, onPrintTicket, onPrintSlip, onCopyCode }) {
  return (
    <section className="rounded-xl border border-brand-soft/60 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-light px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-brand-soft"
        >
          <X className="h-4 w-4" />
          Đóng (ESC)
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrintTicket}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-light px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-brand-soft"
          >
            <Printer className="h-4 w-4 text-brand" />
            In vé bếp (F4)
          </button>
          <DrawerMoreMenu onCopyCode={onCopyCode} onPrintSlip={onPrintSlip} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand">
            <span className="h-2 w-2 rounded-full bg-brand" />
            Chit phiếu bếp {formatTicketNo(order.kitchenTicketNo)}
          </p>
          <p className="font-serif text-4xl font-bold text-slate-900">#{order.orderCode}</p>
        </div>
        <StatusSticker status={order.status} />
      </div>

      <TicketTiming order={order} now={now} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Bike className="h-4 w-4 text-emerald-700" />
          Giao hàng tận nơi · GiaoNhanh {DELIVERY_TYPE_LABELS[order.delivery.type]}
        </span>
        <span>
          Thanh toán: <strong>{order.payment.method === 'cod' ? 'Tiền mặt COD' : 'Online'}</strong>
        </span>
      </div>
    </section>
  )
}
