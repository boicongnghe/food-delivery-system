import { ADMIN_CARD } from '../../../utils/adminClassNames.js'
import { formatDay } from '../../../utils/formatDate.js'

// Default commission in force today for restaurants or shippers
export default function CurrentRateCard({ icon: Icon, title, base, rule }) {
  return (
    <div className={`${ADMIN_CARD} p-6`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {rule ? (
        <>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {rule.rate}% <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{base}</span>
          </p>
          <p className="mt-2 text-xs font-semibold text-primary">
            {rule.name} · từ {formatDay(rule.effectiveFrom)}
            {rule.effectiveTo ? ` đến ${formatDay(rule.effectiveTo)}` : ''}
          </p>
        </>
      ) : (
        <>
          <p className="text-3xl font-black text-slate-500">0%</p>
          <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">Chưa có quy tắc mặc định áp dụng hôm nay</p>
        </>
      )}
    </div>
  )
}
