/**
 * English labels for everything the signals engine emits.
 *
 * The engine writes Arabic (`reason_ar`, `suggested_action_ar`) because it was
 * built for Arabic-reading trainers. The coordinator reads none of it, so every
 * machine-readable code gets an English rendering here.
 *
 * The six reason codes below are ALL the codes present in production
 * (2026-08-21, 2,842 rows since 2026-04-19):
 *   stuck_on_unit 1,251 · silent_7d 915 · never_logged_in 350 ·
 *   silent_48h 310 · milestone_500 11 · milestone_1000 5
 * A code the engine adds later falls back to a de-slugged version of itself
 * rather than rendering blank — visible, and obviously unlabelled.
 */

export const REASON_LABELS = {
  silent_48h: {
    label: 'Silent 48 hours',
    blurb: 'No activity for two days — early, still easy to recover.',
    tone: 'urgent',
  },
  silent_7d: {
    label: 'Silent 7 days',
    blurb: 'A full week with nothing. This is where students are lost.',
    tone: 'urgent',
  },
  never_logged_in: {
    label: 'Never logged in',
    blurb: 'Enrolled but has never opened the platform. Usually a login or access problem, not motivation.',
    tone: 'urgent',
  },
  stuck_on_unit: {
    label: 'Stuck on a unit',
    blurb: 'Two weeks or more on the same point without moving forward.',
    tone: 'attention',
  },
  milestone_500: {
    label: 'Milestone — 500 XP',
    blurb: 'Something worth congratulating, not chasing.',
    tone: 'celebrate',
  },
  milestone_1000: {
    label: 'Milestone — 1,000 XP',
    blurb: 'Something worth congratulating, not chasing.',
    tone: 'celebrate',
  },
}

export function reasonLabel(code) {
  if (!code) return 'Unknown signal'
  return (
    REASON_LABELS[code]?.label ||
    String(code).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  )
}

export function reasonBlurb(code) {
  return REASON_LABELS[code]?.blurb || 'No description for this signal yet.'
}

/** Every severity the CHECK constraint allows. */
export const SEVERITY = {
  urgent: { label: 'Urgent', color: 'var(--ds-accent-danger)' },
  attention: { label: 'Attention', color: 'var(--ds-accent-warning)' },
  celebrate: { label: 'Celebrate', color: 'var(--ds-accent-success)' },
}

export function severityLabel(s) {
  return SEVERITY[s]?.label || s || '—'
}
export function severityColor(s) {
  return SEVERITY[s]?.color || 'var(--ds-text-tertiary)'
}

/**
 * Why the student stalled. This list is the console's real output: after a few
 * hundred rows it tells the academy whether it has a motivation problem or a
 * software problem. `platform_issue` is deliberately second — it is the one
 * duty the coordinator has that nobody else in the company has.
 */
export const BLOCKERS = [
  { value: 'motivation', label: 'Motivation', hint: 'Lost momentum, drifted, no external obstacle.' },
  { value: 'platform_issue', label: 'Platform issue', hint: 'Something in the product blocked them — this becomes a bug ticket.' },
  { value: 'schedule', label: 'Schedule', hint: 'Exams, work, travel — time, not willingness.' },
  { value: 'personal', label: 'Personal', hint: 'Health, family, circumstances.' },
  { value: 'unknown', label: 'Unknown', hint: 'Reached out, no answer yet.' },
]

export const CHANNEL_LABELS = {
  in_app_message: 'Message sent',
  escalated: 'Escalated to admin',
  no_action_needed: 'No action needed',
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

/* The keys the signals engine actually writes into signal_data, in English. */
const SIGNAL_KEYS = {
  stuck_units: (v) => `${v} unit${v === 1 ? '' : 's'} untouched for two weeks or more`,
  hours_idle: (v) => `${Math.round(Number(v) / 24)} days with nothing at all when this was raised`,
  days_silent: (v) => `${v} days silent when this was raised`,
  last_active_at: (v) => `the engine last saw them on ${String(v).slice(0, 10)}`,
  last_active: (v) => `the engine last saw them on ${String(v).slice(0, 10)}`,
  days: (v) => `${v} days`,
  xp_total: (v) => `${v} XP in total`,
}

/**
 * signal_data is a small jsonb bag whose keys differ per reason_code. An
 * unmapped key returns null and disappears: the previous fallback stringified
 * the raw value, so the panel showed a non-technical reader
 * `last active at: "2026-07-21T00:00:00+00:00"` — debug output, quote marks
 * and all.
 */
export function describeSignal(signalData) {
  if (!signalData || typeof signalData !== 'object') return []
  return Object.entries(signalData)
    .map(([k, v]) => (SIGNAL_KEYS[k] ? SIGNAL_KEYS[k](v) : null))
    .filter(Boolean)
}
