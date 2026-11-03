// Display order Monday -> Sunday. dayOfWeek follows Date.getDay() (0 = Sunday).
export const WEEK_DAYS = [
  { dayOfWeek: 1, label: 'Thứ Hai' },
  { dayOfWeek: 2, label: 'Thứ Ba' },
  { dayOfWeek: 3, label: 'Thứ Tư' },
  { dayOfWeek: 4, label: 'Thứ Năm' },
  { dayOfWeek: 5, label: 'Thứ Sáu' },
  { dayOfWeek: 6, label: 'Thứ Bảy' },
  { dayOfWeek: 0, label: 'Chủ Nhật' },
]

export const CATEGORY_OPTIONS = [
  'Phở & Bún',
  'Món nước truyền thống',
  'Ăn sáng',
  'Cơm trưa văn phòng',
  'Bánh mì & cuốn',
  'Đồ uống',
  'Ăn vặt',
  'Món chay',
]

export const MAX_CATEGORIES = 5
export const NAME_MAX_LENGTH = 60
export const DESCRIPTION_MAX_LENGTH = 150
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB, same as server

export const DEFAULT_SHIFT = { open: '06:00', close: '22:00' }
export const DEFAULT_SECOND_SHIFT = { open: '17:00', close: '21:30' }

// Suggestions for the payout bank (free text is still allowed)
export const BANK_OPTIONS = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'VPBank',
  'Sacombank',
  'TPBank',
]

// TO-04 kitchen preparation time (minutes), same limits as the server
export const PREP_TIME_MIN = 5
export const PREP_TIME_MAX = 120
export const DEFAULT_PREP_TIME = 15
