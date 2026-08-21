/**
 * English labels for everything the console displays.
 *
 * The coach reads no Arabic, so every machine-readable value the platform
 * stores gets an English rendering here — and every one of them carries a
 * short explanation, because a label he cannot interpret is no better than
 * Arabic he cannot read.
 */

/**
 * Risk bands, by days since the student last did anything at all.
 * The thresholds are the brief's: ok 0–2 · watch 3–5 · at_risk 6–13 ·
 * critical 14+.
 */
export const RISK = {
  critical: {
    label: 'Critical',
    blurb: 'Two weeks or more with nothing. This is where students are lost, not at risk of being lost.',
    color: 'var(--ds-accent-danger)',
    order: 0,
  },
  at_risk: {
    label: 'At risk',
    blurb: 'Over a week quiet. Still recoverable, and the window is closing.',
    color: 'var(--ds-accent-warning)',
    order: 1,
  },
  watch: {
    label: 'Watch',
    blurb: 'A few days quiet. Usually just a busy week — worth a light touch, not an alarm.',
    color: 'var(--ds-accent-gold)',
    order: 2,
  },
  ok: {
    label: 'Healthy',
    blurb: 'Active in the last two days. Leave them alone.',
    color: 'var(--ds-accent-success)',
    order: 3,
  },
}

export function riskLabel(b) { return RISK[b]?.label || b || '—' }
export function riskColor(b) { return RISK[b]?.color || 'var(--ds-text-tertiary)' }
export function riskBlurb(b) { return RISK[b]?.blurb || '' }
export const RISK_ORDER = ['critical', 'at_risk', 'watch', 'ok']

/**
 * Why the student stalled. This list is the console's real output: after a few
 * hundred touchpoints it tells the academy whether it has a motivation problem
 * or a software problem. `platform_issue` is deliberately second — it is the
 * one duty the coach has that nobody else in the company has.
 */
export const BLOCKERS = [
  { value: 'motivation', label: 'Motivation', hint: 'Lost momentum, drifted, no external obstacle.' },
  { value: 'platform_issue', label: 'Platform issue', hint: 'Something in the product blocked them — this becomes a bug ticket.' },
  { value: 'schedule', label: 'Schedule', hint: 'Exams, work, travel — time, not willingness.' },
  { value: 'personal', label: 'Personal', hint: 'Health, family, circumstances.' },
  { value: 'unknown', label: 'Unknown', hint: 'Reached out, no answer yet.' },
]

export function blockerLabel(v) {
  return BLOCKERS.find((b) => b.value === v)?.label || (v ? String(v).replace('_', ' ') : '—')
}

export const ACTION_LABELS = {
  message_sent: 'Message sent',
  observation: 'Observation',
  escalated: 'Escalated to admin',
  no_action_needed: 'No action needed',
}

/** What each template's tone signals, so he can pick without reading Arabic. */
export const TONE_LABELS = {
  warm: 'Warm',
  curious: 'Curious',
  encouraging: 'Encouraging',
  check_in: 'Check-in',
  celebratory: 'Celebratory',
}

/** Section names the help-request rows carry, in English. */
export const SECTION_LABELS = {
  reading: 'Reading',
  grammar: 'Grammar',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
  vocabulary: 'Vocabulary',
  vocabulary_exercise: 'Vocabulary exercise',
  pronunciation: 'Pronunciation',
  assessment: 'Unit assessment',
}

export function sectionLabel(s) {
  return SECTION_LABELS[s] || (s ? String(s).replace(/_/g, ' ') : '—')
}

export const GENDER_LABELS = { male: 'he/him', female: 'she/her' }

/**
 * Which templates suit a student at this silence level. A template with no
 * upper bound applies at any silence; one with both bounds is for that window
 * only, so the coach is never offered "quiet a week" copy for someone who was
 * here this morning.
 */
export function templateFits(t, { silenceDays, daysEnrolled } = {}) {
  const d = silenceDays ?? 0
  if (t.min_silence_days != null && d < t.min_silence_days) return false
  if (t.max_silence_days != null && d > t.max_silence_days) return false

  // The `first_week_*` family is bounded by how long the student has been
  // enrolled, which the silence window cannot express. Without this the picker
  // offered "how were your first days on the platform?" to a student enrolled
  // 146 days ago — the single fastest way to prove nobody is actually reading.
  if (t.code?.startsWith('first_week_') && daysEnrolled != null && daysEnrolled > FIRST_WEEK_GRACE_DAYS) {
    return false
  }
  return true
}

/** A "first week" message still makes sense in week two. Not in month five. */
export const FIRST_WEEK_GRACE_DAYS = 14

/**
 * Does this value need the RTL Arabic treatment?
 *
 * Applying `.ar-inline` unconditionally turned "146 days ago" into
 * "days ago 146": the number leads in RTL, so an English string with a numeral
 * gets reordered. Only actual Arabic gets the Arabic direction.
 */
const ARABIC_RE = /[\u0600-\u06FF]/
export function isArabic(v) {
  return typeof v === 'string' && ARABIC_RE.test(v)
}
