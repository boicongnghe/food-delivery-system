import { Star } from 'lucide-react'
import { formatCurrency } from '../../utils/formatCurrency.js'
import AdminInfoRow from '../AdminInfoRow/AdminInfoRow.jsx'
import AdminSection from '../AdminSection/AdminSection.jsx'

/**
 * Orders handled by a restaurant / delivered by a shipper, rating and earlier penalties.
 * @param {{ totalOrders, deliveredOrders, cancelledOrders, deliveredValue }} orderStats
 */
export default function AdminPartnerActivity({ title, orderStats, rating, ratingLabel, violationCount }) {
  const tiles = [
    { label: 'Tổng đơn', value: orderStats.totalOrders },
    { label: 'Giao thành công', value: orderStats.deliveredOrders },
    { label: 'Đã hủy', value: orderStats.cancelledOrders },
  ]

  return (
    <AdminSection title={title}>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{tile.label}</p>
            <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{tile.value}</p>
          </div>
        ))}
      </div>
      <AdminInfoRow label="Giá trị đơn giao thành công">{formatCurrency(orderStats.deliveredValue)}</AdminInfoRow>
      <AdminInfoRow label="Đánh giá">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-600 dark:text-amber-400" />
          {rating ?? 0} {ratingLabel}
        </span>
      </AdminInfoRow>
      <AdminInfoRow label="Lần bị xử phạt (sự cố giao hàng)">
        <span className={violationCount ? 'text-red-600 dark:text-red-400' : ''}>{violationCount}</span>
      </AdminInfoRow>
    </AdminSection>
  )
}
