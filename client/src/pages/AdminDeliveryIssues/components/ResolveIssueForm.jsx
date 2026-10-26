import { TriangleAlert } from 'lucide-react'
import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import { ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { PENALTY_ACTION_LABELS, PENALTY_TARGET_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'

const DECISIONS = [
  { value: 'resolved', label: 'Xác nhận & xử lý', activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-200' },
  { value: 'dismissed', label: 'Bác bỏ báo cáo', activeClass: 'border-slate-500 bg-slate-500/10 text-slate-200' },
]

const SUSPEND_EFFECTS = {
  restaurant: 'Nhà hàng chuyển sang "Đình chỉ": không nhận được đơn mới, vẫn hoàn tất / hoàn tiền được các đơn đang có.',
  shipper: 'Tài khoản shipper bị khóa, mở lại trong mục Quản lý tài khoản.',
  customer: 'Tài khoản khách hàng bị khóa, mở lại trong mục Quản lý tài khoản.',
}

const choiceClass = (checked, activeClass) =>
  `flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
    checked ? activeClass : 'border-slate-700 text-slate-300 hover:border-purple-500/60'
  }`

/**
 * UC45 - handle a delivery issue report, optionally penalizing one party. The parent owns the state.
 * @param {{ decision, hasPenalty, target, action, fineAmount, note }} form
 * @param {{ shipper: number, restaurant: number, customer: number }} violationCounts - earlier penalties
 */
export default function ResolveIssueForm({ formId, form, errors, violationCounts, disabled, onChange, onSubmit }) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
      <fieldset disabled={disabled} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {DECISIONS.map((decision) => (
            <label key={decision.value} className={choiceClass(form.decision === decision.value, decision.activeClass)}>
              <input
                type="radio"
                name="decision"
                checked={form.decision === decision.value}
                onChange={() => onChange({ decision: decision.value })}
                className="accent-purple-500"
              />
              {decision.label}
            </label>
          ))}
        </div>

        {form.decision === 'resolved' && (
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={form.hasPenalty}
                onChange={(event) => onChange({ hasPenalty: event.target.checked })}
                className="accent-purple-500"
              />
              Xử phạt vi phạm
            </label>

            {form.hasPenalty && (
              <>
                <div>
                  <p className={ADMIN_LABEL}>Bên vi phạm *</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PENALTY_TARGET_LABELS).map(([value, label]) => (
                      <label key={value} className={choiceClass(form.target === value, 'border-red-500 bg-red-500/10 text-red-200')}>
                        <input
                          type="radio"
                          name="target"
                          checked={form.target === value}
                          onChange={() => onChange({ target: value })}
                          className="accent-purple-500"
                        />
                        {label}
                        <span className="text-xs text-slate-500">({violationCounts[value]} lần trước)</span>
                      </label>
                    ))}
                  </div>
                  <AdminFieldError message={errors['penalty.target']} />
                </div>

                <div>
                  <p className={ADMIN_LABEL}>Hình thức *</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PENALTY_ACTION_LABELS).map(([value, label]) => (
                      <label key={value} className={choiceClass(form.action === value, 'border-red-500 bg-red-500/10 text-red-200')}>
                        <input
                          type="radio"
                          name="action"
                          checked={form.action === value}
                          onChange={() => onChange({ action: value })}
                          className="accent-purple-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <AdminFieldError message={errors['penalty.action']} />
                </div>

                {form.action === 'fine' && (
                  <div>
                    <label htmlFor="issue-fine" className={ADMIN_LABEL}>
                      Số tiền phạt (đ) *
                    </label>
                    <input
                      id="issue-fine"
                      inputMode="numeric"
                      value={formatNumber(form.fineAmount)}
                      onChange={(event) => onChange({ fineAmount: parseNumberInput(event.target.value) })}
                      placeholder="10.000 - 5.000.000"
                      className={`${ADMIN_INPUT} sm:w-1/2`}
                    />
                    <p className="mt-1 text-xs text-slate-500">Phạt tiền hiện được ghi nhận (mô phỏng), chưa trừ tiền thật.</p>
                    <AdminFieldError message={errors['penalty.fineAmount']} />
                  </div>
                )}

                {form.action === 'suspend' && form.target && (
                  <p className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    {SUSPEND_EFFECTS[form.target]}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <label htmlFor="issue-note" className={ADMIN_LABEL}>
            Kết luận xử lý *
          </label>
          <textarea
            id="issue-note"
            rows={3}
            maxLength={500}
            value={form.note}
            onChange={(event) => onChange({ note: event.target.value })}
            placeholder="Kết quả xác minh, cách xử lý đơn hàng..."
            className={`${ADMIN_INPUT} resize-none`}
          />
          <AdminFieldError message={errors.note} />
        </div>
      </fieldset>
    </form>
  )
}
