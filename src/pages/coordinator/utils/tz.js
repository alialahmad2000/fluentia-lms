/**
 * Two clocks, always.
 *
 * The coordinator works a Riyadh academy from another timezone. Every
 * timestamp in the console therefore renders in BOTH zones —
 *   "Today 8:14 PM Riyadh · 6:14 PM your time"
 * — so he never has to do the arithmetic that decides whether a student went
 * quiet last night or this morning.
 *
 * His zone comes from profiles.timezone when it is set (the create-coordinator
 * script writes it), and falls back to whatever the browser resolves. The
 * fallback is the common case and is usually right; the column exists because
 * a VPN or a travelling laptop makes the browser wrong, and a wrong "your
 * time" is worse than no second clock at all.
 *
 * No new dependencies — Intl only. Note that src/lib/forceGregorian.js has
 * already patched Intl.DateTimeFormat to pin calendar:'gregory' platform-wide,
 * so these formatters can never print a Hijri date.
 */

export const ACADEMY_TZ = 'Asia/Riyadh'

/** The viewer's own zone: profiles.timezone, else the browser's. */
export function viewerTz(profile) {
  const fromProfile = profile?.timezone
  if (fromProfile && typeof fromProfile === 'string') return fromProfile
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || ACADEMY_TZ
  } catch {
    return ACADEMY_TZ
  }
}

const toDate = (v) => (v instanceof Date ? v : v ? new Date(v) : null)

const fmt = (date, tz, opts) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-GB', opts).format(date)
  }
}

/** "8:14 PM" in a given zone. */
export function timeIn(value, tz) {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return ''
  return fmt(d, tz, { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** "21 Aug 2026" in a given zone. */
export function dateIn(value, tz) {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return ''
  return fmt(d, tz, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * YYYY-MM-DD for a moment, in a given zone.
 *
 * Everything that buckets by day has to go through this. Date.toISOString()
 * buckets in UTC, which puts every Riyadh evening (UTC+3) into the previous
 * day's cell — so the "today" square of a 30-day strip is wrong for three
 * hours out of every twenty-four.
 */
export function dayKeyIn(value, tz = ACADEMY_TZ) {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const get = (t) => parts.find((p) => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** The last `n` calendar days in the academy's zone, oldest first. */
export function lastNDayKeys(n, tz = ACADEMY_TZ) {
  const out = []
  const now = Date.now()
  for (let i = n - 1; i >= 0; i--) out.push(dayKeyIn(new Date(now - i * 86400000), tz))
  return out
}

/** Calendar-day difference between now and a timestamp, in the academy's zone. */
function dayKey(date, tz) {
  return fmt(date, tz, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/**
 * "Today 8:14 PM Riyadh · 6:14 PM your time"
 * Same-zone coordinators get the single clock — repeating an identical time
 * twice reads as a bug.
 */
export function dualTime(value, viewerZone) {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const sameDay = dayKey(d, ACADEMY_TZ) === dayKey(now, ACADEMY_TZ)
  const yesterday = new Date(now.getTime() - 86400000)
  const isYesterday = dayKey(d, ACADEMY_TZ) === dayKey(yesterday, ACADEMY_TZ)

  const prefix = sameDay ? 'Today' : isYesterday ? 'Yesterday' : dateIn(d, ACADEMY_TZ)
  const riyadh = `${prefix} ${timeIn(d, ACADEMY_TZ)} Riyadh`

  if (!viewerZone || viewerZone === ACADEMY_TZ) return riyadh
  return `${riyadh} · ${timeIn(d, viewerZone)} your time`
}

/** Short form for dense lists: "21 Aug, 8:14 PM Riyadh · 6:14 PM yours". */
export function dualShort(value, viewerZone) {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return ''
  const riyadh = `${dateIn(d, ACADEMY_TZ)}, ${timeIn(d, ACADEMY_TZ)} Riyadh`
  if (!viewerZone || viewerZone === ACADEMY_TZ) return riyadh
  return `${riyadh} · ${timeIn(d, viewerZone)} yours`
}

/** "3 days ago" / "today" — for silence counts read at a glance. */
export function daysAgoLabel(days) {
  if (days == null) return 'never seen'
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/** The city label for the current wall clock, e.g. "Riyadh 8:14 PM · yours 6:14 PM". */
export function nowBothZones(viewerZone) {
  const now = new Date()
  const riyadh = `Riyadh ${timeIn(now, ACADEMY_TZ)}`
  if (!viewerZone || viewerZone === ACADEMY_TZ) return riyadh
  return `${riyadh} · yours ${timeIn(now, viewerZone)}`
}
