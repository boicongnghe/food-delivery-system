export const REPORT_TABS = [
  { value: 'overview', label: 'Tổng quan' },
  { value: 'orders', label: 'Lịch sử đơn hàng' },
  { value: 'reviews', label: 'Đánh giá khách hàng' },
  { value: 'commission', label: 'Chi tiết hoa hồng' },
]

export const RANGE_PRESETS = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'lastMonth', label: 'Tháng trước' },
  { value: '90d', label: '90 ngày' },
  { value: 'custom', label: 'Tùy chọn' },
]

// Categorical slots 1-3 of the dataviz palette (light steps, validated on the white card surface).
// Aqua sits below 3:1 contrast: the chart always offers the table view.
export const REVENUE_SERIES = [
  { id: 'foodRevenue', label: 'Tiền món', color: '#2a78d6' },
  { id: 'toppingRevenue', label: 'Topping', color: '#eb6834' },
  { id: 'packagingFee', label: 'Phí đóng gói', color: '#1baf7a' },
]
export const PEAK_BAR_COLOR = '#2a78d6'
export const RATING_BAR_COLOR = '#f59e0b'

// Same tabs as REPORT_ORDER_TABS on the server
export const ORDER_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'delivered', label: 'Hoàn thành' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'cancelled', label: 'Khách / hệ thống hủy' },
  { value: 'rejected', label: 'Quán từ chối' },
]

export const ORDER_STATUS_LABELS = {
  pending: 'Chờ nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Bếp đang nấu',
  ready_for_pickup: 'Chờ shipper',
  delivering: 'Đang giao',
  delivered: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

// Color + text, never color alone
export const ORDER_TAB_BADGES = {
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  in_progress: 'bg-sky-50 text-sky-800 border-sky-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
}

export const CANCELLED_BY_LABELS = {
  customer: 'Khách hủy',
  restaurant: 'Quán từ chối',
  shipper: 'Shipper hủy',
  system: 'Hệ thống hủy',
}

export const PAYMENT_METHOD_LABELS = { cod: 'Tiền mặt', momo: 'MoMo', vnpay: 'VNPay', banking: 'Chuyển khoản' }

export const SETTLEMENT_STATUS = {
  settled: { label: 'Đã quyết toán', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  pending: { label: 'Chờ chuyển khoản', className: 'bg-amber-50 text-amber-800 border-amber-200' },
}

export const REVIEW_PAGE_SIZE = 10
export const ORDER_PAGE_SIZE = 10
