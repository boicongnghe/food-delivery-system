// Order labels of the admin pages (order list, order snapshot in complaints / delivery issues)

export const ORDER_STATUSES = {
  pending: { label: 'Chờ quán nhận', tone: 'amber' },
  confirmed: { label: 'Chờ shipper nhận', tone: 'amber' }, // restaurant accepted, the kitchen waits for a shipper
  preparing: { label: 'Bếp đang nấu', tone: 'sky' },
  ready_for_pickup: { label: 'Chờ shipper lấy', tone: 'sky' },
  delivering: { label: 'Đang giao', tone: 'brand' },
  delivered: { label: 'Đã giao', tone: 'emerald' },
  cancelled: { label: 'Đã hủy', tone: 'red' },
}

// Tabs of the order list (server: TAB_STATUSES of adminOrderService)
export const ORDER_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ quán nhận' },
  { value: 'confirmed', label: 'Chờ shipper nhận' },
  { value: 'preparing', label: 'Bếp đang nấu' },
  { value: 'ready_for_pickup', label: 'Chờ shipper lấy' },
  { value: 'delivering', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'refund_pending', label: 'Chờ hoàn tiền' },
  // Handed to the admin by a timeout rule: kitchen far past its prep time (TO-05), no shipper (TO-06)
  { value: 'attention', label: 'Cần xử lý' },
  // Complaint (UC42) or delivery issue report (UC45) still waiting for an admin decision
  { value: 'open_case', label: 'Có khiếu nại/sự cố' },
]

export const PAYMENT_METHOD_LABELS = {
  cod: 'Tiền mặt (COD)',
  momo: 'MoMo',
  vnpay: 'VNPay',
  banking: 'Chuyển khoản',
  wallet: 'Ví ảo FoodDelivery',
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

// Refund owed after a paid order was cancelled (server: Order.refund.status)
export const REFUND_STATUSES = {
  pending: { label: 'Chờ hoàn tiền', tone: 'amber' },
  failed: { label: 'Hoàn tiền thất bại', tone: 'red' },
  succeeded: { label: 'Đã hoàn tiền', tone: 'emerald' },
}
