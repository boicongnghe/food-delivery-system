import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import { ADMIN_TABLE_CELL, ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'
import { formatDate } from '../../../utils/formatDate.js'
import { ROLES } from '../constants.js'

export default function UserTable({ users, onSelect }) {
  return (
    // relative: the sr-only header text is absolutely positioned and must stay inside the scroll box
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-slate-100 dark:border-crave-border">
          <tr>
            <th className={ADMIN_TABLE_HEAD}>Người dùng</th>
            <th className={ADMIN_TABLE_HEAD}>Số điện thoại</th>
            <th className={ADMIN_TABLE_HEAD}>Vai trò</th>
            <th className={ADMIN_TABLE_HEAD}>Trạng thái</th>
            <th className={ADMIN_TABLE_HEAD}>Ngày tạo</th>
            <th className={ADMIN_TABLE_HEAD}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-crave-border">
          {users.map((user) => (
            <tr key={user._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
              <td className={ADMIN_TABLE_CELL}>
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt="" className="h-9 w-9 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 dark:text-white">{user.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className={ADMIN_TABLE_CELL}>{user.phone || '—'}</td>
              <td className={ADMIN_TABLE_CELL}>
                <AdminBadge tone={ROLES[user.role]?.tone}>{ROLES[user.role]?.label || user.role}</AdminBadge>
              </td>
              <td className={ADMIN_TABLE_CELL}>
                {user.isActive ? (
                  <AdminBadge tone="emerald">Hoạt động</AdminBadge>
                ) : (
                  <AdminBadge tone="red">Đã khóa</AdminBadge>
                )}
              </td>
              <td className={ADMIN_TABLE_CELL}>{formatDate(user.createdAt)}</td>
              <td className={`${ADMIN_TABLE_CELL} text-right`}>
                <button
                  type="button"
                  onClick={() => onSelect(user._id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
                >
                  Chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
