const TONES = {
  red: { border: 'border-l-brand', count: 'bg-brand', icon: 'text-brand' },
  amber: { border: 'border-l-amber-700', count: 'bg-amber-700', icon: 'text-amber-700' },
  green: { border: 'border-l-emerald-700', count: 'bg-emerald-700', icon: 'text-emerald-700' },
}

// One kanban column: header (icon, title, count) + list of cards
export default function OrderColumn({ title, icon: Icon, count, tone, isEmpty, emptyText, children }) {
  const colors = TONES[tone]

  return (
    <section className="flex flex-col gap-4">
      <header
        className={`flex items-center justify-between gap-2 rounded-lg border border-brand-soft/60 border-l-4 bg-white px-4 py-3 shadow-sm ${colors.border}`}
      >
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold uppercase text-slate-900">
          <Icon className={`h-5 w-5 ${colors.icon}`} />
          {title}
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${colors.count}`}>{count} ĐƠN</span>
      </header>

      {isEmpty ? (
        <p className="rounded-lg border border-dashed border-brand-soft bg-white/60 px-4 py-10 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        children
      )}
    </section>
  )
}
