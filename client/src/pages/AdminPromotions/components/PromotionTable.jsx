import { Pencil, Trash2 } from 'lucide-react'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import { ADMIN_TABLE_CELL, ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { PROMOTION_STATUSES } from '../constants.js'

const describeDiscount = (promotion) =>
  promotion.discountType === 'percentage'
    ? `Giảm ${promotion.discountValue}%${promotion.maxDiscount ? `, tối đa ${formatCurrency(promotion.maxDiscount)}` : ''}`
    : `Giảm ${formatCurrency(promotion.discountValue)}`

export default function PromotionTable({ promotions, onEdit, onDelete }) {
  return (
    // relative: the sr-only header text is absolutely positioned and must stay inside the scroll box
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead className="border-b border-slate-100 dark:border-crave-border">
          <tr>
            <th className={ADMIN_TABLE_HEAD}>Mã / chương trình</th>
            <th className={ADMIN_TABLE_HEAD}>Ưu đãi</th>
            <th className={ADMIN_TABLE_HEAD}>Đơn tối thiểu</th>
            <th className={ADMIN_TABLE_HEAD}>Thời gian</th>
            <th className={ADMIN_TABLE_HEAD}>Lượt dùng</th>
            <th className={ADMIN_TABLE_HEAD}>Trạng thái</th>
            <th className={ADMIN_TABLE_HEAD}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-crave-border">
          {promotions.map((promotion) => {
            const status = PROMOTION_STATUSES[promotion.status]
            const usedPercent = promotion.usageLimit
              ? Math.min(100, (promotion.usedCount / promotion.usageLimit) * 100)
              : 0
            return (
              <tr key={promotion._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                <td className={ADMIN_TABLE_CELL}>
                  <p className="font-mono font-black text-primary">{promotion.code}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{promotion.title}</p>
                </td>
                <td className={ADMIN_TABLE_CELL}>{describeDiscount(promotion)}</td>
                <td className={ADMIN_TABLE_CELL}>{formatCurrency(promotion.minOrderValue)}</td>
                <td className={`${ADMIN_TABLE_CELL} text-xs`}>
                  <p>{formatDateTime(promotion.startDate)}</p>
                  <p className="text-slate-500">→ {formatDateTime(promotion.endDate)}</p>
                </td>
                <td className={ADMIN_TABLE_CELL}>
                  <p className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">{promotion.usedCount}</span> /{' '}
                    {promotion.usageLimit ?? 'Không giới hạn'}
                  </p>
                  {promotion.usageLimit && (
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-crave-border">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${usedPercent}%` }} />
                    </div>
                  )}
                </td>
                <td className={ADMIN_TABLE_CELL}>
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                </td>
                <td className={`${ADMIN_TABLE_CELL} whitespace-nowrap text-right`}>
                  <button
                    type="button"
                    onClick={() => onEdit(promotion)}
                    aria-label={`Sửa ${promotion.code}`}
                    className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-crave-border hover:text-slate-900 dark:hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(promotion)}
                    disabled={promotion.usedCount > 0}
                    aria-label={`Xóa ${promotion.code}`}
                    title={promotion.usedCount > 0 ? 'Mã đã được dùng: hãy tắt mã thay vì xóa' : 'Xóa mã'}
                    className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
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
