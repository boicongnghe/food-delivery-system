// "Label ........ value" line of an admin drawer
export default function AdminInfoRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 text-right font-medium text-slate-800 dark:text-slate-200">{children}</span>
    </div>
  )
}
