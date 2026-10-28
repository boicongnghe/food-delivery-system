import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Info } from 'lucide-react'
import reportApi from '../../../api/reportApi.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDay } from '../../../utils/formatDate.js'
import { SETTLEMENT_STATUS } from '../constants.js'
import PayoutAccountInfo from './PayoutAccountInfo.jsx'

const SettlementBadge = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${SETTLEMENT_STATUS[status].className}`}>
    {SETTLEMENT_STATUS[status].label}
  </span>
)

const Figure = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="rounded-xl border border-brand-soft/70 bg-white p-4 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
  </div>
)

// "Chi tiết hoa hồng" tab: weekly settlement cycles and the daily breakdown behind them
export default function CommissionTab({ range }) {
  // Previous result stays on screen (dimmed) until the one of the current range arrives
  const requestKey = `${range.from}_${range.to}`
  const [loaded, setLoaded] = useState({ key: null, data: null })
  const result = loaded.data
  const loading = loaded.key !== requestKey

  useEffect(() => {
    let ignore = false
    reportApi
      .getSettlements(range)
      .then((response) => {
        if (!ignore) setLoaded({ key: requestKey, data: response.data })
      })
      .catch((error) => {
        if (ignore) return
        toast.error(error.response?.data?.message || 'Không tải được chi tiết hoa hồng')
        setLoaded((prev) => ({ ...prev, key: requestKey }))
      })
    return () => {
      ignore = true
    }
  }, [range, requestKey])

  if (!result) {
    return <p className="py-16 text-center text-sm text-slate-500">Đang tải…</p>
  }

  const { totals } = result

  return (
    <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Figure label="Doanh thu gộp" value={formatCurrency(totals.grossRevenue)} />
        <Figure label={`Phí nền tảng (${totals.commissionRate}%)`} value={`−${formatCurrency(totals.platformFee)}`} tone="text-red-700" />
        <Figure label="Đã quyết toán" value={formatCurrency(totals.settledAmount)} tone="text-emerald-700" />
        <Figure label="Chờ chuyển khoản" value={formatCurrency(totals.pendingAmount)} tone="text-amber-700" />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-brand-soft/70 bg-brand-light/60 px-4 py-3 text-xs text-slate-600">
        <PayoutAccountInfo account={result.payoutAccount} />
        <p className="flex items-start gap-1.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          Quyết toán theo tuần (Thứ Hai – Chủ Nhật), chuyển khoản vào Thứ Hai tuần sau. Phí nền tảng = tiền món × tỉ lệ hoa
          hồng của ngày đặt đơn; phí đóng gói và phí giao hàng không tính hoa hồng. Voucher hiện do nền tảng tài trợ nên quán
          nhận đủ tiền món.
        </p>
      </div>

      <section className="rounded-xl border border-brand-soft/70 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 font-serif text-lg font-semibold text-slate-900">Chu kỳ quyết toán</h2>
        {result.cycles.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Chưa có đơn hoàn thành trong kỳ.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.cycles.map((cycle) => (
              <li key={cycle.from} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-900">
                  {formatDay(cycle.from)} – {formatDay(cycle.to)}
                </span>
                <span className="text-slate-500">{cycle.deliveredOrders} đơn</span>
                <span className="text-slate-500">Chuyển khoản {formatDay(cycle.payoutDate)}</span>
                {cycle.isPartial && <span className="text-xs text-slate-400">(một phần chu kỳ nằm ngoài kỳ đang xem)</span>}
                <span className="ml-auto font-bold tabular-nums text-slate-900">{formatCurrency(cycle.netRevenue)}</span>
                <SettlementBadge status={cycle.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-brand-soft/70 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 font-serif text-lg font-semibold text-slate-900">Chi tiết theo ngày</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-brand-light/50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Ngày</th>
                <th className="px-4 py-2.5 text-right">Số đơn</th>
                <th className="px-4 py-2.5 text-right">Doanh thu gộp</th>
                <th className="px-4 py-2.5 text-right">Tỉ lệ</th>
                <th className="px-4 py-2.5 text-right">Phí nền tảng</th>
                <th className="px-4 py-2.5 text-right">Voucher quán</th>
                <th className="px-4 py-2.5 text-right">Thực nhận</th>
                <th className="px-4 py-2.5">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {result.days.map((day) => (
                <tr key={day.day}>
                  <td className="px-4 py-2.5 text-slate-800">{formatDay(day.day)}</td>
                  <td className="px-4 py-2.5 text-right">{day.deliveredOrders}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(day.grossRevenue)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{day.commissionRate}%</td>
                  <td className="px-4 py-2.5 text-right text-red-700">−{formatCurrency(day.platformFee)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(day.restaurantVoucher)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(day.netRevenue)}</td>
                  <td className="px-4 py-2.5">
                    <SettlementBadge status={day.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            {result.days.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 font-bold tabular-nums">
                <tr>
                  <td className="px-4 py-2.5">Tổng</td>
                  <td className="px-4 py-2.5 text-right">{totals.deliveredOrders}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(totals.grossRevenue)}</td>
                  <td className="px-4 py-2.5 text-right">{totals.commissionRate}%</td>
                  <td className="px-4 py-2.5 text-right text-red-700">−{formatCurrency(totals.platformFee)}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(totals.restaurantVoucher)}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(totals.netRevenue)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  )
}
