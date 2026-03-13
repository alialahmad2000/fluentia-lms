// CSV export utility (no external dependency needed)
export function exportToCSV(data, filename, columns) {
  // columns = [{key: 'full_name', label: 'الاسم'}, ...]
  if (!Array.isArray(data) || !Array.isArray(columns) || columns.length === 0) return
  // Build CSV with UTF-8 BOM for Arabic support
  const BOM = '\uFEFF'
  const header = columns.map(c => c.label).join(',')
  const rows = data.map(row =>
    columns.map(c => {
      let val = typeof c.key === 'function' ? c.key(row) : row[c.key]
      if (val === null || val === undefined) val = ''
      // Escape commas and quotes
      val = String(val).replace(/"/g, '""')
      if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`
      return val
    }).join(',')
  )
  const csv = BOM + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a short delay to ensure the download starts in all browsers
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
