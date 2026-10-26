import { MapPin, User } from 'lucide-react'
import { DELIVERY_TYPE_LABELS } from '../constants.js'

// Customer name + masked phone + delivery type, then the delivery address
export default function RecipientLine({ delivery }) {
  return (
    <div className="space-y-1 border-y border-brand-soft/60 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-slate-800">
          <User className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate font-semibold">{delivery.recipientName}</span>
          <span className="shrink-0 text-slate-500">({delivery.phone})</span>
        </p>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            delivery.type === 'express' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {DELIVERY_TYPE_LABELS[delivery.type]}
        </span>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="line-clamp-2">{delivery.address}</span>
      </p>
    </div>
  )
}
