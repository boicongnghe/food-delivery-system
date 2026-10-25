import { formatCurrency } from '../../../utils/formatCurrency.js'
import PaymentBadge from './PaymentBadge.jsx'
import SummaryRow from './SummaryRow.jsx'

// Payment method/status + price breakdown
export default function PaymentSummary({ order }) {
  return (
    <section className="space-y-1.5 rounded-xl border border-brand-soft/60 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Thanh toán</p>
        <PaymentBadge payment={order.payment} />
      </div>
      <SummaryRow label="Tạm tính món ăn:" value={formatCurrency(order.subtotal)} />
      <SummaryRow label="Phí đóng gói:" value={formatCurrency(order.packagingFee)} />
      <SummaryRow label="Phí giao hàng:" value={formatCurrency(order.shippingFee)} />
      <SummaryRow label="Giảm giá:" value={`-${formatCurrency(order.discount)}`} />
      <p className="flex justify-between border-t border-brand-soft/60 pt-2 font-bold text-slate-900">
        <span>Tổng tiền đơn hàng:</span>
        <span className="text-brand">{formatCurrency(order.total)}</span>
      </p>
    </section>
  )
}
