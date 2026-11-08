import { CalendarRange, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { VOUCHER_STATUS } from '../constants.js'

// One voucher: what it gives, when, how much it was used and cost, and the owner's actions
export default function VoucherRow({ voucher, busy, readOnly, onToggle, onEdit, onDelete }) {
  const status = VOUCHER_STATUS[voucher.status]
  const usageText = voucher.usageLimit ? `${voucher.used}/${voucher.usageLimit}` : `${voucher.used}`

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-4">
      <div className="min-w-[220px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-dashed border-brand bg-brand-light px-2 py-0.5 font-mono text-sm font-bold text-brand">
            {voucher.code}
          </span>
          <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 font-semibold text-slate-900">{voucher.title}</p>
        <p className="text-sm text-slate-600">{voucher.label}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDateTime(voucher.startAt)} → {formatDateTime(voucher.endAt)} · tối đa {voucher.perCustomerLimit} lượt/khách
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Đã dùng</p>
          <p className="font-bold tabular-nums text-slate-900">{usageText}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Quán đã chịu</p>
          <p className="font-bold tabular-nums text-red-700">−{formatCurrency(voucher.spent)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600" title="Bật / tạm dừng chương trình">
          <button
            type="button"
            role="switch"
            aria-checked={voucher.isActive}
            aria-label={`Bật mã ${voucher.code}`}
            onClick={onToggle}
            disabled={busy || readOnly || voucher.status === 'ended'}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
              voucher.isActive ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${voucher.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          {voucher.isActive ? 'Bật' : 'Tắt'}
        </label>
        <button
          type="button"
          onClick={onEdit}
          disabled={busy || readOnly}
          className="rounded-md p-2 text-slate-600 hover:bg-brand-light disabled:opacity-40"
          aria-label={`Sửa mã ${voucher.code}`}
          title="Sửa"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          // A used voucher is order history: it can be paused or ended, not deleted
          disabled={busy || readOnly || voucher.used > 0}
          className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
          aria-label={`Xóa mã ${voucher.code}`}
          title={voucher.used > 0 ? 'Mã đã có đơn dùng: chỉ tạm dừng hoặc kết thúc được' : 'Xóa'}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
