import { admin } from '../../../scripts/lib/supa.mjs'

// What tap behavior are active students on? (default 'details' = WordDetailSheet, NOT exercise modal)
const { data: students } = await admin
  .from('students').select('id').eq('status', 'active')
const ids = (students || []).map(s => s.id)
const { data: profs } = await admin
  .from('profiles')
  .select('id, full_name, vocab_tap_behavior, vocab_onboarding_completed_at, last_vocab_visit_at')
  .in('id', ids)

const dist = {}
for (const p of (profs || [])) {
  const k = p.vocab_tap_behavior ?? 'NULL(=details default)'
  dist[k] = (dist[k] || 0) + 1
}
console.log(JSON.stringify({
  active_students: ids.length,
  tap_behavior_distribution: dist,
  sample: (profs || []).slice(0, 8).map(p => ({
    name: p.full_name,
    tap: p.vocab_tap_behavior ?? 'NULL',
    last_vocab_visit: p.last_vocab_visit_at,
  })),
}, null, 2))
