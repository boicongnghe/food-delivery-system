export const PAGE_SIZE = 10

export const ROLES = {
  customer: { label: 'Khách hàng', tone: 'sky' },
  restaurant_owner: { label: 'Chủ nhà hàng', tone: 'amber' },
  shipper: { label: 'Shipper', tone: 'emerald' },
  admin: { label: 'Quản trị viên', tone: 'purple' },
}

// Approval status of a restaurant / shipper profile
export const PARTNER_STATUSES = {
  pending: { label: 'Chờ duyệt', tone: 'amber' },
  approved: { label: 'Đang hoạt động', tone: 'emerald' },
  rejected: { label: 'Bị từ chối', tone: 'red' },
  suspended: { label: 'Đình chỉ', tone: 'red' },
}

// What the order statistics mean for each role
export const ORDER_STATS_TITLES = {
  customer: 'Đơn hàng đã đặt',
  restaurant_owner: 'Đơn hàng của quán',
  shipper: 'Đơn hàng đã nhận giao',
}
