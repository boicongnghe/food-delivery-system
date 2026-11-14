import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Info, TriangleAlert } from 'lucide-react'
import adminOrderApi from '../../../api/adminOrderApi.js'
import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'

const ACTIONS = {
  cancel: {
    confirm: 'Hủy đơn này thay khách hàng? Khách đã thanh toán được hoàn ngay toàn bộ vào ví ảo.',
    request: adminOrderApi.cancelOrder,
    fallbackError: 'Không hủy được đơn',
  },
  release: {
    confirm: 'Trả đơn về hàng chờ để shipper khác nhận? Shipper hiện tại sẽ không còn giữ đơn này.',
    request: adminOrderApi.releaseShipper,
    fallbackError: 'Không đổi được shipper',
  },
}

const Notice = ({ tone = 'amber', icon: Icon = TriangleAlert, children }) => {
  const tones = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  }
  return (
    <p className={`mb-2 flex items-start gap-2 rounded-xl border p-3 text-sm ${tones[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/**
 * Monitoring flags of the order (timeout rules) and the admin interventions: cancel for the customer, or give an
 * order a shipper accepted but never picked up to another shipper. What is allowed comes from the server
 * (order.interventions). With an open delivery issue report, the action is the order step of that report (UC45).
 */
export default function OrderInterventionSection({ order, onChanged }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')

  const { prepEscalatedAt, shipperAlertedAt, pickupAlertedAt } = order.timeouts || {}
  const { cancel: canCancel, releaseShipper: canRelease, blockedReason, viaIssue } = order.interventions || {}
  const waitingForShipper = ['confirmed', 'preparing', 'ready_for_pickup'].includes(order.status) && !order.shipper
  const showPrepAlert = prepEscalatedAt && order.status === 'preparing'
  const showShipperAlert = shipperAlertedAt && waitingForShipper
  const showPickupAlert = pickupAlertedAt && canRelease
  if (!canCancel && !canRelease && !blockedReason && !showPrepAlert && !showShipperAlert) return null

  const run = async (type) => {
    const action = ACTIONS[type]
    if (!(await confirmToast(action.confirm, { danger: type === 'cancel' }))) return
    setSaving(type)
    try {
      const response = await action.request(order._id, { note })
      toast.success(response.message)
      setNote('')
      onChanged(response.data)
    } catch (requestError) {
      const data = requestError.response?.data
      setError(data?.errors?.[0]?.message || '')
      toast.error(data?.message || action.fallbackError)
    } finally {
      setSaving('')
    }
  }

  return (
    <AdminSection title="Can thiệp đơn hàng">
      {showPrepAlert && (
        <Notice>
          Quán đã quá giờ chuẩn bị (chuyển admin lúc {formatDateTime(prepEscalatedAt)}). Liên hệ quán; nếu không thể hoàn tất, hủy
          thay khách. Quán không được bù.
        </Notice>
      )}
      {showShipperAlert && (
        <Notice>
          Đơn đang chờ shipper nhưng chưa có ai nhận (báo lúc {formatDateTime(shipperAlertedAt)}). Hãy điều phối shipper; đơn sẽ tự hủy
          khi hết thời hạn.
        </Notice>
      )}
      {showPickupAlert && (
        <Notice>
          Shipper {order.shipper?.fullName || ''} đã nhận đơn nhưng chưa lấy hàng (báo lúc {formatDateTime(pickupAlertedAt)}). Liên hệ
          shipper; nếu không đến được, đổi shipper khác hoặc hủy đơn.
        </Notice>
      )}
      {viaIssue && (
        <Notice tone="sky" icon={Info}>
          Shipper đã gửi báo cáo sự cố{' '}
          <Link
            to={`/admin/support-cases?tab=delivery-issues&id=${viaIssue._id}`}
            className="font-mono font-bold underline"
          >
            {viaIssue.code}
          </Link>
          . Hủy đơn hoặc đổi shipper ở đây được ghi vào báo cáo (bước "Xử lý đơn hàng"); đối chất, xử phạt và kết luận làm ở
          trang Khiếu nại &amp; sự cố.
        </Notice>
      )}
      {blockedReason && <Notice tone="sky" icon={Info}>{blockedReason}</Notice>}

      {(canCancel || canRelease) && (
        <form onSubmit={(event) => event.preventDefault()} className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <fieldset disabled={Boolean(saving)} className="space-y-3">
            <div>
              <label htmlFor="admin-intervention-note" className={ADMIN_LABEL}>
                {canRelease ? 'Lý do đổi shipper / hủy đơn' : 'Lý do hủy thay khách'}
              </label>
              <textarea
                id="admin-intervention-note"
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
              {canCancel && (
                <button type="button" onClick={() => run('cancel')} className={ADMIN_BUTTON.danger}>
                  {saving === 'cancel' ? 'Đang hủy...' : 'Hủy đơn thay khách'}
                </button>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </AdminSection>
  )
}
