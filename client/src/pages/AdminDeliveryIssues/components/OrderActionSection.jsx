import { useState } from 'react'
import toast from 'react-hot-toast'
import deliveryIssueApi from '../../../api/deliveryIssueApi.js'
import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { ISSUE_ORDER_ACTION_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'

const ORDER_ACTION_HINTS = {
  release: 'Shipper không còn giữ đơn; đơn quay lại danh sách chờ để shipper khác nhận. Bếp giữ nguyên trạng thái.',
  cancel: 'Đơn bị hủy, không tính lỗi cho quán; khách đã thanh toán sẽ có yêu cầu hoàn tiền (tab "Chờ hoàn tiền").',
}
const CONFIRM_MESSAGES = {
  release: 'Đơn hàng sẽ được trả về hàng chờ cho shipper khác ngay. Bạn chắc chắn chứ?',
  cancel: 'Đơn hàng sẽ bị hủy ngay (khách đã thanh toán sẽ có yêu cầu hoàn tiền). Bạn chắc chắn chứ?',
}
const choiceClass = (checked, danger) =>
  `flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
    checked
      ? danger
        ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-200'
        : 'border-primary bg-primary/10 text-primary'
      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/60'
  }`

/**
 * UC45 - the order of a stuck shipper is handled right away, without waiting for the hearing or the decision.
 * Shown while the reporting shipper still holds the order, or as a record once it was handled.
 *
 * @param {object} issue - admin detail of the report
 * @param {'preparing' | 'ready_for_pickup' | 'delivering' | null} heldOrderStatus
 * @param {(issue: object) => void} onIssueChange
 */
export default function OrderActionSection({ issue, heldOrderStatus, onIssueChange }) {
  const [orderAction, setOrderAction] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const done = issue.resolution?.orderAction && issue.resolution.orderAction !== 'none'

  if (done) {
    return (
      <p className="rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-3 text-sm text-slate-700 dark:text-slate-300">
        {ISSUE_ORDER_ACTION_LABELS[issue.resolution.orderAction]}
        <span className="block text-xs text-slate-500">
          {issue.resolution.orderActionBy?.fullName} · {formatDateTime(issue.resolution.orderActionAt)}
        </span>
      </p>
    )
  }
  if (issue.status !== 'open' || !heldOrderStatus) {
    return <p className="text-sm text-slate-500">Đơn hàng không còn do shipper báo cáo giữ, không cần xử lý thêm.</p>
  }

  // After pickup the food is with the shipper: it can no longer go back to the pool
  const actions = ['release', 'cancel'].filter(
    (value) => value !== 'release' || ['preparing', 'ready_for_pickup'].includes(heldOrderStatus),
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!orderAction) nextErrors.orderAction = 'Vui lòng chọn cách xử lý đơn hàng'
    if (note.trim().length < 5) nextErrors.note = 'Lý do ít nhất 5 ký tự'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) setConfirming(true)
  }

  const submit = async () => {
    setSaving(true)
    try {
      const response = await deliveryIssueApi.applyOrderAction(issue._id, { orderAction, note: note.trim() })
      onIssueChange(response.data)
      toast.success(response.message)
    } catch (error) {
      const apiErrors = error.response?.data?.errors || []
      setErrors(Object.fromEntries(apiErrors.map(({ field, message }) => [field, message])))
      toast.error(error.response?.data?.message || 'Không xử lý được đơn hàng')
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
      <fieldset disabled={saving} className="space-y-3">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Shipper vẫn đang giữ đơn ({heldOrderStatus === 'delivering' ? 'đã lấy hàng' : 'chưa lấy hàng'}). Nếu shipper không
          giao tiếp được, xử lý đơn ngay tại đây; không cần chờ đối chất. Bỏ trống nếu shipper tiếp tục giao.
        </p>
        <div className="flex flex-wrap gap-2">
          {actions.map((value) => (
            <label key={value} className={choiceClass(orderAction === value, value === 'cancel')}>
              <input
                type="radio"
                name="issue-order-action"
                checked={orderAction === value}
                onChange={() => {
                  setOrderAction(value)
                  setErrors({})
                }}
                className="accent-primary"
              />
              {ISSUE_ORDER_ACTION_LABELS[value]}
            </label>
          ))}
        </div>
        {orderAction && <p className="text-xs text-slate-500">{ORDER_ACTION_HINTS[orderAction]}</p>}
        <AdminFieldError message={errors.orderAction} />

        {orderAction && (
          <div>
            <label htmlFor="issue-order-note" className={ADMIN_LABEL}>
              Lý do *
            </label>
            <input
              id="issue-order-note"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: shipper không liên lạc được khách sau 15 phút"
              className={ADMIN_INPUT}
            />
            <AdminFieldError message={errors.note} />
          </div>
        )}

        {orderAction && (
          <div className="flex justify-end">
            <button type="submit" className={orderAction === 'cancel' ? ADMIN_BUTTON.danger : ADMIN_BUTTON.primary}>
              {saving ? 'Đang xử lý...' : ISSUE_ORDER_ACTION_LABELS[orderAction]}
            </button>
          </div>
        )}
      </fieldset>

      <ConfirmDialog
        open={confirming}
        title="Xử lý đơn hàng"
        message={CONFIRM_MESSAGES[orderAction]}
        confirmLabel="Xác nhận"
        loading={saving}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </form>
  )
}
