import { Link } from 'react-router-dom'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import { ADMIN_CARD } from '../../../utils/adminClassNames.js'
import { PENALTY_ACTION_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'

// Complaints (UC42) and delivery issues (UC45) received in the period
export default function OperationsSummary({ complaints, deliveryIssues }) {
  return (
    <section className={`${ADMIN_CARD} grid gap-6 p-5 sm:grid-cols-2`}>
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Khiếu nại</h2>
          <Link to="/admin/complaints" className="text-xs font-bold text-primary hover:underline">
            Xử lý →
          </Link>
        </div>
        <div className="mt-2">
          <AdminInfoRow label="Tiếp nhận">{complaints.all}</AdminInfoRow>
          <AdminInfoRow label="Chờ xử lý">{complaints.open}</AdminInfoRow>
          <AdminInfoRow label="Đã giải quyết">{complaints.resolved}</AdminInfoRow>
          <AdminInfoRow label="Không chấp nhận">{complaints.rejected}</AdminInfoRow>
          <AdminInfoRow label="Hoàn tiền khiếu nại">{formatCurrency(complaints.refundAmount)}</AdminInfoRow>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Sự cố giao hàng</h2>
          <Link to="/admin/delivery-issues" className="text-xs font-bold text-primary hover:underline">
            Xử lý →
          </Link>
        </div>
        <div className="mt-2">
          <AdminInfoRow label="Tiếp nhận">{deliveryIssues.all}</AdminInfoRow>
          <AdminInfoRow label="Chờ xử lý">{deliveryIssues.open}</AdminInfoRow>
          <AdminInfoRow label="Đã xử lý / bác bỏ">
            {deliveryIssues.resolved} / {deliveryIssues.dismissed}
          </AdminInfoRow>
          {Object.entries(PENALTY_ACTION_LABELS).map(([action, label]) => (
            <AdminInfoRow key={action} label={`Xử phạt: ${label.toLowerCase()}`}>
              {deliveryIssues.penalties[action]}
            </AdminInfoRow>
          ))}
        </div>
      </div>
    </section>
  )
}
