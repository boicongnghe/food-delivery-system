// Delivery issue reports (UC34 / UC45): same values as server/src/models/DeliveryIssue.js

export const DELIVERY_ISSUE_TYPE_LABELS = {
  customer_unreachable: 'Không liên lạc được khách',
  wrong_address: 'Sai địa chỉ giao hàng',
  customer_refused: 'Khách từ chối nhận hàng',
  restaurant_delay: 'Quán chuẩn bị chậm',
  damaged_items: 'Hàng bị hư hỏng / đổ vỡ',
  accident: 'Tai nạn / sự cố trên đường',
  other: 'Sự cố khác',
}

export const DELIVERY_ISSUE_STATUSES = {
  open: { label: 'Chờ xử lý', tone: 'amber' },
  resolved: { label: 'Đã xử lý', tone: 'emerald' },
  dismissed: { label: 'Đã bác bỏ', tone: 'slate' },
}

export const PENALTY_TARGET_LABELS = { shipper: 'Shipper', restaurant: 'Nhà hàng', customer: 'Khách hàng' }

export const PENALTY_ACTION_LABELS = {
  warning: 'Cảnh cáo',
  fine: 'Phạt tiền',
  suspend: 'Đình chỉ hoạt động',
}
