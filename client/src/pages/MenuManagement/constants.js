// Same values as MENU_ITEM_TAGS on the server
export const MENU_TAGS = [
  { value: 'best_seller', label: 'Bán chạy nhất', badge: 'Bán chạy', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'signature', label: 'Món chữ ký bếp', badge: 'Chữ ký', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'spicy', label: 'Cay nồng', badge: 'Cay', className: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'new', label: 'Món mới', badge: 'Mới', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

// countKey matches statusCounts/summary keys returned by the API
export const STATUS_TABS = [
  { value: 'all', label: 'Tất cả', countKey: 'all' },
  { value: 'selling', label: 'Đang bán', countKey: 'selling' },
  { value: 'sold_out', label: 'Hết', countKey: 'soldOut' },
  { value: 'hidden', label: 'Đang ẩn', countKey: 'hidden' },
]

export const PAGE_SIZE = 10
export const NAME_MAX_LENGTH = 80
export const DESCRIPTION_MAX_LENGTH = 250
export const MAX_OPTION_GROUPS = 10
export const MAX_OPTIONS_PER_GROUP = 20
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB, same as server
