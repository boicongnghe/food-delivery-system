import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import { ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { formatCurrency, formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'

const DECISIONS = [
  { value: 'resolved', label: 'Chấp nhận & giải quyết', activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-200' },
  { value: 'rejected', label: 'Không chấp nhận', activeClass: 'border-red-500 bg-red-500/10 text-red-200' },
]

/**
 * Resolve form of an open complaint. The parent owns the state and submits it.
 * @param {{ decision: string, refundAmount: string, note: string }} form
 * @param {number} maxRefund - what the customer paid minus earlier refunds
 */
export default function ComplaintResolveForm({ formId, form, errors, maxRefund, disabled, onChange, onSubmit }) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
      <fieldset disabled={disabled} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {DECISIONS.map((decision) => (
            <label
              key={decision.value}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                form.decision === decision.value ? decision.activeClass : 'border-slate-700 text-slate-300'
              }`}
            >
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
          <div>
            <label htmlFor="complaint-refund" className={ADMIN_LABEL}>
              Hoàn tiền cho khách (đ)
            </label>
            <div className="flex gap-2">
              <input
                id="complaint-refund"
                inputMode="numeric"
                value={formatNumber(form.refundAmount)}
                onChange={(event) => onChange({ refundAmount: parseNumberInput(event.target.value) })}
                placeholder="0 = không hoàn tiền"
                className={ADMIN_INPUT}
              />
              <button
                type="button"
                onClick={() => onChange({ refundAmount: String(maxRefund) })}
                disabled={maxRefund === 0}
                className="shrink-0 rounded-xl border border-slate-700 px-3 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                Hoàn toàn bộ
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Tối đa {formatCurrency(maxRefund)} (số tiền khách đã trả trừ phần đã hoàn). Hoàn tiền hiện là mô phỏng.
            </p>
            <AdminFieldError message={errors.refundAmount} />
          </div>
        )}

        <div>
          <label htmlFor="complaint-note" className={ADMIN_LABEL}>
            Phản hồi gửi khách hàng *
          </label>
          <textarea
            id="complaint-note"
            rows={3}
            maxLength={500}
            value={form.note}
            onChange={(event) => onChange({ note: event.target.value })}
            placeholder="Kết quả xác minh và hướng giải quyết..."
            className={`${ADMIN_INPUT} resize-none`}
          />
          <AdminFieldError message={errors.note} />
        </div>
      </fieldset>
    </form>
  )
}
