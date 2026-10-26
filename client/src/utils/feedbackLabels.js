// Labels shared by the customer feedback page and the admin pages (same values as the server models)

export const COMPLAINT_CATEGORY_LABELS = {
  missing_item: 'Thiếu món',
  wrong_item: 'Giao sai món',
  food_quality: 'Chất lượng món ăn',
  late_delivery: 'Giao hàng trễ',
  shipper_behavior: 'Thái độ shipper',
  payment: 'Thanh toán / hoàn tiền',
  other: 'Vấn đề khác',
}

export const COMPLAINT_STATUS_LABELS = {
  open: 'Chờ xử lý',
  resolved: 'Đã giải quyết',
  rejected: 'Không chấp nhận',
}

export const REVIEW_HIDE_REASON_LABELS = {
  spam: 'Spam / quảng cáo',
  offensive: 'Ngôn từ xúc phạm',
  irrelevant: 'Không liên quan đến đơn hàng',
  personal_info: 'Chứa thông tin cá nhân',
  other: 'Lý do khác',
}

export const RATING_LABELS = { 1: 'Rất tệ', 2: 'Tệ', 3: 'Bình thường', 4: 'Tốt', 5: 'Tuyệt vời' }
