import { useState } from 'react'
import toast from 'react-hot-toast'
import adminOrderApi from '../../../api/adminOrderApi.js'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { REFUND_STATUSES } from '../../../utils/orderLabels.js'

const RESULTS = [
  { value: 'succeeded', label: 'Đã chuyển trả tiền', activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  { value: 'failed', label: 'Chuyển trả thất bại', activeClass: 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-200' },
]

// API errors look like [{ field: 'reference', message }]
const toFieldErrors = (apiErrors = []) => Object.fromEntries(apiErrors.map(({ field, message }) => [field, message]))

/**
 * Refund owed after a paid order was cancelled. The admin transfers the money outside the system, then records
 * the result here: "succeeded" needs the transfer reference (proof), "failed" keeps the refund owed.
 * Rendered only when the order has a refund (refund.status !== 'none').
 */
export default function RefundSection({ order, onResolved }) {
  const refund = order.refund
  const status = REFUND_STATUSES[refund.status] || { label: refund.status, tone: 'slate' }
  const canResolve = ['pending', 'failed'].includes(refund.status)

  const [form, setForm] = useState({ result: 'succeeded', reference: '', note: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const change = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }))
    setErrors({})
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await adminOrderApi.resolveRefund(order._id, form)
      toast.success(response.message)
      onResolved(response.data)
    } catch (error) {
      const data = error.response?.data
      setErrors(toFieldErrors(data?.errors))
      toast.error(data?.message || 'Không ghi nhận được kết quả hoàn tiền')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminSection title="Hoàn tiền" aside={<AdminBadge tone={status.tone}>{status.label}</AdminBadge>}>
      <AdminInfoRow label="Số tiền cần hoàn">{formatCurrency(refund.amount)}</AdminInfoRow>
      {refund.requestedAt && <AdminInfoRow label="Yêu cầu lúc">{formatDateTime(refund.requestedAt)}</AdminInfoRow>}
      {refund.reference && (
        <AdminInfoRow label={refund.reference === 'WALLET_REFUND' ? 'Phương thức hoàn' : 'Mã giao dịch'}>
          {refund.reference === 'WALLET_REFUND' ? (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
              💳 Đã hoàn tự động vào ví ảo của khách hàng
            </span>
          ) : (
            refund.reference
          )}
        </AdminInfoRow>
      )}
      {refund.completedAt && <AdminInfoRow label="Hoàn tất lúc">{formatDateTime(refund.completedAt)}</AdminInfoRow>}
      {refund.note && <AdminInfoRow label="Ghi chú">{refund.note}</AdminInfoRow>}

      {canResolve && (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <fieldset disabled={saving} className="space-y-3">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kết quả hoàn tiền">
              {RESULTS.map((result) => (
                <label
                  key={result.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                    form.result === result.value
                      ? result.activeClass
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="refundResult"
                    checked={form.result === result.value}
                    onChange={() => change({ result: result.value })}
                    className="accent-primary"
                  />
                  {result.label}
                </label>
              ))}
            </div>

            {form.result === 'succeeded' && (
              <div>
                <label htmlFor="refund-reference" className={ADMIN_LABEL}>
                  Mã giao dịch chuyển trả
                </label>
                <input
                  id="refund-reference"
                  value={form.reference}
                  maxLength={100}
                  onChange={(event) => change({ reference: event.target.value })}
                  placeholder="VD: FT26307123456"
                  className={ADMIN_INPUT}
                />
                <AdminFieldError message={errors.reference} />
              </div>
            )}

            <div>
              <label htmlFor="refund-note" className={ADMIN_LABEL}>
                {form.result === 'failed' ? 'Lý do thất bại' : 'Ghi chú (không bắt buộc)'}
              </label>
              <textarea
                id="refund-note"
                rows={2}
                value={form.note}
                maxLength={300}
                onChange={(event) => change({ note: event.target.value })}
                className={`${ADMIN_INPUT} resize-none`}
              />
              <AdminFieldError message={errors.note} />
            </div>

            <button type="submit" className={form.result === 'succeeded' ? ADMIN_BUTTON.success : ADMIN_BUTTON.danger}>
              {saving ? 'Đang lưu...' : form.result === 'succeeded' ? 'Xác nhận đã hoàn tiền' : 'Ghi nhận thất bại'}
            </button>
          </fieldset>
        </form>
      )}
    </AdminSection>
  )
}
