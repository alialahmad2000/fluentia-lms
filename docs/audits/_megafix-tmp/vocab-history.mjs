import { admin } from '../../../scripts/lib/supa.mjs'

const out = {}

// Write-history distribution by day across the WHOLE table (full count this time)
const { data, error } = await admin
  .from('vocabulary_word_mastery')
  .select('created_at, updated_at, student_id, mastery_level')
  .order('updated_at', { ascending: false })
if (error) { console.log('ERR', error.message); process.exit(1) }

out.total = data.length
const byDay = {}
const createdByDay = {}
for (const r of data) {
  const ud = (r.updated_at || '').slice(0, 10)
  const cd = (r.created_at || '').slice(0, 10)
  byDay[ud] = (byDay[ud] || 0) + 1
  createdByDay[cd] = (createdByDay[cd] || 0) + 1
}
out.updated_by_day = byDay
out.created_by_day = createdByDay

// How many DISTINCT students have any mastery row, and how many wrote after May 14
out.distinct_students = new Set(data.map(r => r.student_id)).size
const may15 = '2026-05-15'
out.rows_updated_after_may14 = data.filter(r => (r.updated_at || '') >= may15).length
out.students_active_after_may14 = new Set(
  data.filter(r => (r.updated_at || '') >= may15).map(r => r.student_id)
).size

// Spread of created_at vs updated_at: are they identical (= never re-touched)?
out.created_equals_updated = data.filter(r => r.created_at === r.updated_at).length
out.created_differs_updated = data.filter(r => r.created_at !== r.updated_at).length

// srs_review_logs real columns + recent activity (using reviewed_at)
const { data: logs, error: lerr } = await admin
  .from('srs_review_logs')
  .select('student_id, rating, reviewed_at')
  .order('reviewed_at', { ascending: false })
  .limit(10)
out.srs_logs = lerr ? `ERR ${lerr.message}` : logs.map(l => ({ at: l.reviewed_at, rating: l.rating }))

// hard_words_drill_log recent
const { data: hw, error: herr } = await admin
  .from('hard_words_drill_log')
  .select('student_id, drill_mode, is_correct, attempted_at')
  .order('attempted_at', { ascending: false })
  .limit(10)
out.hard_words_log = herr ? `ERR ${herr.message}` : hw

// vocabulary_quiz_attempts recent
const { data: q, error: qerr } = await admin
  .from('vocabulary_quiz_attempts')
  .select('student_id, correct_count, total_questions, created_at')
  .order('created_at', { ascending: false })
  .limit(10)
out.quiz_attempts = qerr ? `ERR ${qerr.message}` : q.map(x => ({ at: x.created_at, score: `${x.correct_count}/${x.total_questions}` }))

console.log(JSON.stringify(out, null, 2))
