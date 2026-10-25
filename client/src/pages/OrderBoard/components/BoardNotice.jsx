const TONES = {
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  danger: 'border-red-300 bg-red-50 text-red-900',
}

// Banner above the columns: connection problems, restaurant not allowed to accept orders...
export default function BoardNotice({ tone = 'warning', icon: Icon, title, children, actionLabel, onAction }) {
  return (
    <div role="status" className={`mb-5 flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3 ${TONES[tone]}`}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">{title}</p>
        {children && <p className="mt-0.5">{children}</p>}
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-md border border-current bg-white px-3 py-1.5 text-sm font-semibold hover:opacity-80"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
