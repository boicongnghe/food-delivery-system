import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'

/**
 * "Nhận đơn" switch of the driver app + orders the shipper holds now.
 * @param {{ isOnline: boolean, activeOrders: number }} availability - from the admin shipper API
 */
export default function ShipperAvailabilityBadge({ availability }) {
  if (!availability) return '—'
  return (
    <div className="flex flex-wrap gap-1.5">
      <AdminBadge tone={availability.isOnline ? 'emerald' : 'slate'}>
        {availability.isOnline ? 'Đang nhận đơn' : 'Tắt nhận đơn'}
      </AdminBadge>
      {availability.activeOrders > 0 && <AdminBadge tone="sky">Đang giao {availability.activeOrders} đơn</AdminBadge>}
    </div>
  )
}
