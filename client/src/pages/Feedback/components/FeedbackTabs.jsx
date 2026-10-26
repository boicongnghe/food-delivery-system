/**
 * @param {{ value: string, label: string, count: number, icon: import('react').ComponentType }[]} tabs
 */
export default function FeedbackTabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map(({ value: tabValue, label, count, icon: Icon }) => (
        <button
          key={tabValue}
          type="button"
          role="tab"
          aria-selected={value === tabValue}
          onClick={() => onChange(tabValue)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            value === tabValue
              ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
              : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
          <span
            className={`rounded-full px-2 text-xs ${value === tabValue ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}
          >
            {count}
          </span>
        </button>
      ))}
    </div>
  )
}
