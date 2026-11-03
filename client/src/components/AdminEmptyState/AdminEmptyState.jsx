export default function AdminEmptyState({ children }) {
  return (
    <div className="m-5 rounded-2xl border border-dashed border-slate-100 dark:border-crave-border bg-slate-50/70 dark:bg-crave-dark/40 py-12 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}
