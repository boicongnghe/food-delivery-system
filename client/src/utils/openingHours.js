const pad = (value) => String(value).padStart(2, '0')

/**
 * Kiểm tra xem quán ăn có đang mở cửa tại thời điểm hiện tại hay không.
 * @param {Array} openingHours Mảng lịch hoạt động 7 ngày trong tuần
 * @param {Date} now Thời điểm kiểm tra (mặc định là hiện tại)
 * @returns {boolean}
 */
export function isOpenNow(openingHours = [], now = new Date()) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    // Mặc định mở nếu quán chưa thiết lập lịch
    return true
  }

  const currentDay = now.getDay()
  const today = openingHours.find((day) => day.dayOfWeek === currentDay)

  if (!today || today.isOpen === false || !Array.isArray(today.shifts) || today.shifts.length === 0) {
    return false
  }

  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  return today.shifts.some((shift) => {
    if (!shift.open || !shift.close) return false
    if (shift.open <= shift.close) {
      return currentTime >= shift.open && currentTime < shift.close
    } else {
      // Ca phục vụ qua đêm (ví dụ: 18:00 - 02:00)
      return currentTime >= shift.open || currentTime < shift.close
    }
  })
}

/**
 * Lấy chuỗi mô tả khung giờ mở cửa hôm nay của quán (ví dụ: "06:00 - 22:00" hoặc "Đóng cửa hôm nay")
 * @param {Array} openingHours
 * @param {Date} now
 * @returns {string}
 */
export function getOpeningHoursText(openingHours = [], now = new Date()) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    return '06:00 - 23:00'
  }

  const currentDay = now.getDay()
  const today = openingHours.find((day) => day.dayOfWeek === currentDay)

  if (!today || today.isOpen === false || !Array.isArray(today.shifts) || today.shifts.length === 0) {
    return 'Hôm nay nghỉ'
  }

  return today.shifts.map((s) => `${s.open} - ${s.close}`).join(', ')
}
