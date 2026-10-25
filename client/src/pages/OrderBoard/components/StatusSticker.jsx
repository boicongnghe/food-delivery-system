import { ORDER_STATUS_LABELS } from '../constants.js'

const STICKER_CLASSES = {
  pending: 'border-red-300 bg-red-50 text-red-800',
  preparing: 'border-amber-300 bg-amber-100 text-amber-900',
  ready_for_pickup: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  delivering: 'border-sky-300 bg-sky-50 text-sky-800',
  delivered: 'border-slate-300 bg-slate-100 text-slate-700',
  cancelled: 'border-red-300 bg-red-100 text-red-700',
}

// Tilted "sticker" with the order status, like a note taped on a paper ticket
export default function StatusSticker({ status }) {
  return (
    <span
      className={`inline-flex -rotate-2 items-center gap-1.5 rounded border-2 px-3 py-1 text-xs font-extrabold uppercase tracking-wide shadow-sm ${STICKER_CLASSES[status]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}
