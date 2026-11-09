import { Check, ReceiptText } from 'lucide-react'
import SectionCard from './SectionCard.jsx'

function formatVND(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`
}

function TripLedger({ trips, periodLabel }) {
  const total = trips.reduce((sum, trip) => sum + Number(trip.baseFare || 0) + Number(trip.bonus || 0), 0)

  return (
    <SectionCard
      id="trip-ledger-section"
      title={`Biên lai chuyến xe · ${periodLabel.toLowerCase()}`}
      icon={ReceiptText}
      badge={`${trips.length} cuốc đã ghi nhận`}
      bodyClassName=""
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm" aria-label="Trip receipts">
          <thead className="bg-brand-light/50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">Mã cuốc &amp; Giờ</th>
              <th scope="col" className="px-4 py-2.5">Quán ăn &amp; Địa chỉ</th>
              <th scope="col" className="px-4 py-2.5">Khoảng cách</th>
              <th scope="col" className="px-4 py-2.5 text-right">Chi tiết thu nhập</th>
              <th scope="col" className="px-4 py-2.5 text-right">Thực nhận</th>
              <th scope="col" className="px-4 py-2.5 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map(trip => (
              <tr key={trip.id} className="hover:bg-brand-light/30">
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs font-semibold text-slate-900">{trip.id}</span>
                  <div className="mt-0.5 text-xs text-slate-500">{trip.time}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-slate-800">{trip.restaurant}</div>
                  <div className="text-xs text-slate-500">{trip.address}</div>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{trip.distance}</td>
                <td className="px-4 py-2.5 text-right text-xs leading-relaxed text-slate-500">
                  <div>Cước: {formatVND(trip.baseFare)}</div>
                  {trip.bonus > 0 && <div>Thưởng: {formatVND(trip.bonus)}</div>}
                </td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">
                  {formatVND(Number(trip.baseFare || 0) + Number(trip.bonus || 0))}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {trip.status}
                  </span>
                </td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">
                  Chưa có chuyến xe trong kỳ này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">Tổng {trips.length} chuyến</div>
          <div className="mt-0.5 text-xs text-slate-500">Tổng cước và thưởng, không gồm tiền tip</div>
        </div>
        <div className="text-xl font-bold tabular-nums text-brand">{formatVND(total)}</div>
      </div>
    </SectionCard>
  )
}

export default TripLedger
