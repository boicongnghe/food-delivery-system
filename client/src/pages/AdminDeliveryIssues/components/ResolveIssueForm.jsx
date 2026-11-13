import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import AdminPenaltyFields from '../../../components/AdminPenaltyFields/AdminPenaltyFields.jsx'
import { ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'

const DECISIONS = [
  { value: 'resolved', label: 'Xác nhận & xử lý', activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  { value: 'dismissed', label: 'Bác bỏ báo cáo', activeClass: 'border-slate-300 dark:border-slate-500 bg-slate-500/10 text-slate-800 dark:text-slate-200' },
]

const choiceClass = (checked, activeClass) =>
  `flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
    checked ? activeClass : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/60'
  }`

/**
 * UC45 - decision on a delivery issue report, optionally penalizing one party (only when upheld). The parent owns
 * the state. The order of the report is handled apart (OrderActionSection).
 * @param {{ decision, hasPenalty, target, action, fineAmount, note }} form
 * @param {{ shipper: number, restaurant: number, customer: number }} violationCounts - earlier penalties
 * @param {{ threshold: number, counts: object }} autoSuspend - threshold (0: off) and penalties since the last suspension
 * @param {'none' | 'open' | 'closed'} hearingState - a penalty is possible only once the hearing has ended
 */
export default function ResolveIssueForm({
  formId,
  form,
  errors,
  violationCounts,
  autoSuspend,
  hearingState,
  disabled,
  onChange,
  onSubmit,
}) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <fieldset disabled={disabled} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {DECISIONS.map((decision) => (
            <label key={decision.value} className={choiceClass(form.decision === decision.value, decision.activeClass)}>
              <input
                type="radio"
                name="decision"
                checked={form.decision === decision.value}
                onChange={() => onChange({ decision: decision.value })}
                className="accent-primary"
              />
              {decision.label}
            </label>
          ))}
        </div>

        {form.decision === 'resolved' && (
          <AdminPenaltyFields
            form={form}
            errors={errors}
            onChange={onChange}
            violationCounts={violationCounts}
            autoSuspend={autoSuspend}
            hearingState={hearingState}
            idPrefix="issue-penalty"
          />
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
            placeholder="Kết quả xác minh sau đối chất, lý do xử phạt hoặc bác bỏ..."
            className={`${ADMIN_INPUT} resize-none`}
          />
          <AdminFieldError message={errors.note} />
        </div>
      </fieldset>
    </form>
  )
}
