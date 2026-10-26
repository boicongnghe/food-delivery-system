import { Pencil, Trash2 } from 'lucide-react'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import { ADMIN_TABLE_CELL, ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'
import { formatDay } from '../../../utils/formatDate.js'
import { RULE_STATES, TARGETS } from '../constants.js'

const describeScope = (rule) => {
  if (rule.target === 'shipper') return 'Mọi shipper'
  return rule.restaurant ? rule.restaurant.name : 'Tất cả nhà hàng'
}

export default function CommissionRuleTable({ rules, onEdit, onDelete }) {
  return (
    // relative: the sr-only header text is absolutely positioned and must stay inside the scroll box
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="border-b border-slate-800">
          <tr>
            <th className={ADMIN_TABLE_HEAD}>Quy tắc</th>
            <th className={ADMIN_TABLE_HEAD}>Đối tượng</th>
            <th className={ADMIN_TABLE_HEAD}>Phạm vi</th>
            <th className={ADMIN_TABLE_HEAD}>Tỷ lệ</th>
            <th className={ADMIN_TABLE_HEAD}>Thời gian áp dụng</th>
            <th className={ADMIN_TABLE_HEAD}>Trạng thái</th>
            <th className={ADMIN_TABLE_HEAD}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {rules.map((rule) => {
            const state = RULE_STATES[rule.state]
            // A rule already used in reports cannot be deleted (only ended)
            const canDelete = rule.state === 'upcoming'
            return (
              <tr key={rule._id} className="transition-colors hover:bg-slate-900/60">
                <td className={ADMIN_TABLE_CELL}>
                  <p className="font-bold text-white">{rule.name}</p>
                  {rule.note && <p className="text-xs text-slate-500">{rule.note}</p>}
                </td>
                <td className={ADMIN_TABLE_CELL}>{TARGETS[rule.target].label}</td>
                <td className={ADMIN_TABLE_CELL}>{describeScope(rule)}</td>
                <td className={ADMIN_TABLE_CELL}>
                  <span className="font-black text-white">{rule.rate}%</span>
                  <span className="block text-xs text-slate-500">{TARGETS[rule.target].base}</span>
                </td>
                <td className={ADMIN_TABLE_CELL}>
                  {formatDay(rule.effectiveFrom)} → {rule.effectiveTo ? formatDay(rule.effectiveTo) : 'Không thời hạn'}
                </td>
                <td className={ADMIN_TABLE_CELL}>
                  <AdminBadge tone={state.tone}>{state.label}</AdminBadge>
                </td>
                <td className={`${ADMIN_TABLE_CELL} whitespace-nowrap text-right`}>
                  <button
                    type="button"
                    onClick={() => onEdit(rule)}
                    aria-label={`Sửa ${rule.name}`}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(rule)}
                    disabled={!canDelete}
                    aria-label={`Xóa ${rule.name}`}
                    title={canDelete ? 'Xóa quy tắc' : 'Quy tắc đã áp dụng: hãy đặt ngày kết thúc thay vì xóa'}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
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
