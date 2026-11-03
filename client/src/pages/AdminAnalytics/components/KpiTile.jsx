import { ADMIN_CARD } from '../../../utils/adminClassNames.js'

// Stat tile: label · value · supporting line
export default function KpiTile({ icon: Icon, label, value, detail }) {
  return (
    <div className={`${ADMIN_CARD} p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      {detail && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  )
}
