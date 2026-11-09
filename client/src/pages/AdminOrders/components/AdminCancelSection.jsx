import { useState } from 'react'
import toast from 'react-hot-toast'
import { TriangleAlert } from 'lucide-react'
import adminOrderApi from '../../../api/adminOrderApi.js'
import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'

// Same rule as the server (adminOrderService.cancelOrderAsAdmin): the food is not on its way yet.
// A shipper may have accepted the order but not picked it up; after pickup the delivery issue flow handles it.
const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup']

const ACTIONS = {
  cancel: {
    confirm: 'Hủy đơn này thay khách hàng? Khách đã thanh toán sẽ có yêu cầu hoàn tiền.',
    request: adminOrderApi.cancelOrder,
    fallbackError: 'Không hủy được đơn',
  },
  release: {
    confirm: 'Trả đơn về hàng chờ để shipper khác nhận? Shipper hiện tại sẽ không còn giữ đơn này.',
    request: adminOrderApi.releaseShipper,
    fallbackError: 'Không đổi được shipper',
  },
}

const Warning = ({ children }) => (
  <p className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{children}</span>
  </p>
)

/**
 * Timeout flags of the order + what the admin can do about them: cancel on behalf of the customer
 * (TO-05, decision D3), or give an order a shipper accepted but never picked up to another shipper.
 */
export default function AdminCancelSection({ order, onCancelled }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')

  const { prepEscalatedAt, shipperAlertedAt, pickupAlertedAt } = order.timeouts || {}
  const canCancel = CANCELLABLE_STATUSES.includes(order.status)
  // Held by a shipper who has not picked the food up yet (kitchen cooking or food ready)
  const canRelease = ['preparing', 'ready_for_pickup'].includes(order.status) && Boolean(order.shipper)
  if (!canCancel && !prepEscalatedAt && !shipperAlertedAt && !pickupAlertedAt) return null

  const run = async (type) => {
    const action = ACTIONS[type]
    if (!(await confirmToast(action.confirm, { danger: type === 'cancel' }))) return
    setSaving(type)
    try {
      const response = await action.request(order._id, { note })
      toast.success(response.message)
      setNote('')
      onCancelled(response.data)
    } catch (requestError) {
      const data = requestError.response?.data
      setError(data?.errors?.[0]?.message || '')
      toast.error(data?.message || action.fallbackError)
    } finally {
      setSaving('')
    }
  }

  return (
    <AdminSection title="Xử lý quá hạn">
      {prepEscalatedAt && order.status === 'preparing' && (
        <Warning>
          Quán đã quá giờ chuẩn bị (chuyển admin lúc {formatDateTime(prepEscalatedAt)}). Liên hệ quán; nếu không thể hoàn tất, hủy
          thay khách. Quán không được bù.
        </Warning>
      )}
      {shipperAlertedAt && ['confirmed', 'preparing', 'ready_for_pickup'].includes(order.status) && !order.shipper && (
        <Warning>
          Đơn đang chờ shipper nhưng chưa có ai nhận (báo lúc {formatDateTime(shipperAlertedAt)}). Hãy điều phối shipper; đơn sẽ tự hủy
          khi hết thời hạn.
        </Warning>
      )}
      {pickupAlertedAt && canRelease && (
        <Warning>
          Shipper {order.shipper?.fullName || ''} đã nhận đơn nhưng chưa lấy hàng (báo lúc {formatDateTime(pickupAlertedAt)}). Liên hệ
          shipper; nếu không đến được, đổi shipper khác hoặc hủy đơn.
        </Warning>
      )}

      {canCancel && (
        <form onSubmit={(event) => event.preventDefault()} className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <fieldset disabled={Boolean(saving)} className="space-y-3">
            <div>
              <label htmlFor="admin-cancel-note" className={ADMIN_LABEL}>
                {canRelease ? 'Lý do đổi shipper / hủy đơn' : 'Lý do hủy thay khách'}
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
                placeholder={
                  canRelease
                    ? 'VD: Shipper báo hỏng xe, không đến quán được'
                    : 'VD: Quán quá giờ chuẩn bị, khách yêu cầu hủy qua tổng đài'
                }
                className={`${ADMIN_INPUT} resize-none`}
              />
              <AdminFieldError message={error} />
            </div>
            <div className="flex flex-wrap gap-2">
              {canRelease && (
                <button type="button" onClick={() => run('release')} className={ADMIN_BUTTON.secondary}>
                  {saving === 'release' ? 'Đang đổi...' : 'Đổi shipper khác'}
                </button>
              )}
              <button type="button" onClick={() => run('cancel')} className={ADMIN_BUTTON.danger}>
                {saving === 'cancel' ? 'Đang hủy...' : 'Hủy đơn thay khách'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </AdminSection>
  )
}
