// Order labels of the admin pages (order list, order snapshot in complaints / delivery issues)

export const ORDER_STATUSES = {
  pending: { label: 'Chờ quán nhận', tone: 'amber' },
  confirmed: { label: 'Đã xác nhận', tone: 'sky' }, // legacy status, shown with "preparing"
  preparing: { label: 'Đang chuẩn bị', tone: 'sky' },
  ready_for_pickup: { label: 'Chờ shipper lấy', tone: 'sky' },
  delivering: { label: 'Đang giao', tone: 'brand' },
  delivered: { label: 'Đã giao', tone: 'emerald' },
  cancelled: { label: 'Đã hủy', tone: 'red' },
}

// Tabs of the order list (server: TAB_STATUSES of adminOrderService)
export const ORDER_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ quán nhận' },
  { value: 'preparing', label: 'Đang chuẩn bị' },
  { value: 'ready_for_pickup', label: 'Chờ shipper lấy' },
  { value: 'delivering', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
]

export const PAYMENT_METHOD_LABELS = {
  cod: 'Tiền mặt (COD)',
  momo: 'MoMo',
  vnpay: 'VNPay',
  banking: 'Chuyển khoản',
}

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'chưa thanh toán',
  pending: 'chờ thanh toán',
  failed: 'thanh toán lỗi',
  paid: 'đã thanh toán',
  refunded: 'đã hoàn tiền',
  cancelled: 'đã hủy',
}

export const ACTOR_LABELS = { customer: 'Khách hàng', restaurant: 'Nhà hàng', shipper: 'Shipper', system: 'Hệ thống' }
