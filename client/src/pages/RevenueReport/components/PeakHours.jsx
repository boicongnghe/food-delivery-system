import { Clock } from 'lucide-react'
import { PEAK_BAR_COLOR } from '../constants.js'

const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`

// Completed orders per hour of the day (Vietnam time) and the two busiest 2-hour windows
export default function PeakHours({ peakHours }) {
  const max = Math.max(1, ...peakHours.hours.map((item) => item.orders))
  const isPeak = (hour) => peakHours.busiest.some((window) => hour >= window.fromHour && hour < window.toHour)

  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-900">
        <Clock className="h-5 w-5 text-brand" aria-hidden="true" />
        Khung giờ cao điểm
      </h2>

      {peakHours.busiest.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Chưa có đơn hoàn thành trong kỳ.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {peakHours.busiest.map((window) => (
              <li key={window.fromHour} className="flex items-center justify-between rounded-lg bg-brand-light px-3 py-2 text-sm">
                <span className="font-bold tabular-nums text-slate-900">
                  {formatHour(window.fromHour)} – {formatHour(window.toHour)}
                </span>
                <span className="text-slate-600">
                  <b className="tabular-nums text-slate-900">{window.orders}</b> đơn · {window.share}%
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4" role="img" aria-label="Số đơn hoàn thành theo từng giờ trong ngày">
            <div className="flex h-24 items-end gap-[2px]">
              {peakHours.hours.map((item) => (
                <div
                  key={item.hour}
                  title={`${formatHour(item.hour)}: ${item.orders} đơn`}
                  className="flex-1 rounded-t-[3px]"
                  style={{
                    height: `${item.orders ? Math.max(4, (item.orders / max) * 100) : 0}%`,
                    backgroundColor: PEAK_BAR_COLOR,
                    opacity: isPeak(item.hour) ? 1 : 0.35,
                  }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-[10px] tabular-nums text-slate-500">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Cột đậm là khung cao điểm – nên tăng người bếp và chuẩn bị nguyên liệu trước.</p>
        </>
      )}
    </section>
  )
}
