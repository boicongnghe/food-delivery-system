// Fields of the order timeout settings (server: PlatformSetting / settingValidation). Minutes unless `unit`.
export const ACTIVE_FIELDS = [
  { key: 'acceptRemind', rule: 'TO-02', label: 'Nhắc quán nhận đơn sau', min: 1, max: 30 },
  { key: 'acceptTimeout', rule: 'TO-03', label: 'Tự hủy nếu quán chưa nhận sau', min: 2, max: 60 },
  { key: 'defaultPrepTime', rule: 'TO-04', label: 'Thời gian chuẩn bị mặc định (quán chưa khai báo)', min: 5, max: 120 },
  { key: 'prepGrace', rule: 'TO-05', label: 'Chuyển admin khi quá giờ chuẩn bị thêm', min: 5, max: 120 },
  { key: 'shipperRemind', rule: 'TO-06', label: 'Báo admin khi chưa có shipper sau', min: 1, max: 60 },
  { key: 'shipperTimeout', rule: 'TO-07', label: 'Tự hủy nếu vẫn chưa có shipper sau', min: 5, max: 120 },
  { key: 'closingCutoff', rule: 'TO-10', label: 'Ngừng nhận đơn trước giờ đóng cửa', min: 0, max: 180 },
]

// Saved now, applied when the payment and shipper modules implement their rules
export const PENDING_FIELDS = [
  { key: 'payTimeout', rule: 'TO-01', label: 'Thời hạn chuyển khoản', min: 5, max: 120, owner: 'Thanh toán' },
  { key: 'pickupWait', rule: 'TO-08', label: 'Shipper chờ ở quán tối đa', min: 5, max: 120, owner: 'Shipper' },
  { key: 'reconInterval', rule: 'TO-16', label: 'Chu kỳ đối soát giao dịch', min: 5, max: 60, owner: 'Thanh toán' },
  { key: 'refundSlaHours', rule: 'TO-11–14', label: 'Hạn hoàn tiền thủ công', min: 1, max: 168, unit: 'giờ', owner: 'Thanh toán' },
]
