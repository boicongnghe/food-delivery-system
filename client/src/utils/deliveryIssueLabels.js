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

// What the admin does with the order the shipper could not finish (server: ISSUE_ORDER_ACTIONS)
export const ISSUE_ORDER_ACTION_LABELS = {
  none: 'Giữ nguyên đơn hàng',
  release: 'Trả đơn về hàng chờ (đổi shipper)',
  cancel: 'Hủy đơn & hoàn tiền',
}

// Hearing before a penalty: free chat between the parties of the order (server: HEARING_PARTIES + admin)
export const HEARING_PARTY_LABELS = {
  shipper: 'Shipper',
  customer: 'Khách hàng',
  restaurant: 'Nhà hàng',
  admin: 'Quản trị viên',
}

// server: getHearingState
export const HEARING_STATES = {
  none: { label: 'Chưa đối chất', tone: 'slate' },
  open: { label: 'Đang đối chất', tone: 'sky' },
  closed: { label: 'Đã kết thúc đối chất', tone: 'brand' },
}

export const HEARING_MAX_HOURS = 24

export const PENALTY_ACTION_LABELS = {
  warning: 'Cảnh cáo',
  fine: 'Phạt tiền',
  suspend: 'Đình chỉ hoạt động',
}
