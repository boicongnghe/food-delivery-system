import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import { ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { REVIEW_HIDE_REASON_LABELS } from '../../../utils/feedbackLabels.js'

/**
 * Reason for hiding a violating review. The parent owns the state and submits it.
 * @param {{ reason: string, note: string }} form - note is required when reason is "other"
 */
export default function HideReviewForm({ formId, form, errors, disabled, onChange, onSubmit }) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
      <fieldset disabled={disabled} className="space-y-3">
        <div>
          <label htmlFor="hide-reason" className={ADMIN_LABEL}>
            Lý do vi phạm *
          </label>
          <select
            id="hide-reason"
            value={form.reason}
            onChange={(event) => onChange({ reason: event.target.value })}
            className={ADMIN_INPUT}
          >
            <option value="">-- Chọn lý do --</option>
            {Object.entries(REVIEW_HIDE_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <AdminFieldError message={errors.reason} />
        </div>
        <div>
          <label htmlFor="hide-note" className={ADMIN_LABEL}>
            Ghi chú nội bộ {form.reason === 'other' && '*'}
          </label>
          <textarea
            id="hide-note"
            rows={2}
            maxLength={300}
            value={form.note}
            onChange={(event) => onChange({ note: event.target.value })}
            placeholder="Khách hàng không thấy ghi chú này"
            className={`${ADMIN_INPUT} resize-none`}
          />
          <AdminFieldError message={errors.note} />
        </div>
      </fieldset>
    </form>
  )
}
