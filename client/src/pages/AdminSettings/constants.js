// Fields of the order timeout settings (server: PlatformSetting / settingValidation), in minutes
export const SETTING_FIELDS = [
  { key: 'payTimeout', label: 'Thời hạn chuyển khoản', min: 5, max: 120 },
  { key: 'acceptRemind', label: 'Nhắc quán nhận đơn sau', min: 1, max: 30 },
  { key: 'acceptTimeout', label: 'Tự hủy nếu quán chưa nhận sau', min: 2, max: 60 },
  { key: 'defaultPrepTime', label: 'Thời gian chuẩn bị mặc định (quán chưa khai báo)', min: 5, max: 120 },
  { key: 'prepGrace', label: 'Chuyển admin khi quá giờ chuẩn bị thêm', min: 5, max: 120 },
  { key: 'shipperRemind', label: 'Báo admin khi chưa có shipper sau', min: 1, max: 60 },
  { key: 'shipperTimeout', label: 'Tự hủy nếu vẫn chưa có shipper sau', min: 5, max: 120 },
  { key: 'pickupWait', label: 'Báo admin khi shipper đã nhận nhưng chưa lấy hàng sau', min: 5, max: 120 },
  { key: 'closingCutoff', label: 'Ngừng nhận đơn trước giờ đóng cửa', min: 0, max: 180 },
]
