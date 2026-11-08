// Text that Excel / LibreOffice would run as a formula (=, +, -, @, tab, carriage return at the start)
const FORMULA_START = /^[=+\-@\t\r]/

// Quote a cell when it contains a comma, a quote or a line break. Text typed by users (customer names,
// notes...) that starts like a formula gets a leading apostrophe so it stays plain text.
// Numbers are written as they are: a negative amount stays a number.
const toCell = (value) => {
  let text = String(value ?? '')
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// Save rows as a UTF-8 CSV file; the BOM makes Excel show Vietnamese correctly
export function downloadCsv(fileName, rows) {
  const csv = rows.map((row) => row.map(toCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
