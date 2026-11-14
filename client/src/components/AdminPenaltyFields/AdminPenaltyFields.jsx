import { TriangleAlert } from 'lucide-react'
import AdminFieldError from '../AdminFieldError/AdminFieldError.jsx'
import { ADMIN_INPUT, ADMIN_LABEL } from '../../utils/adminClassNames.js'
import { willAutoSuspend } from '../../utils/autoSuspend.js'
import { PENALTY_ACTION_LABELS, PENALTY_FINE_LIMITS, PENALTY_TARGET_LABELS } from '../../utils/deliveryIssueLabels.js'
import { formatNumber, parseNumberInput } from '../../utils/formatCurrency.js'

const SUSPEND_EFFECTS = {
  restaurant: 'Nhà hàng chuyển sang "Đình chỉ": không nhận được đơn mới, vẫn hoàn tất / hoàn tiền được các đơn đang có.',
  shipper: 'Tài khoản shipper bị khóa, mở lại trong mục Quản lý tài khoản. Shipper còn giữ đơn đang giao thì chưa khóa được.',
  customer: 'Tài khoản khách hàng bị khóa, mở lại trong mục Quản lý tài khoản.',
}

// A penalty needs a hearing that has ended (same rule as the server)
const PENALTY_LOCK_HINTS = {
  none: 'Muốn xử phạt, hãy mời các bên đối chất ở mục trên và chờ phiên kết thúc.',
  open: 'Phiên đối chất đang diễn ra: xử phạt được sau khi phiên hết hạn hoặc bạn kết thúc sớm.',
}

const choiceClass = (checked) =>
  `flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
    checked
      ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-200'
      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/60'
  }`

/**
 * "Penalize one party" block of the admin resolution forms (delivery issues, complaints). Penalties of both
 * kinds of case share the violation history and the automatic suspension threshold. The parent owns the state.
 *
 * @param {{ hasPenalty: boolean, target: string, action: string, fineAmount: string }} form
 * @param {object} errors - keys penalty, penalty.target, penalty.action, penalty.fineAmount
 * @param {(changes: object) => void} onChange
 * @param {{ shipper: number, restaurant: number, customer: number }} violationCounts - earlier penalties
 * @param {{ threshold: number, counts: object }} autoSuspend - threshold (0: off) and penalties since the last suspension
 * @param {'none' | 'open' | 'closed'} hearingState - a penalty is possible only once the hearing has ended
 * @param {string[]} targets - parties that can be penalized (a complaint may have no shipper)
 * @param {string} idPrefix - keeps input ids unique on the page
 */
export default function AdminPenaltyFields({
  form,
  errors,
  onChange,
  violationCounts,
  autoSuspend,
  hearingState,
  targets = ['shipper', 'customer', 'restaurant'],
  idPrefix = 'penalty',
}) {
  const canPenalize = hearingState === 'closed'
  const autoSuspending = form.hasPenalty && willAutoSuspend(form, autoSuspend)

  return (
    <div className="space-y-3 rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-3">
      <label
        className={`flex items-center gap-2 text-sm font-semibold ${
          canPenalize ? 'text-slate-800 dark:text-slate-200' : 'cursor-not-allowed text-slate-400'
        }`}
      >
        <input
          type="checkbox"
          checked={form.hasPenalty}
          disabled={!canPenalize}
          onChange={(event) => onChange({ hasPenalty: event.target.checked })}
          className="accent-primary"
        />
        Xử phạt vi phạm
      </label>
      {!canPenalize && <p className="text-xs text-slate-500">{PENALTY_LOCK_HINTS[hearingState]}</p>}
      <AdminFieldError message={errors.penalty} />

      {form.hasPenalty && (
        <>
          <div>
            <p className={ADMIN_LABEL}>Bên vi phạm *</p>
            <div className="flex flex-wrap gap-2">
              {targets.map((value) => (
                <label key={value} className={choiceClass(form.target === value)}>
                  <input
                    type="radio"
                    name={`${idPrefix}-target`}
                    checked={form.target === value}
                    onChange={() => onChange({ target: value })}
                    className="accent-primary"
                  />
                  {PENALTY_TARGET_LABELS[value]}
                  <span className="text-xs text-slate-500">({violationCounts[value] || 0} lần trước)</span>
                </label>
              ))}
            </div>
            <AdminFieldError message={errors['penalty.target']} />
          </div>

          <div>
            <p className={ADMIN_LABEL}>Hình thức *</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PENALTY_ACTION_LABELS).map(([value, label]) => (
                <label key={value} className={choiceClass(form.action === value)}>
                  <input
                    type="radio"
                    name={`${idPrefix}-action`}
                    checked={form.action === value}
                    onChange={() => onChange({ action: value })}
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            <AdminFieldError message={errors['penalty.action']} />
          </div>

          {form.action === 'fine' && (
            <div>
              <label htmlFor={`${idPrefix}-fine`} className={ADMIN_LABEL}>
                Số tiền phạt (đ) *
              </label>
              <input
                id={`${idPrefix}-fine`}
                inputMode="numeric"
                value={formatNumber(form.fineAmount)}
                onChange={(event) => onChange({ fineAmount: parseNumberInput(event.target.value) })}
                placeholder={`${formatNumber(PENALTY_FINE_LIMITS.min)} - ${formatNumber(PENALTY_FINE_LIMITS.max)}`}
                className={`${ADMIN_INPUT} sm:w-1/2`}
              />
              <p className="mt-1 text-xs text-slate-500">Trừ ngay vào ví của bên bị phạt khi lưu, tối đa bằng số dư hiện có (khách: ví ảo, shipper: ví thu nhập, nhà hàng: số dư khả dụng). Phần thiếu không bị truy thu.</p>
              <AdminFieldError message={errors['penalty.fineAmount']} />
            </div>
          )}

          {form.action === 'suspend' && form.target && (
            <p className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {SUSPEND_EFFECTS[form.target]}
            </p>
          )}

          {autoSuspending && (
            <p className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              <span>
                Đây là lần vi phạm thứ {autoSuspend.counts[form.target] + 1} kể từ lần đình chỉ gần nhất (ngưỡng{' '}
                {autoSuspend.threshold} lần, tính cả sự cố và khiếu nại): {PENALTY_TARGET_LABELS[form.target].toLowerCase()} sẽ
                bị tự động đình chỉ. {SUSPEND_EFFECTS[form.target]}
              </span>
            </p>
          )}
        </>
      )}
    </div>
  )
}
