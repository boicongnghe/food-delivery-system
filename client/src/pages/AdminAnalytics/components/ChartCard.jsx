import { ADMIN_CARD } from '../../../utils/adminClassNames.js'

/**
 * Chart frame: title, legend (only for 2+ series: a single series is named by the title)
 * and a switch to the table view, so no value depends on hovering.
 * @param {{ id, label, color, total? }[]} legend
 */
export default function ChartCard({ title, description, legend = [], showTable, onToggleTable, children }) {
  return (
    <section className={`${ADMIN_CARD} p-5`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onToggleTable}
          aria-pressed={showTable}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/10"
        >
          {showTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
        </button>
      </div>

      {legend.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-300">
          {legend.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
              {item.total !== undefined && <span className="tabular-nums text-slate-500">· {item.total}</span>}
            </li>
          ))}
        </ul>
      )}

      {children}
    </section>
  )
}
