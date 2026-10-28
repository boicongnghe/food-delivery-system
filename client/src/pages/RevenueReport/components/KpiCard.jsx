import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

// Percent change vs the previous period; null when there is nothing to compare with
const percentChange = (current, previous) => {
  if (previous === undefined || previous === null) return null
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/**
 * Headline number of the period. The change arrow carries direction with an icon + sign, not color alone.
 * @param {boolean} [lowerIsBetter] - e.g. reject rate: a drop is good news
 */
export default function KpiCard({ icon: Icon, label, value, current, previous, detail, lowerIsBetter = false }) {
  const change = percentChange(current, previous)
  const isGood = change !== null && (lowerIsBetter ? change < 0 : change > 0)
  const isBad = change !== null && (lowerIsBetter ? change > 0 : change < 0)
  const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus

  return (
    <div className="rounded-xl border border-brand-soft/70 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && (
          <span className="rounded-lg bg-brand-light p-2 text-brand">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        {change !== null && (
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-bold tabular-nums ${
              isGood ? 'bg-emerald-50 text-emerald-700' : isBad ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
            }`}
            title="So với kỳ trước cùng độ dài"
          >
            <ChangeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        )}
        {detail && <span>{detail}</span>}
      </div>
    </div>
  )
}
