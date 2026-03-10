import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, differenceInDays, differenceInHours } from 'date-fns'
import { ar } from 'date-fns/locale'

// Get Arabic greeting based on time of day
export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'صباح الخير'
  if (hour < 17) return 'مساء الخير'
  return 'مساء النور'
}

// Format date in Arabic
export function formatDateAr(date) {
  return format(new Date(date), 'dd MMMM yyyy', { locale: ar })
}

// Relative time in Arabic: "قبل ساعتين", "أمس", etc.
export function timeAgo(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar })
}

// Deadline display: "اليوم", "غداً", "بعد 3 أيام", "متأخر بيومين"
export function deadlineText(deadline) {
  const d = new Date(deadline)
  const now = new Date()

  if (isToday(d)) return 'اليوم'
  if (isTomorrow(d)) return 'غداً'

  const daysLeft = differenceInDays(d, now)
  if (daysLeft > 0 && daysLeft <= 7) return `بعد ${daysLeft} أيام`
  if (daysLeft > 7) return formatDateAr(d)

  const daysOverdue = Math.abs(daysLeft)
  if (daysOverdue === 1) return 'متأخر بيوم'
  return `متأخر بـ ${daysOverdue} أيام`
}

// Is deadline overdue?
export function isOverdue(deadline) {
  return new Date(deadline) < new Date()
}

// Is deadline soon (within 48 hours)?
export function isDueSoon(deadline) {
  const hours = differenceInHours(new Date(deadline), new Date())
  return hours > 0 && hours <= 48
}

// Format time for class schedule
export function formatTime(time) {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const period = hour >= 12 ? 'م' : 'ص'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m} ${period}`
}

// Get Arabic day name
export function getArabicDay(englishDay) {
  const days = {
    Sunday: 'الأحد', Monday: 'الإثنين', Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
  }
  return days[englishDay] || englishDay
}
