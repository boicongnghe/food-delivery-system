import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatClock } from '../../../utils/formatTime.js'
import { CANCELLED_BY_LABELS, REJECT_REASONS, SYSTEM_CANCEL_REASONS } from '../constants.js'

const reasonLabel = (reason) =>
  REJECT_REASONS.find((item) => item.value === reason)?.label || SYSTEM_CANCEL_REASONS[reason]

// Who cancelled, why, and the refund (only for cancelled orders)
export default function CancellationInfo({ order }) {
  const { cancellation, payment } = order
  if (!cancellation?.by) return null

  const label = reasonLabel(cancellation.reason)

  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="text-[11px] font-bold uppercase tracking-wide text-red-800">Thông tin hủy đơn</p>
      <p>
        Hủy bởi: <strong>{CANCELLED_BY_LABELS[cancellation.by]}</strong> lúc {formatClock(cancellation.at)}
      </p>
      {(label || cancellation.note) && (
        <p>
          Lý do: {label}
          {label && cancellation.note && ' – '}
          {cancellation.note}
        </p>
      )}
      {payment.status === 'refunded' ? (
        <p>
          Đã hoàn tiền: <strong>{formatCurrency(payment.refundAmount)}</strong>
        </p>
      ) : (
        ['pending', 'failed'].includes(order.refund?.status) && (
          <p>
            Chờ hoàn tiền cho khách: <strong>{formatCurrency(order.refund.amount)}</strong> (nền tảng xử lý)
          </p>
        )
      )}
    </section>
  )
}
