const EDGE_PX = 100

/**
 * One tooltip for every series at the hovered period: value first (strong), series name after,
 * keyed by a short line of the series color.
 * @param {number} x - horizontal center of the hovered column inside the chart container
 */
export default function ChartTooltip({ x, containerWidth, title, rows, extraRows = [] }) {
  // Keep the tooltip inside the chart near the left / right edge
  const translate = x < EDGE_PX ? '0' : x > containerWidth - EDGE_PX ? '-100%' : '-50%'

  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-crave-dark/95 px-3 py-2 text-xs shadow-xl"
      style={{ left: x, transform: `translateX(${translate})` }}
    >
      <p className="mb-1 font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2 py-0.5">
          <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="font-bold tabular-nums text-slate-900 dark:text-white">{row.value}</span>
          <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
        </p>
      ))}
      {extraRows.map((row) => (
        <p key={row.label} className="mt-1 flex items-center gap-2 border-t border-slate-100 dark:border-crave-border pt-1">
          <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{row.value}</span>
          <span className="text-slate-500">{row.label}</span>
        </p>
      ))}
    </div>
  )
}
