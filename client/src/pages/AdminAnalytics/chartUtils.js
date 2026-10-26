import { addDays } from '../../utils/formatDate.js'

const compactFormatter = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })

// 1500000 -> "1,5 Tr", 500000 -> "500 N" (axis ticks)
export const formatCompact = (value) => compactFormatter.format(value)

// 0 and clean steps up to at least max: 0 / 500 N / 1 Tr / 1,5 Tr. Counts use whole-number steps.
export const niceTicks = (max, { integer = false, count = 4 } = {}) => {
  if (max <= 0) return [0, 1]
  const rough = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const multipliers = integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]
  let step = multipliers.map((multiplier) => multiplier * magnitude).find((candidate) => candidate >= rough)
  if (integer) step = Math.max(1, Math.round(step))

  const ticks = [0]
  while (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

// Column with a rounded data-end (top) and a square baseline
export const columnPath = (x, y, width, height, radius) => {
  const r = Math.min(radius, height, width / 2)
  return `M${x},${y + height}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + width - r}A${r},${r} 0 0 1 ${x + width},${y + r}V${y + height}Z`
}

// Period keys from the API: "2026-10-26" (day) or "2026-10" (month)
export const formatPeriodShort = (key) => (key.length === 7 ? key.split('-').reverse().join('/') : `${key.slice(8)}/${key.slice(5, 7)}`)
export const formatPeriodLong = (key) =>
  key.length === 7 ? `Tháng ${key.split('-').reverse().join('/')}` : key.split('-').reverse().join('/')

// Preset -> { from, to } in Vietnam days (today included)
export const getPresetRange = (preset, today) => {
  const firstOfMonth = `${today.slice(0, 7)}-01`
  switch (preset) {
    case '7d':
      return { from: addDays(today, -6), to: today }
    case '90d':
      return { from: addDays(today, -89), to: today }
    case 'thisMonth':
      return { from: firstOfMonth, to: today }
    case 'lastMonth': {
      const lastOfPreviousMonth = addDays(firstOfMonth, -1)
      return { from: `${lastOfPreviousMonth.slice(0, 7)}-01`, to: lastOfPreviousMonth }
    }
    default:
      return { from: addDays(today, -29), to: today }
  }
}
