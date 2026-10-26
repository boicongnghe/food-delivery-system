import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import { ADMIN_TABLE_CELL, ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'
import { DELIVERY_ISSUE_STATUSES, DELIVERY_ISSUE_TYPE_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'

export default function DeliveryIssueTable({ issues, onSelect }) {
  return (
    // relative: the sr-only header text is absolutely positioned and must stay inside the scroll box
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="border-b border-slate-800">
          <tr>
            <th className={ADMIN_TABLE_HEAD}>Mã</th>
            <th className={ADMIN_TABLE_HEAD}>Shipper báo cáo</th>
            <th className={ADMIN_TABLE_HEAD}>Nhà hàng</th>
            <th className={ADMIN_TABLE_HEAD}>Sự cố</th>
            <th className={ADMIN_TABLE_HEAD}>Báo cáo lúc</th>
            <th className={ADMIN_TABLE_HEAD}>Trạng thái</th>
            <th className={ADMIN_TABLE_HEAD}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {issues.map((issue) => {
            const status = DELIVERY_ISSUE_STATUSES[issue.status]
            return (
              <tr key={issue._id} className="transition-colors hover:bg-slate-900/60">
                <td className={ADMIN_TABLE_CELL}>
                  <p className="font-mono font-bold text-white">{issue.code}</p>
                  <p className="font-mono text-xs text-slate-500">{issue.orderCode}</p>
                </td>
                <td className={ADMIN_TABLE_CELL}>
                  <p className="text-slate-200">{issue.shipper?.fullName}</p>
                  <p className="text-xs text-slate-500">{issue.shipper?.phone}</p>
                </td>
                <td className={ADMIN_TABLE_CELL}>{issue.restaurant?.name}</td>
                <td className={`${ADMIN_TABLE_CELL} max-w-xs`}>
                  <p className="font-semibold text-slate-200">{DELIVERY_ISSUE_TYPE_LABELS[issue.type]}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{issue.description}</p>
                </td>
                <td className={`${ADMIN_TABLE_CELL} whitespace-nowrap text-xs`}>{formatDateTime(issue.createdAt)}</td>
                <td className={ADMIN_TABLE_CELL}>
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                </td>
                <td className={`${ADMIN_TABLE_CELL} text-right`}>
                  <button
                    type="button"
                    onClick={() => onSelect(issue._id)}
                    className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/10"
                  >
                    {issue.status === 'open' ? 'Xử lý' : 'Xem'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
