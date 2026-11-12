import { HEARING_STATES } from '../../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { HEARING_CASE_LABELS } from '../../../utils/hearingLabels.js'

const STATE_CLASSES = {
  open: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
}

/**
 * Hearings of the current party (delivery issues and complaints), newest first.
 * @param {{ _id, caseType, code, orderCode, kind, restaurantName, deadline, hearingState }[]} items
 * @param {string | null} selectedId
 * @param {(item: object) => void} onSelect
 */
export default function HearingCaseList({ items, selectedId, onSelect }) {
  return (
    <ul className="space-y-2" aria-label="Danh sách phiên đối chất">
      {items.map((item) => {
        const selected = item._id === selectedId
        const labels = HEARING_CASE_LABELS[item.caseType]
        return (
          <li key={item._id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              aria-current={selected ? 'true' : undefined}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{item.code}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATE_CLASSES[item.hearingState]}`}>
                  {item.hearingState === 'open' ? HEARING_STATES.open.label : 'Đã kết thúc'}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {labels.noun}: {labels.kindLabels[item.kind]}
              </p>
              <p className="text-xs text-slate-500">
                Đơn #{item.orderCode} · {item.restaurantName}
              </p>
              {item.hearingState === 'open' && (
                <p className="mt-1 text-xs text-sky-700 dark:text-sky-300">Hạn trao đổi: {formatDateTime(item.deadline)}</p>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
