const pad = (value) => String(value).padStart(2, '0');

/**
 * Kiểm tra xem nhà hàng có đang mở cửa tại thời điểm hiện tại hay không theo múi giờ Việt Nam (UTC+7).
 * @param {Array} openingHours Mảng lịch hoạt động 7 ngày
 * @param {Date} now Thời điểm kiểm tra
 * @returns {boolean}
 */
export const isRestaurantOpenNow = (openingHours = [], now = new Date()) => {
  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    // Mặc định mở nếu quán chưa thiết lập lịch
    return true;
  }

  // Chuyển đổi chính xác sang giờ Việt Nam (Asia/Ho_Chi_Minh)
  const vnTimeStr = now.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }); // dạng "HH:mm"

  // Lấy thứ trong tuần theo giờ Việt Nam
  const vnDateStr = now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const vnDay = new Date(vnDateStr).getDay();

  const today = openingHours.find((d) => d.dayOfWeek === vnDay);
  if (!today || today.isOpen === false || !Array.isArray(today.shifts) || today.shifts.length === 0) {
    return false;
  }

  return today.shifts.some((shift) => {
    if (!shift.open || !shift.close) return false;
    if (shift.open <= shift.close) {
      return vnTimeStr >= shift.open && vnTimeStr < shift.close;
    } else {
      // Ca phục vụ qua nửa đêm
      return vnTimeStr >= shift.open || vnTimeStr < shift.close;
    }
  });
};

