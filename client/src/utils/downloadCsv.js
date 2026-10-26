// Quote a cell when it contains a comma, a quote or a line break
const toCell = (value) => {
  const text = String(value ?? '')
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
