import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import { PENALTY_ACTION_LABELS, PENALTY_TARGET_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'

// Outcome of a handled report: conclusion + penalty (if any)
export default function IssueResolutionView({ resolution }) {
  const { penalty } = resolution

  return (
    <div className="space-y-2 rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-4 text-sm">
      <p className="text-slate-800 dark:text-slate-200">{resolution.note}</p>
      {penalty ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          Xử phạt {PENALTY_TARGET_LABELS[penalty.target].toLowerCase()}:
          <AdminBadge tone={penalty.action === 'warning' ? 'amber' : 'red'}>
            {PENALTY_ACTION_LABELS[penalty.action]}
            {penalty.action === 'fine' && ` ${formatCurrency(penalty.fineAmount)}`}
          </AdminBadge>
        </p>
      ) : (
        <p className="text-xs text-slate-500">Không xử phạt.</p>
      )}
      <p className="text-xs text-slate-500">
        {resolution.by?.fullName} · {formatDateTime(resolution.at)}
      </p>
    </div>
  )
}
