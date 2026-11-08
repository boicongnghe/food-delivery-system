const TONES = {
  red: { active: 'border-brand bg-brand text-white', badge: 'bg-brand text-white', icon: 'text-brand' },
  sky: { active: 'border-sky-700 bg-sky-700 text-white', badge: 'bg-sky-700 text-white', icon: 'text-sky-700' },
  amber: { active: 'border-amber-700 bg-amber-700 text-white', badge: 'bg-amber-700 text-white', icon: 'text-amber-700' },
  green: { active: 'border-emerald-700 bg-emerald-700 text-white', badge: 'bg-emerald-700 text-white', icon: 'text-emerald-700' },
}

/**
 * One tab per step of the kitchen flow. A tab with orders that need the owner now (`urgent`) pulses
 * while another tab is open, so a new order is never missed.
 * @param {{ key, step, label, icon, tone, count, urgent }[]} tabs
 */
export default function BoardTabs({ tabs, activeKey, onChange }) {
  return (
    <div role="tablist" aria-label="Các bước xử lý đơn" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {tabs.map(({ key, step, label, icon: Icon, tone, count, urgent }) => {
        const colors = TONES[tone]
        const isActive = key === activeKey
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={`relative flex items-center gap-3 rounded-lg border px-4 py-3 text-left shadow-sm transition ${
              isActive ? colors.active : 'border-brand-soft/70 bg-white text-slate-800 hover:border-brand-soft'
            }`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : colors.icon}`} />
            <span className="min-w-0 flex-1">
              <span className={`block text-[11px] font-semibold uppercase ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                Bước {step}
              </span>
              <span className="block truncate font-bold">{label}</span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-extrabold ${
                isActive ? 'bg-white text-slate-900' : count > 0 ? colors.badge : 'bg-slate-100 text-slate-500'
              }`}
            >
              {count}
            </span>
            {urgent && !isActive && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
