import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import adminOrderApi from '../../../api/adminOrderApi.js'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminDrawer from '../../../components/AdminDrawer/AdminDrawer.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminOrderSnapshot from '../../../components/AdminOrderSnapshot/AdminOrderSnapshot.jsx'
import AdminPartnerStatusBadge from '../../../components/AdminPartnerStatusBadge/AdminPartnerStatusBadge.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { DELIVERY_ISSUE_STATUSES, DELIVERY_ISSUE_TYPE_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '../../../utils/feedbackLabels.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { ACTOR_LABELS, ORDER_STATUSES } from '../../../utils/orderLabels.js'

const COMPLAINT_TONES = { open: 'amber', resolved: 'emerald', rejected: 'slate' }

/**
 * Read-only detail of one platform order. Mount with key={orderId}.
 */
export default function OrderDetailDrawer({ orderId, onClose }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    adminOrderApi
      .getOrder(orderId)
      .then((response) => {
        if (!ignore) setOrder(response.data)
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.response?.data?.message || 'Không tải được đơn hàng')
      })

    return () => {
      ignore = true
    }
  }, [orderId])

  const status = order && (ORDER_STATUSES[order.status] || { label: order.status, tone: 'slate' })
  const { complaint, review, deliveryIssues = [] } = order?.related || {}

  return (
    <AdminDrawer
      title={order ? `Đơn ${order.orderCode || order.orderNumber}` : 'Chi tiết đơn hàng'}
      subtitle={order && `Đặt lúc ${formatDateTime(order.createdAt)}`}
      badge={status && <AdminBadge tone={status.tone}>{status.label}</AdminBadge>}
      onClose={onClose}
    >
      {error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{error}</p>
      )}
      {!order && !error && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      {order && (
        <>
          {order.status === 'cancelled' && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-200">
              <p className="text-xs font-bold uppercase tracking-wider">
                Đã hủy bởi {ACTOR_LABELS[order.cancellation?.by] || 'không rõ'}
              </p>
              {(order.cancellation?.note || order.cancellation?.reason) && (
                <p className="mt-1">{order.cancellation.note || order.cancellation.reason}</p>
              )}
              {order.cancellation?.at && <p className="mt-2 text-xs opacity-80">{formatDateTime(order.cancellation.at)}</p>}
            </div>
          )}

          <AdminSection title="Đơn hàng">
            <AdminOrderSnapshot order={order} />
          </AdminSection>

          <AdminSection title="Khách hàng & giao hàng">
            <AdminInfoRow label="Tài khoản">
              {order.customer ? `${order.customer.fullName} · ${order.customer.email}` : 'Tài khoản đã xóa'}
            </AdminInfoRow>
            <AdminInfoRow label="Người nhận">{order.delivery?.recipientName || '—'}</AdminInfoRow>
            <AdminInfoRow label="Số điện thoại nhận">{order.delivery?.phone || '—'}</AdminInfoRow>
            <AdminInfoRow label="Địa chỉ giao">{order.delivery?.address || '—'}</AdminInfoRow>
            {order.customerNote && <AdminInfoRow label="Ghi chú của khách">{order.customerNote}</AdminInfoRow>}
          </AdminSection>

          <AdminSection
            title="Nhà hàng"
            aside={order.restaurant && <AdminPartnerStatusBadge status={order.restaurant.status} />}
          >
            {order.restaurant ? (
              <>
                <AdminInfoRow label="Tên quán">
                  <Link to={`/admin/restaurants?review=${order.restaurant._id}`} className="font-bold text-primary hover:underline">
                    {order.restaurant.name}
                  </Link>
                </AdminInfoRow>
                <AdminInfoRow label="Số điện thoại">{order.restaurant.phone || '—'}</AdminInfoRow>
                <AdminInfoRow label="Địa chỉ">{order.restaurant.address || '—'}</AdminInfoRow>
              </>
            ) : (
              <p className="text-sm text-slate-500">Nhà hàng không còn tồn tại.</p>
            )}
          </AdminSection>

          <AdminSection title="Shipper">
            {order.shipper ? (
              <>
                <AdminInfoRow label="Họ tên">{order.shipper.fullName}</AdminInfoRow>
                <AdminInfoRow label="Số điện thoại">{order.shipper.phone || '—'}</AdminInfoRow>
              </>
            ) : (
              <p className="text-sm text-slate-500">Chưa có shipper nhận đơn.</p>
            )}
          </AdminSection>

          <AdminSection title="Phản hồi sau giao hàng">
            <AdminInfoRow label="Đánh giá">
              {review ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-600 dark:text-amber-400" />
                  {review.restaurantRating}/5 nhà hàng
                  {review.shipperRating && ` · ${review.shipperRating}/5 shipper`}
                  {review.isHidden && <AdminBadge tone="red">Đã ẩn</AdminBadge>}
                </span>
              ) : (
                'Chưa có'
              )}
            </AdminInfoRow>
            <AdminInfoRow label="Khiếu nại">
              {complaint ? (
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  <span className="font-mono">{complaint.code}</span>
                  {COMPLAINT_CATEGORY_LABELS[complaint.category]}
                  <AdminBadge tone={COMPLAINT_TONES[complaint.status]}>{COMPLAINT_STATUS_LABELS[complaint.status]}</AdminBadge>
                  {complaint.resolution?.refundAmount > 0 && `hoàn ${formatCurrency(complaint.resolution.refundAmount)}`}
                </span>
              ) : (
                'Không có'
              )}
            </AdminInfoRow>
            <AdminInfoRow label="Sự cố giao hàng">
              {deliveryIssues.length > 0 ? (
                <span className="inline-flex flex-col items-end gap-1">
                  {deliveryIssues.map((issue) => (
                    <span key={issue._id} className="inline-flex items-center gap-2">
                      <span className="font-mono">{issue.code}</span>
                      {DELIVERY_ISSUE_TYPE_LABELS[issue.type]}
                      <AdminBadge tone={DELIVERY_ISSUE_STATUSES[issue.status]?.tone}>
                        {DELIVERY_ISSUE_STATUSES[issue.status]?.label}
                      </AdminBadge>
                    </span>
                  ))}
                </span>
              ) : (
                'Không có'
              )}
            </AdminInfoRow>
          </AdminSection>
        </>
      )}
    </AdminDrawer>
  )
}
