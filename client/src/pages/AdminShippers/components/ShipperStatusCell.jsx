import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminPartnerStatusBadge from '../../../components/AdminPartnerStatusBadge/AdminPartnerStatusBadge.jsx'

/**
 * Status column of the shipper list: profile status and "Nhận đơn" switch in one place.
 * Only an approved shipper can turn the switch on (every status change turns it off), so an approved
 * profile shows the switch instead of "Đang hoạt động"; other profiles keep their status label.
 */
export default function ShipperStatusCell({ shipper }) {
  const { status, availability, user } = shipper
  const showSwitch = status === 'approved' && availability

  return (
    <div className="flex flex-wrap gap-1.5">
      {showSwitch ? (
        <AdminBadge tone={availability.isOnline ? 'emerald' : 'slate'}>
          {availability.isOnline ? 'Đang nhận đơn' : 'Tắt nhận đơn'}
        </AdminBadge>
      ) : (
        <AdminPartnerStatusBadge status={status} />
      )}
      {/* A suspended shipper may still finish the orders accepted before */}
      {availability?.activeOrders > 0 && <AdminBadge tone="sky">Đang giao {availability.activeOrders} đơn</AdminBadge>}
      {user && !user.isActive && <AdminBadge tone="red">TK bị khóa</AdminBadge>}
    </div>
  )
}
