import { ImageIcon } from 'lucide-react'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import { ADMIN_TABLE_CELL, ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '../../../utils/feedbackLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { COMPLAINT_STATUS_TONES } from '../constants.js'

export default function ComplaintTable({ complaints, onSelect }) {
  return (
    // relative: the sr-only header text is absolutely positioned and must stay inside the scroll box
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[860px]">
        <thead className="border-b border-slate-800">
          <tr>
            <th className={ADMIN_TABLE_HEAD}>Mã</th>
            <th className={ADMIN_TABLE_HEAD}>Khách hàng</th>
            <th className={ADMIN_TABLE_HEAD}>Nhà hàng</th>
            <th className={ADMIN_TABLE_HEAD}>Vấn đề</th>
            <th className={ADMIN_TABLE_HEAD}>Gửi lúc</th>
            <th className={ADMIN_TABLE_HEAD}>Trạng thái</th>
            <th className={ADMIN_TABLE_HEAD}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {complaints.map((complaint) => (
            <tr key={complaint._id} className="transition-colors hover:bg-slate-900/60">
              <td className={ADMIN_TABLE_CELL}>
                <p className="font-mono font-bold text-white">{complaint.code}</p>
                <p className="font-mono text-xs text-slate-500">{complaint.orderCode}</p>
              </td>
              <td className={ADMIN_TABLE_CELL}>
                <p className="text-slate-200">{complaint.customer?.fullName}</p>
                <p className="text-xs text-slate-500">{complaint.customer?.email}</p>
              </td>
              <td className={ADMIN_TABLE_CELL}>{complaint.restaurant?.name}</td>
              <td className={`${ADMIN_TABLE_CELL} max-w-xs`}>
                <p className="flex items-center gap-1.5 font-semibold text-slate-200">
                  {COMPLAINT_CATEGORY_LABELS[complaint.category]}
                  {complaint.images.length > 0 && <ImageIcon className="h-3.5 w-3.5 text-slate-500" />}
                </p>
                <p className="line-clamp-1 text-xs text-slate-500">{complaint.description}</p>
              </td>
              <td className={`${ADMIN_TABLE_CELL} whitespace-nowrap text-xs`}>{formatDateTime(complaint.createdAt)}</td>
              <td className={ADMIN_TABLE_CELL}>
                <AdminBadge tone={COMPLAINT_STATUS_TONES[complaint.status]}>
                  {COMPLAINT_STATUS_LABELS[complaint.status]}
                </AdminBadge>
              </td>
              <td className={`${ADMIN_TABLE_CELL} text-right`}>
                <button
                  type="button"
                  onClick={() => onSelect(complaint._id)}
                  className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/10"
                >
                  {complaint.status === 'open' ? 'Xử lý' : 'Xem'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
