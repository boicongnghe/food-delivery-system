import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { ORDER_STATS_TITLES } from '../constants.js'

// Orders placed / received / delivered depending on the role, plus feedback sent by a customer
export default function UserActivityStats({ detail }) {
  const { user, orderStats, feedback } = detail
  if (!orderStats) return null

  const tiles = [
    { label: 'Tổng đơn', value: orderStats.totalOrders },
    { label: 'Giao thành công', value: orderStats.deliveredOrders },
    { label: 'Đã hủy', value: orderStats.cancelledOrders },
  ]

  return (
    <AdminSection title={ORDER_STATS_TITLES[user.role]}>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{tile.label}</p>
            <p className="mt-1 text-xl font-black text-white">{tile.value}</p>
          </div>
        ))}
      </div>
      <AdminInfoRow label="Giá trị đơn giao thành công">{formatCurrency(orderStats.deliveredValue)}</AdminInfoRow>
      {user.role === 'customer' && (
        <>
          <AdminInfoRow label="Đánh giá đã viết">{feedback.reviews}</AdminInfoRow>
          <AdminInfoRow label="Khiếu nại đã gửi">{feedback.complaints}</AdminInfoRow>
        </>
      )}
    </AdminSection>
  )
}
