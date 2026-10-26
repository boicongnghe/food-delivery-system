const DAY_MS = 24 * 60 * 60 * 1000
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const pad = (value) => String(value).padStart(2, '0')

// Date -> "26/10/2026"
export function formatDate(date) {
  return date ? dateFormatter.format(new Date(date)) : ''
}

// Date -> "14:30 26/10/2026"
export function formatDateTime(date) {
  return date ? dateTimeFormatter.format(new Date(date)) : ''
}

// "2026-10-26" -> "26/10/2026" (date-only values such as commission rule periods)
export function formatDay(day) {
  return day ? day.split('-').reverse().join('/') : ''
}

// Today as "YYYY-MM-DD" in Vietnam time, the calendar the server uses for reports and rules
export function todayInVietnam() {
  return new Date(Date.now() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10)
}

// ("2026-10-31", 1) -> "2026-11-01"
export function addDays(day, days) {
  return new Date(Date.parse(day) + days * DAY_MS).toISOString().slice(0, 10)
}

// Date -> value of <input type="datetime-local"> (browser time)
export function toDateTimeLocalValue(date) {
  const value = new Date(date)
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}
