const pad = (value) => String(value).padStart(2, '0')

// openingHours: [{ dayOfWeek: 0-6, isOpen, shifts: [{ open: 'HH:mm', close: 'HH:mm' }] }]
export function isOpenNow(openingHours = [], now = new Date()) {
  const today = openingHours.find((day) => day.dayOfWeek === now.getDay())
  if (!today?.isOpen) return false

  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  return today.shifts.some((shift) => shift.open <= currentTime && currentTime < shift.close)
}
