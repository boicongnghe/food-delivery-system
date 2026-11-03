import { useState } from 'react'
import toast from 'react-hot-toast'
import { TriangleAlert } from 'lucide-react'
import adminOrderApi from '../../../api/adminOrderApi.js'
import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { formatDateTime } from '../../../utils/formatDate.js'

// Same rule as the server (adminOrderService.cancelOrderAsAdmin): the food is not on its way yet
const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup']

/**
 * Timeout flags of the order + cancel on behalf of the customer (TO-05, decision D3).
 * Rendered for orders a timeout rule handed to the admin, or any order not given to a shipper yet.
 */
export default function AdminCancelSection({ order, onCancelled }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const { prepEscalatedAt, shipperAlertedAt } = order.timeouts || {}
  const canCancel = CANCELLABLE_STATUSES.includes(order.status) && !order.shipper
  if (!canCancel && !prepEscalatedAt && !shipperAlertedAt) return null

  const submit = async (event) => {
    event.preventDefault()
    if (!window.confirm('Hủy đơn này thay khách hàng? Khách đã thanh toán sẽ có yêu cầu hoàn tiền.')) return
    setSaving(true)
    try {
      const response = await adminOrderApi.cancelOrder(order._id, { note })
      toast.success(response.message)
      onCancelled(response.data)
    } catch (requestError) {
      const data = requestError.response?.data
      setError(data?.errors?.[0]?.message || '')
      toast.error(data?.message || 'Không hủy được đơn')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminSection title="Xử lý quá hạn">
      {prepEscalatedAt && order.status === 'preparing' && (
        <p className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Quán đã quá giờ chuẩn bị (chuyển admin lúc {formatDateTime(prepEscalatedAt)}). Liên hệ quán; nếu không thể hoàn tất, hủy
          thay khách. Quán không được bù.
        </p>
      )}
      {shipperAlertedAt && order.status === 'ready_for_pickup' && !order.shipper && (
        <p className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Món đã sẵn sàng nhưng chưa có shipper nhận (báo lúc {formatDateTime(shipperAlertedAt)}). Hãy điều phối shipper; đơn sẽ tự hủy
          khi hết thời hạn.
        </p>
      )}

      {canCancel && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <fieldset disabled={saving} className="space-y-3">
            <div>
              <label htmlFor="admin-cancel-note" className={ADMIN_LABEL}>
                Lý do hủy thay khách
              </label>
              <textarea
                id="admin-cancel-note"
                rows={2}
                maxLength={300}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value)
                  setError('')
                }}
                placeholder="VD: Quán quá giờ chuẩn bị, khách yêu cầu hủy qua tổng đài"
                className={`${ADMIN_INPUT} resize-none`}
              />
              <AdminFieldError message={error} />
            </div>
            <button type="submit" className={ADMIN_BUTTON.danger}>
              {saving ? 'Đang hủy...' : 'Hủy đơn thay khách'}
            </button>
          </fieldset>
        </form>
      )}
    </AdminSection>
  )
}
