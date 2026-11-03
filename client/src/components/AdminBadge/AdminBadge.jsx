const TONES = {
  slate: 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-crave-border text-slate-700 dark:text-slate-300',
  brand: 'border-primary/30 bg-primary/10 text-primary',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  red: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300',
}

// Small status label of the admin pages
export default function AdminBadge({ tone = 'slate', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[11px] font-bold ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
