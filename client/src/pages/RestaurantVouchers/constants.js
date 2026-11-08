// Same values as statusOf() in server/src/services/restaurantVoucherService.js
export const VOUCHER_STATUS = {
  running: { label: 'Đang chạy', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  upcoming: { label: 'Sắp diễn ra', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  exhausted: { label: 'Hết lượt', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  paused: { label: 'Tạm dừng', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  ended: { label: 'Đã kết thúc', className: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export const DISCOUNT_TYPES = [
  { value: 'fixed', label: 'Giảm số tiền', hint: 'VD: giảm 20.000đ' },
  { value: 'percentage', label: 'Giảm theo %', hint: 'VD: giảm 15%, tối đa 30.000đ' },
]

export const PER_CUSTOMER_MAX = 10
