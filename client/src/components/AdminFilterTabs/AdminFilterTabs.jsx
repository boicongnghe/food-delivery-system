/**
 * Segmented status filter: [Chờ xử lý (3)] [Đã giải quyết (12)] ...
 * @param {{ value: string, label: string, count?: number }[]} options
 */
export default function AdminFilterTabs({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            value === option.value ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          {option.label}
          {option.count !== undefined && <span className="ml-1.5 opacity-80">({option.count})</span>}
        </button>
      ))}
    </div>
  )
}
