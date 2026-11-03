import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { DELIVERY_ISSUE_TYPE_LABELS, PENALTY_ACTION_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDate } from '../../../utils/formatDate.js'

// Penalties received from delivery issue reports (UC45), newest first
export default function UserViolationList({ violations }) {
  return (
    <AdminSection
      title="Lịch sử vi phạm"
      aside={<AdminBadge tone={violations.total > 0 ? 'red' : 'slate'}>{violations.total} lần</AdminBadge>}
    >
      {violations.items.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có vi phạm nào.</p>
      ) : (
        <ul className="space-y-2">
          {violations.items.map((violation) => {
            const { penalty, note, at } = violation.resolution
            return (
              <li key={violation._id} className="rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {violation.code} · {DELIVERY_ISSUE_TYPE_LABELS[violation.type]}
                  </p>
                  <AdminBadge tone={penalty.action === 'warning' ? 'amber' : 'red'}>
                    {PENALTY_ACTION_LABELS[penalty.action]}
                    {penalty.action === 'fine' && ` ${formatCurrency(penalty.fineAmount)}`}
                  </AdminBadge>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Đơn {violation.orderCode} · {formatDate(at)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </AdminSection>
  )
}
