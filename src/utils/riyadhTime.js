const RIYADH_TZ = 'Asia/Riyadh'

/** Returns the Riyadh "today" as a Date at UTC-midnight of that calendar date. */
export function riyadhToday() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RIYADH_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now)
  const y = parts.find(p => p.type === 'year').value
  const m = parts.find(p => p.type === 'month').value
  const d = parts.find(p => p.type === 'day').value
  return new Date(`${y}-${m}-${d}T00:00:00Z`)
}

/** Sunday-start of the week containing `date` (Riyadh DOW). */
export function riyadhWeekStart(date) {
  const d = new Date(date)
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - dow)
  return d
}

/** Add days */
export function addDays(date, n) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const AR_DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

export function formatArabicDayLabel(date) {
  const t = riyadhToday().getTime()
  const d = new Date(date).getTime()
  const diffDays = Math.round((t - d) / 86400000)
  const dn = new Date(date)
  const dayName = AR_DAYS[dn.getUTCDay()]
  const dateStr = `${dn.getUTCDate()} ${AR_MONTHS[dn.getUTCMonth()]}`

  if (diffDays === 0) return `اليوم — ${dayName}، ${dateStr}`
  if (diffDays === 1) return `أمس — ${dayName}، ${dateStr}`
  return `${dayName}، ${dateStr}`
}

export function formatArabicWeekLabel(weekStart) {
  const cur = riyadhWeekStart(riyadhToday())
  const ws = new Date(weekStart)
  const we = addDays(ws, 6)
  const diffWeeks = Math.round((cur.getTime() - ws.getTime()) / (7 * 86400000))

  const range = `${ws.getUTCDate()} ${AR_MONTHS[ws.getUTCMonth()]} – ${we.getUTCDate()} ${AR_MONTHS[we.getUTCMonth()]}`
  if (diffWeeks === 0) return `هذا الأسبوع (${range})`
  if (diffWeeks === 1) return `الأسبوع الماضي (${range})`
  return `أسبوع ${range}`
}
