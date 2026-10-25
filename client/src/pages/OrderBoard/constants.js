export const POLL_INTERVAL_MS = 15 * 1000 // reload the board every 15s
export const LATE_AFTER_MS = 5 * 60 * 1000 // pending longer than 5 minutes -> red warning
export const NEW_ORDER_MS = 60 * 1000 // "Mới tinh" badge during the first minute
export const SOUND_STORAGE_KEY = 'orderBoard.soundEnabled'

// Only approved restaurants can accept new orders (same rule as the server)
export const ACCEPT_BLOCKED_MESSAGES = {
  pending: 'Quán đang chờ admin duyệt – chưa thể nhận đơn mới',
  rejected: 'Quán không được duyệt hoạt động – không thể nhận đơn mới',
  suspended: 'Quán đang bị tạm ngưng hoạt động – không thể nhận đơn mới',
}

// Same values as REJECT_REASONS on the server
export const REJECT_REASONS = [
  { value: 'out_of_stock', label: 'Hết món / hết nguyên liệu' },
  { value: 'too_busy', label: 'Quán đang quá tải' },
  { value: 'closing_soon', label: 'Quán sắp đóng cửa' },
  { value: 'other', label: 'Lý do khác' },
]

export const PAYMENT_METHOD_LABELS = { cod: 'Tiền mặt COD', momo: 'MoMo', vnpay: 'VNPay' }

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'Chưa thu',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
  cancelled: 'Đã hủy',
}

export const DELIVERY_TYPE_LABELS = { express: 'Giao nhanh 15p', standard: 'Tiêu chuẩn 30p' }

export const ORDER_STATUS_LABELS = {
  pending: 'Chờ nhận',
  preparing: 'Bếp đang nấu',
  ready_for_pickup: 'Sẵn sàng lấy hàng',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
}

// Timeline text for each status change
export const HISTORY_LABELS = {
  pending: 'Đặt đơn thành công',
  preparing: 'Quán đã nhận đơn – bếp bắt đầu nấu',
  ready_for_pickup: 'Bếp hoàn tất – sẵn sàng lấy hàng',
  delivering: 'Shipper đã lấy hàng',
  delivered: 'Giao hàng thành công',
  cancelled: 'Đơn đã bị hủy',
}

export const CANCELLED_BY_LABELS = {
  customer: 'Khách hàng',
  restaurant: 'Quán',
  shipper: 'Shipper',
  system: 'Hệ thống',
}
