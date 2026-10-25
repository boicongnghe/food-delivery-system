const pad = (value) => String(value).padStart(2, '0')

// 125000 ms -> "02:05", 3725000 ms -> "1:02:05"
export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

// Elapsed ms -> "vừa xong" / "23 phút trước" / "2 giờ trước"
export function formatTimeAgo(ms) {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  return `${Math.floor(minutes / 60)} giờ trước`
}

// Remaining ms -> "Còn 10 phút" / "Còn dưới 1 phút" / "Trễ 3 phút"
export function formatCountdown(ms) {
  if (ms < 0) return `Trễ ${Math.max(1, Math.floor(-ms / 60000))} phút`
  const minutes = Math.floor(ms / 60000)
  return minutes < 1 ? 'Còn dưới 1 phút' : `Còn ${minutes} phút`
}

// Date -> "11:35" (or "11:35:07" with seconds)
export function formatClock(date, withSeconds = false) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  })
}
