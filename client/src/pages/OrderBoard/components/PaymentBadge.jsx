import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../constants.js'

const STATUS_CLASSES = {
  paid: 'bg-amber-100 text-amber-800',
  unpaid: 'bg-slate-100 text-slate-700',
  refunded: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500',
}

// "MoMo (Đã thanh toán)" / "Tiền mặt COD (Chưa thu)"
export default function PaymentBadge({ payment }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[payment.status]}`}>
      {PAYMENT_METHOD_LABELS[payment.method]} ({PAYMENT_STATUS_LABELS[payment.status]})
    </span>
  )
}
