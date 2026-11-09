import { useState } from 'react'
import { BarChart3, Sunset } from 'lucide-react'
import SectionCard from './SectionCard.jsx'

const MAX_BAR_H = 120

function LegendItem({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} aria-hidden="true" />
      {label}
    </span>
  )
}

function EarningsChart({ earningsByHour, forecast, periodLabel }) {
  const [hovered, setHovered] = useState(null)
  const maxTotal = Math.max(
    1,
    ...earningsByHour.map(item => Number(item.base || 0) + Number(item.bonus || 0)),
  )
  const activeEarning = Number.isInteger(hovered) ? earningsByHour[hovered] : null
  const activeTotal = Number(activeEarning?.base || 0) + Number(activeEarning?.bonus || 0)

  return (
    <SectionCard id="earnings-chart-section" title="Biểu đồ thu nhập theo khung giờ" icon={BarChart3} badge={periodLabel}>
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <LegendItem className="bg-slate-500" label="Phí giao đơn" />
          <LegendItem className="bg-emerald-600" label="Thưởng" />
          <LegendItem className="border border-dashed border-sky-700 bg-sky-200" label="Dự báo ca tối" />
        </div>

        {activeEarning ? (
          <div className="rounded-lg bg-brand-light/60 px-3 py-2 text-sm" aria-live="polite">
            <div className="flex justify-between font-bold text-slate-900">
              <span>{activeEarning.hour}</span>
              <span className="tabular-nums">{activeTotal.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="mt-0.5 flex gap-4 text-xs text-slate-600">
              <span>Cước {Number(activeEarning.base || 0).toLocaleString('vi-VN')}đ</span>
              <span>Thưởng {Number(activeEarning.bonus || 0).toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Chọn một cột để xem chi tiết thu nhập.</p>
        )}

        {/* Bars */}
        <div className="relative flex h-[156px] items-end gap-1.5 overflow-x-auto border-b border-slate-200 pb-6" role="group" aria-label="Hourly earnings chart">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[120px] flex-col justify-between" aria-hidden="true">
            {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-dashed border-slate-100" />)}
          </div>

          {/* Actual data */}
          {earningsByHour.map((d, i) => {
            const base = Number(d.base || 0)
            const bonus = Number(d.bonus || 0)
            const total = base + bonus
            const baseH = (base / maxTotal) * MAX_BAR_H
            const bonusH = (bonus / maxTotal) * MAX_BAR_H

            return (
              <div
                key={i}
                className={`relative flex min-w-[28px] flex-1 cursor-pointer flex-col items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  hovered === i ? 'bg-brand-light/70' : ''
                }`}
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                onClick={() => setHovered(i)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setHovered(i)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={hovered === i}
                aria-label={`${d.hour}: ${total.toLocaleString('vi-VN')}đ`}
              >
                <div className="flex w-full flex-col-reverse">
                  {baseH > 0 && <div className="w-full rounded-b-sm bg-slate-500" style={{ height: `${baseH}px` }} />}
                  {bonusH > 0 && <div className="w-full rounded-t-sm bg-emerald-600" style={{ height: `${bonusH}px` }} />}
                </div>
                <span className="absolute -bottom-5 whitespace-nowrap text-[10px] text-slate-500">{d.hour}</span>
              </div>
            )
          })}

          {/* Forecast bars */}
          {forecast.map((f, i) => (
            <div key={`f-${i}`} className="relative flex min-w-[28px] flex-1 flex-col items-center opacity-50" aria-label={`${f.hour} dự báo`}>
              <div
                className="w-full rounded-t-sm border border-dashed border-sky-700 bg-sky-200"
                style={{ height: `${(f.demand / 100) * MAX_BAR_H}px` }}
              />
              <span className="absolute -bottom-5 whitespace-nowrap text-[10px] text-slate-500">{f.hour}</span>
            </div>
          ))}
          {earningsByHour.length === 0 && forecast.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Chưa có dữ liệu thu nhập theo giờ.</div>
          )}
        </div>

        <p className="text-xs text-slate-500">{earningsByHour.length} khung giờ có dữ liệu thu nhập</p>

        {forecast.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900" role="note">
            <Sunset className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span><strong>Dự báo nhu cầu</strong> được đồng bộ từ dữ liệu dashboard.</span>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export default EarningsChart
