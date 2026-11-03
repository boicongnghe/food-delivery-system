import { useState } from 'react'
import useElementWidth from '../../../hooks/useElementWidth.js'
import { columnPath, niceTicks } from '../chartUtils.js'
import ChartTooltip from './ChartTooltip.jsx'

const MARGIN = { top: 12, right: 8, bottom: 28, left: 52 }
const MAX_BAR_WIDTH = 24
const SEGMENT_GAP = 2 // surface gap between stacked segments
const END_RADIUS = 4
const MIN_LABEL_SPACING = 56 // px between x-axis labels
// Classes instead of fixed colors so the grid follows the light / dark theme
const GRID_CLASS = 'stroke-slate-100 dark:stroke-crave-border'
const BASELINE_CLASS = 'stroke-slate-300 dark:stroke-slate-700'

/**
 * Stacked column chart (one series = plain columns), drawn at the container's real width.
 * Hover a column, or focus the chart and use ←/→, to read every series of that period in one tooltip.
 * @param {{ key: string, label: string, title: string, values: Object<string, number>, extraRows?: object[] }[]} points
 * @param {{ id: string, label: string, color: string }[]} series - bottom to top
 */
export default function ColumnChart({ points, series, height = 240, integer = false, formatValue, formatTick, ariaLabel }) {
  const [containerRef, width] = useElementWidth()
  const [activeIndex, setActiveIndex] = useState(null)

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const totals = points.map((point) => series.reduce((sum, item) => sum + (point.values[item.id] || 0), 0))
  const ticks = niceTicks(Math.max(0, ...totals), { integer })
  const scale = (value) => (value / ticks[ticks.length - 1]) * plotHeight
  const band = points.length > 0 ? plotWidth / points.length : 0
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(2, band * 0.7))
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_SPACING / Math.max(band, 1)))
  const activePoint = activeIndex === null ? null : points[activeIndex]

  const handleKeyDown = (event) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    setActiveIndex((index) => Math.min(points.length - 1, Math.max(0, (index ?? 0) + moves[event.key])))
  }

  return (
    <div ref={containerRef} className="relative" onMouseLeave={() => setActiveIndex(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${ariaLabel}. Dùng phím mũi tên trái phải để xem từng kỳ.`}
          tabIndex={0}
          onFocus={() => setActiveIndex((index) => index ?? points.length - 1)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
          className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {ticks.map((tick) => (
              <g key={tick} transform={`translate(0,${plotHeight - scale(tick)})`}>
                {tick > 0 && <line x2={plotWidth} className={GRID_CLASS} strokeWidth="1" />}
                <text x="-8" dy="0.32em" textAnchor="end" className="fill-slate-500 text-[10px] tabular-nums">
                  {formatTick(tick)}
                </text>
              </g>
            ))}

            {points.map((point, index) => {
              const x = index * band + (band - barWidth) / 2
              const segments = series.filter((item) => point.values[item.id] > 0)
              const isDimmed = activeIndex !== null && activeIndex !== index
              let top = plotHeight

              return (
                <g key={point.key} onMouseEnter={() => setActiveIndex(index)}>
                  {/* Hit target: the whole band, not only the painted column */}
                  <rect x={index * band} width={band} height={plotHeight} fill="transparent" />
                  {segments.map((item, segmentIndex) => {
                    const gap = segmentIndex > 0 ? SEGMENT_GAP : 0
                    const segmentHeight = Math.max(1, scale(point.values[item.id]) - gap)
                    top -= segmentHeight + gap
                    const isTopSegment = segmentIndex === segments.length - 1
                    return (
                      <path
                        key={item.id}
                        d={columnPath(x, top, barWidth, segmentHeight, isTopSegment ? END_RADIUS : 0)}
                        fill={item.color}
                        opacity={isDimmed ? 0.45 : 1}
                      />
                    )
                  })}
                </g>
              )
            })}

            <line y1={plotHeight} y2={plotHeight} x2={plotWidth} className={BASELINE_CLASS} strokeWidth="1" />
            {points.map(
              (point, index) =>
                index % labelEvery === 0 && (
                  <text
                    key={point.key}
                    x={index * band + band / 2}
                    y={plotHeight + 18}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] tabular-nums"
                  >
                    {point.label}
                  </text>
                ),
            )}
          </g>
        </svg>
      )}

      {activePoint && (
        <ChartTooltip
          x={MARGIN.left + activeIndex * band + band / 2}
          containerWidth={width}
          title={activePoint.title}
          rows={series.map((item) => ({
            label: item.label,
            color: item.color,
            value: formatValue(activePoint.values[item.id] || 0),
          }))}
          extraRows={activePoint.extraRows}
        />
      )}
    </div>
  )
}
