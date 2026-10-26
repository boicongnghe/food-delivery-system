const TONES = {
  slate: 'border-slate-700 bg-slate-800 text-slate-300',
  purple: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  red: 'border-red-500/30 bg-red-500/10 text-red-300',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
}

// Small status label on the dark admin theme
export default function AdminBadge({ tone = 'slate', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[11px] font-bold ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
