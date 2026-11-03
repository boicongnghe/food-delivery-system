import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminPartnerStatusBadge from '../../../components/AdminPartnerStatusBadge/AdminPartnerStatusBadge.jsx'
import { ADMIN_TABLE_CELL, ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'
import { formatDate } from '../../../utils/formatDate.js'

export default function ShipperTable({ shippers, onSelect }) {
  return (
    // relative: the sr-only header text is absolutely positioned and must stay inside the scroll box
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="border-b border-slate-100 dark:border-crave-border">
          <tr>
            <th className={ADMIN_TABLE_HEAD}>Tài xế</th>
            <th className={ADMIN_TABLE_HEAD}>Số điện thoại</th>
            <th className={ADMIN_TABLE_HEAD}>Loại xe & biển số</th>
            <th className={ADMIN_TABLE_HEAD}>Đăng ký</th>
            <th className={ADMIN_TABLE_HEAD}>Trạng thái</th>
            <th className={ADMIN_TABLE_HEAD}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-crave-border">
          {shippers.map((shipper) => (
            <tr key={shipper._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
              <td className={ADMIN_TABLE_CELL}>
                <div className="flex items-center gap-3">
                  <img src={shipper.user?.avatar} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 dark:text-white">
                      {shipper.fullName || shipper.user?.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{shipper.user?.email}</p>
                  </div>
                </div>
              </td>
              <td className={ADMIN_TABLE_CELL}>{shipper.phone || shipper.user?.phone || '—'}</td>
              <td className={ADMIN_TABLE_CELL}>
                <p className="max-w-xs truncate">{shipper.vehicleInfo || '—'}</p>
              </td>
              <td className={ADMIN_TABLE_CELL}>{formatDate(shipper.createdAt)}</td>
              <td className={ADMIN_TABLE_CELL}>
                <div className="flex flex-wrap gap-1.5">
                  <AdminPartnerStatusBadge status={shipper.status} />
                  {shipper.user && !shipper.user.isActive && <AdminBadge tone="red">TK bị khóa</AdminBadge>}
                </div>
              </td>
              <td className={`${ADMIN_TABLE_CELL} text-right`}>
                <button
                  type="button"
                  onClick={() => onSelect(shipper._id)}
                  className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
                >
                  {shipper.status === 'pending' ? 'Xét duyệt' : 'Xem hồ sơ'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
