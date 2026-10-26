// Categorical slots 1-3 of the dataviz palette (dark steps), validated on the admin surfaces #020617 / #0f172a.
// Color follows the series: the same status always keeps the same color.
export const ORDER_SERIES = [
  { id: 'delivered', label: 'Giao thành công', color: '#3987e5' },
  { id: 'cancelled', label: 'Đã hủy', color: '#d95926' },
  { id: 'inProgress', label: 'Đang xử lý', color: '#199e70' },
]

// Single series: slot 1, the chart title names it (no legend box)
export const REVENUE_SERIES = [{ id: 'gmv', label: 'Doanh thu (GMV)', color: '#3987e5' }]
export const RATING_BAR_COLOR = '#3987e5'

export const RANGE_PRESETS = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'lastMonth', label: 'Tháng trước' },
  { value: 'custom', label: 'Tùy chọn' },
]
