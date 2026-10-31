export const PAGE_SIZE = 10

export const ROLES = {
  customer: { label: 'Khách hàng', tone: 'sky' },
  restaurant_owner: { label: 'Chủ nhà hàng', tone: 'amber' },
  shipper: { label: 'Shipper', tone: 'emerald' },
  admin: { label: 'Quản trị viên', tone: 'brand' },
}

// Roles listed on this page; restaurant owners and shippers are managed on the partner pages
export const USER_PAGE_ROLES = ['customer', 'admin']

// What the order statistics mean for each role
export const ORDER_STATS_TITLES = {
  customer: 'Đơn hàng đã đặt',
  restaurant_owner: 'Đơn hàng của quán',
  shipper: 'Đơn hàng đã nhận giao',
}
