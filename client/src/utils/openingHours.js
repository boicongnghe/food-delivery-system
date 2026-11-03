const pad = (value) => String(value).padStart(2, '0')
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000 // UTC+7, no daylight saving

// Day of week and "HH:mm" in Vietnam, whatever the timezone of the viewer's device (same rule as the server)
const vietnamClock = (now) => {
  const vietnamTime = new Date(now.getTime() + VIETNAM_OFFSET_MS)
  return {
    day: vietnamTime.getUTCDay(),
    time: `${pad(vietnamTime.getUTCHours())}:${pad(vietnamTime.getUTCMinutes())}`,
  }
}

/**
 * Kiểm tra xem quán ăn có đang mở cửa tại thời điểm hiện tại hay không.
 * @param {Array} openingHours Mảng lịch hoạt động 7 ngày trong tuần
 * @param {Date} now Thời điểm kiểm tra (mặc định là hiện tại)
 * @returns {boolean}
 */
export function isOpenNow(openingHours = [], now = new Date()) {
  // TO-09: no schedule (or broken data) = closed, same rule as the server
  if (!Array.isArray(openingHours) || openingHours.length === 0) return false

  const { day: currentDay, time: currentTime } = vietnamClock(now)
  const today = openingHours.find((day) => day.dayOfWeek === currentDay)

  if (!today || today.isOpen === false || !Array.isArray(today.shifts) || today.shifts.length === 0) {
    return false
  }

  // Decision D1: shifts never cross midnight (the profile form requires close > open)
  return today.shifts.some(
    (shift) => shift.open && shift.close && shift.open < shift.close && currentTime >= shift.open && currentTime < shift.close,
  )
}

/**
 * Lấy chuỗi mô tả khung giờ mở cửa hôm nay của quán (ví dụ: "06:00 - 22:00" hoặc "Đóng cửa hôm nay")
 * @param {Array} openingHours
 * @param {Date} now
 * @returns {string}
 */
export function getOpeningHoursText(openingHours = [], now = new Date()) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    return 'Chưa có lịch mở cửa'
  }

  const currentDay = vietnamClock(now).day
  const today = openingHours.find((day) => day.dayOfWeek === currentDay)

  if (!today || today.isOpen === false || !Array.isArray(today.shifts) || today.shifts.length === 0) {
    return 'Hôm nay nghỉ'
  }

  return today.shifts.map((s) => `${s.open} - ${s.close}`).join(', ')
}
