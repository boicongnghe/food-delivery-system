const numberFormatter = new Intl.NumberFormat('vi-VN')

// 65000 -> "65.000 đ"
export function formatCurrency(amount) {
  return `${numberFormatter.format(amount || 0)} đ`
}

// 65000 -> "65.000" (for price inputs)
export function formatNumber(value) {
  if (value === '' || value === null || value === undefined) return ''
  return numberFormatter.format(value)
}

// "65.000 đ" -> "65000" (keep digits only)
export function parseNumberInput(text) {
  return String(text).replace(/\D/g, '')
}
