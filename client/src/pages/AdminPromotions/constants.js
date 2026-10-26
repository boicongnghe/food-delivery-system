export const PAGE_SIZE = 10

// Same priority as the server: disabled > expired > exhausted > scheduled > active
export const PROMOTION_STATUSES = {
  active: { label: 'Đang chạy', tone: 'emerald' },
  scheduled: { label: 'Sắp diễn ra', tone: 'sky' },
  exhausted: { label: 'Hết lượt', tone: 'amber' },
  expired: { label: 'Đã hết hạn', tone: 'slate' },
  disabled: { label: 'Đã tắt', tone: 'red' },
}
