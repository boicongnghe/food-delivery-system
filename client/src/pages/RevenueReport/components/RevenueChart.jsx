import { useState } from 'react'
import { ChartColumn, Table } from 'lucide-react'
import useElementWidth from '../../../hooks/useElementWidth.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { columnPath, formatCompact, formatPeriodLong, formatPeriodShort, niceTicks } from '../../AdminAnalytics/chartUtils.js'
import { REVENUE_SERIES } from '../constants.js'

const HEIGHT = 260
const MARGIN = { top: 12, right: 8, bottom: 28, left: 52 }
const MAX_BAR_WIDTH = 24
const SEGMENT_GAP = 2
const END_RADIUS = 4
const MIN_LABEL_SPACING = 56
const TOOLTIP_EDGE_PX = 110

/**
 * Stacked gross revenue per period: dishes + toppings + packaging (bottom to top).
 * Hover a column, or focus the chart and use ←/→, to read the period; the table view is always one click away.
 */
export default function RevenueChart({ series, groupBy }) {
  const [containerRef, width] = useElementWidth()
  const [activeIndex, setActiveIndex] = useState(null)
  const [showTable, setShowTable] = useState(false)

  const unitLabel = groupBy === 'month' ? 'tháng' : 'ngày'
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const ticks = niceTicks(Math.max(0, ...series.map((point) => point.grossRevenue)))
  const scale = (value) => (value / ticks[ticks.length - 1]) * plotHeight
  const band = series.length > 0 ? plotWidth / series.length : 0
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(2, band * 0.7))
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_SPACING / Math.max(band, 1)))
  const activePoint = activeIndex === null ? null : series[activeIndex]
  const legend = REVENUE_SERIES.map((item) => ({
    ...item,
    total: series.reduce((sum, point) => sum + point[item.id], 0),
  }))

  const handleKeyDown = (event) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    setActiveIndex((index) => Math.min(series.length - 1, Math.max(0, (index ?? 0) + moves[event.key])))
  }

  const tooltipX = activeIndex === null ? 0 : MARGIN.left + activeIndex * band + band / 2
  const tooltipShift = tooltipX < TOOLTIP_EDGE_PX ? '0' : tooltipX > width - TOOLTIP_EDGE_PX ? '-100%' : '-50%'

  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-slate-900">Doanh thu gộp theo {unitLabel}</h2>
          <p className="text-xs text-slate-500">Chỉ gồm đơn hoàn thành · không gồm phí giao hàng (thuộc shipper)</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-soft px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-brand-light"
        >
          {showTable ? <ChartColumn className="h-4 w-4" /> : <Table className="h-4 w-4" />}
          {showTable ? 'Xem biểu đồ' : 'Xem bảng'}
        </button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {legend.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <span className="text-slate-600">{item.label}</span>
            <span className="font-bold tabular-nums text-slate-900">{formatCurrency(item.total)}</span>
          </li>
        ))}
      </ul>

      {/* Always mounted: the chart width is measured on this element */}
      <div ref={containerRef} className="relative mt-4" onMouseLeave={() => setActiveIndex(null)}>
        {showTable ? (
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Kỳ</th>
                  <th className="py-2 pr-3 text-right">Đơn</th>
                  {REVENUE_SERIES.map((item) => (
                    <th key={item.id} className="py-2 pr-3 text-right">
                      {item.label}
                    </th>
                  ))}
                  <th className="py-2 text-right">Doanh thu gộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {series.map((point) => (
                  <tr key={point.key}>
                    <td className="py-1.5 pr-3 text-slate-700">{formatPeriodLong(point.key)}</td>
                    <td className="py-1.5 pr-3 text-right">{point.deliveredOrders}</td>
                    {REVENUE_SERIES.map((item) => (
                      <td key={item.id} className="py-1.5 pr-3 text-right">
                        {formatCurrency(point[item.id])}
                      </td>
                    ))}
                    <td className="py-1.5 text-right font-semibold text-slate-900">{formatCurrency(point.grossRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {width > 0 && (
              <svg
                width={width}
                height={HEIGHT}
                role="img"
                aria-label={`Biểu đồ cột chồng doanh thu gộp theo ${unitLabel}. Dùng phím mũi tên trái phải để xem từng kỳ.`}
                tabIndex={0}
                onFocus={() => setActiveIndex((index) => index ?? series.length - 1)}
                onBlur={() => setActiveIndex(null)}
                onKeyDown={handleKeyDown}
                className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                  {ticks.map((tick) => (
                    <g key={tick} transform={`translate(0,${plotHeight - scale(tick)})`}>
                      {tick > 0 && <line x2={plotWidth} stroke="#f1f5f9" strokeWidth="1" />}
                      <text x="-8" dy="0.32em" textAnchor="end" className="fill-slate-500 text-[10px] tabular-nums">
                        {formatCompact(tick)}
                      </text>
                    </g>
                  ))}

                  {series.map((point, index) => {
                    const x = index * band + (band - barWidth) / 2
                    const segments = REVENUE_SERIES.filter((item) => point[item.id] > 0)
                    const isDimmed = activeIndex !== null && activeIndex !== index
                    let top = plotHeight
                    return (
                      <g key={point.key} onMouseEnter={() => setActiveIndex(index)}>
                        <rect x={index * band} width={band} height={plotHeight} fill="transparent" />
                        {segments.map((item, segmentIndex) => {
                          const gap = segmentIndex > 0 ? SEGMENT_GAP : 0
                          const segmentHeight = Math.max(1, scale(point[item.id]) - gap)
                          top -= segmentHeight + gap
                          return (
                            <path
                              key={item.id}
                              d={columnPath(x, top, barWidth, segmentHeight, segmentIndex === segments.length - 1 ? END_RADIUS : 0)}
                              fill={item.color}
                              opacity={isDimmed ? 0.4 : 1}
                            />
                          )
                        })}
                      </g>
                    )
                  })}

                  <line y1={plotHeight} y2={plotHeight} x2={plotWidth} stroke="#cbd5e1" strokeWidth="1" />
                  {series.map(
                    (point, index) =>
                      index % labelEvery === 0 && (
                        <text
                          key={point.key}
                          x={index * band + band / 2}
                          y={plotHeight + 18}
                          textAnchor="middle"
                          className="fill-slate-500 text-[10px] tabular-nums"
                        >
                          {formatPeriodShort(point.key)}
                        </text>
                      ),
                  )}
                </g>
              </svg>
            )}

            {activePoint && (
              <div
                role="status"
                className="pointer-events-none absolute top-0 z-10 min-w-48 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg"
                style={{ left: tooltipX, transform: `translateX(${tooltipShift})` }}
              >
                <p className="mb-1 font-semibold text-slate-500">
                  {formatPeriodLong(activePoint.key)} · {activePoint.deliveredOrders} đơn
                </p>
                {REVENUE_SERIES.map((item) => (
                  <p key={item.id} className="flex items-center gap-2 py-0.5">
                    <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-bold tabular-nums text-slate-900">{formatCurrency(activePoint[item.id])}</span>
                    <span className="text-slate-500">{item.label}</span>
                  </p>
                ))}
                <p className="mt-1 border-t border-slate-100 pt-1 text-slate-600">
                  Gộp <b className="tabular-nums text-slate-900">{formatCurrency(activePoint.grossRevenue)}</b> · thực nhận{' '}
                  <b className="tabular-nums text-slate-900">{formatCurrency(activePoint.netRevenue)}</b>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
