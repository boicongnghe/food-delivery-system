import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { REJECT_REASONS } from '../constants.js'

// Pick a reason before rejecting; warns when the customer will be refunded
export default function RejectOrderDialog({ order, submitting, error, onSubmit, onCancel }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const willRefund = order.payment.status === 'paid'
  const needsNote = reason === 'other'

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ reason, note: note.trim() })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h3 className="text-base font-bold text-slate-900">Từ chối đơn #{order.orderCode}?</h3>
        <p className="mt-1 text-sm text-slate-600">Đơn sẽ bị hủy và khách hàng được thông báo lý do.</p>

        {willRefund && (
          <p className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Khách đã thanh toán online. Hệ thống sẽ hoàn {formatCurrency(order.total)} cho khách.
          </p>
        )}

        <fieldset className="mt-4 space-y-2">
          <legend className="mb-1 text-xs font-semibold text-slate-700">
            Lý do từ chối <span className="text-brand">*</span>
          </legend>
          {REJECT_REASONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                reason === option.value ? 'border-brand bg-brand-light' : 'border-brand-soft hover:bg-brand-light/50'
              }`}
            >
              <input
                type="radio"
                name="reject-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="accent-brand"
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        {needsNote && (
          <textarea
            autoFocus
            required
            minLength={3}
            maxLength={200}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi rõ lý do để khách hiểu..."
            className="mt-3 w-full resize-none rounded-md bg-brand-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={submitting || !reason}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? 'Đang xử lý...' : willRefund ? 'Từ chối & hoàn tiền' : 'Từ chối đơn'}
          </button>
        </div>
      </form>
    </div>
  )
}
