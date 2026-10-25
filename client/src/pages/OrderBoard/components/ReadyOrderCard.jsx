import { Bike, Check, Info, RefreshCw } from 'lucide-react'
import { formatClock } from '../../../utils/formatTime.js'
import OrderCardHeader from './OrderCardHeader.jsx'

export default function ReadyOrderCard({ order, onView }) {
  const shipperName = order.shipper?.fullName
  const summary = order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')

  const badge = shipperName ? (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] font-bold text-white">
      <Check className="h-3 w-3" />
      SHIPPER ĐÃ NHẬN ĐƠN
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
      <RefreshCw className="h-3 w-3" />
      ĐANG CHỜ SHIPPER NHẬN ĐƠN
    </span>
  )

  return (
    <article
      className={`space-y-3 rounded-lg border bg-white p-4 shadow-sm ${
        shipperName ? 'border-emerald-300' : 'border-brand-soft/70'
      }`}
    >
      <OrderCardHeader orderCode={order.orderCode} badge={badge} onView={onView} />

      {shipperName ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="flex items-center gap-2 font-bold text-emerald-900">
            <Bike className="h-4 w-4" />
            Shipper: {shipperName}
          </p>
          <p className="text-xs text-emerald-800">Đã nhận đơn – đang đến quán lấy hàng</p>
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="flex items-center gap-2 font-bold text-amber-900">
            <RefreshCw className="h-4 w-4 animate-spin [animation-duration:3s]" />
            Đang chờ shipper nhận đơn...
          </p>
          <p className="text-xs text-amber-800">Đơn đang hiển thị cho shipper từ {formatClock(order.readyAt)}</p>
        </div>
      )}

      <div className="border-t border-brand-soft/60 pt-3">
        <p className="font-semibold text-slate-900">{summary}</p>
        <p className="text-xs text-slate-500">Đã đóng gói đồ ăn nóng sẵn sàng tại quầy</p>
      </div>

      <p className="flex items-center gap-1.5 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5 shrink-0" />
        Tự động hoàn tất khi shipper xác nhận đã lấy hàng.
      </p>
    </article>
  )
}
