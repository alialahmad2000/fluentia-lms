import { admin } from '../../../scripts/lib/supa.mjs'

const out = {}

// ── 1A.2 Schema check: list real columns via limit(1) key technique ──
async function cols(table) {
  const { data, error } = await admin.from(table).select('*').limit(1)
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { empty: true, columns: null }
  return { columns: Object.keys(data[0]).sort() }
}

const tables = [
  'vocabulary_word_mastery',
  'curriculum_vocabulary_srs',
  'srs_review_logs',
  'vocabulary_quiz_attempts',
  'hard_words_drill_log',
  'curriculum_vocabulary',
  'student_curriculum_progress',
  'student_saved_words',
]
out.schemas = {}
for (const t of tables) out.schemas[t] = await cols(t)

// ── Row counts per table ──
out.counts = {}
for (const t of tables) {
  const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true })
  out.counts[t] = error ? `ERR: ${error.message}` : count
}

// ── 1A.4 Pick 3 active students ──
const { data: students, error: stuErr } = await admin
  .from('students')
  .select('id, status')
  .eq('status', 'active')
  .limit(3)
out.studentsErr = stuErr?.message || null

// pull names from profiles (full_name lives there typically)
const ids = (students || []).map(s => s.id)
const { data: profs } = await admin.from('profiles').select('id, full_name, role').in('id', ids)
const nameOf = (id) => profs?.find(p => p.id === id)?.full_name || '(no name)'

out.students = []
for (const s of (students || [])) {
  const sid = s.id
  const rec = { id: sid, name: nameOf(sid) }

  // mastery rows by level
  const { data: vwm } = await admin
    .from('vocabulary_word_mastery')
    .select('mastery_level, meaning_exercise_passed, sentence_exercise_passed, listening_exercise_passed, updated_at, created_at')
    .eq('student_id', sid)
  rec.vwm_total = vwm?.length || 0
  rec.vwm_by_level = {}
  for (const r of (vwm || [])) {
    const k = r.mastery_level ?? 'NULL'
    rec.vwm_by_level[k] = (rec.vwm_by_level[k] || 0) + 1
  }
  // how many have at least one exercise passed but mastery_level NULL/new (the bug signature)
  rec.vwm_passed_but_not_learning = (vwm || []).filter(r =>
    (r.meaning_exercise_passed || r.sentence_exercise_passed || r.listening_exercise_passed) &&
    (r.mastery_level === 'new' || r.mastery_level == null)
  ).length

  // last 20 writes in past 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const { data: recent } = await admin
    .from('vocabulary_word_mastery')
    .select('vocabulary_id, mastery_level, meaning_exercise_passed, sentence_exercise_passed, listening_exercise_passed, updated_at')
    .eq('student_id', sid)
    .gte('updated_at', sevenDaysAgo)
    .order('updated_at', { ascending: false })
    .limit(20)
  rec.recent_writes_7d = recent?.length || 0
  rec.recent_sample = (recent || []).slice(0, 5).map(r => ({
    level: r.mastery_level,
    p: [r.meaning_exercise_passed, r.sentence_exercise_passed, r.listening_exercise_passed].filter(Boolean).length,
    at: r.updated_at,
  }))

  // SRS state counts
  const { data: srs } = await admin
    .from('curriculum_vocabulary_srs')
    .select('state')
    .eq('student_id', sid)
  rec.srs_total = srs?.length || 0
  rec.srs_by_state = {}
  for (const r of (srs || [])) {
    const k = r.state ?? 'NULL'
    rec.srs_by_state[k] = (rec.srs_by_state[k] || 0) + 1
  }

  // recent srs_review_logs
  const { data: logs, error: logErr } = await admin
    .from('srs_review_logs')
    .select('rating, created_at')
    .eq('student_id', sid)
    .order('created_at', { ascending: false })
    .limit(5)
  rec.srs_logs_recent = logErr ? `ERR: ${logErr.message}` : (logs?.length || 0)

  // recent quiz attempts
  const { data: quiz, error: qErr } = await admin
    .from('vocabulary_quiz_attempts')
    .select('correct_count, total_questions, created_at')
    .eq('student_id', sid)
    .order('created_at', { ascending: false })
    .limit(5)
  rec.quiz_recent = qErr ? `ERR: ${qErr.message}` : (quiz?.length || 0)

  // vocab section completion rows
  const { data: scp } = await admin
    .from('student_curriculum_progress')
    .select('unit_id, status, score, updated_at')
    .eq('student_id', sid)
    .eq('section_type', 'vocabulary')
  rec.scp_vocab_rows = scp?.length || 0
  rec.scp_vocab_completed = (scp || []).filter(r => r.status === 'completed').length

  out.students.push(rec)
}

// ── Global mastery_level distribution (the smoking gun for V2 Phase F bug) ──
const { data: allLevels } = await admin
  .from('vocabulary_word_mastery')
  .select('mastery_level, meaning_exercise_passed, sentence_exercise_passed, listening_exercise_passed')
  .limit(20000)
out.global = { total: allLevels?.length || 0, by_level: {}, passed_but_new_or_null: 0 }
for (const r of (allLevels || [])) {
  const k = r.mastery_level ?? 'NULL'
  out.global.by_level[k] = (out.global.by_level[k] || 0) + 1
  if ((r.meaning_exercise_passed || r.sentence_exercise_passed || r.listening_exercise_passed) &&
      (r.mastery_level === 'new' || r.mastery_level == null)) {
    out.global.passed_but_new_or_null++
  }
}

// Most recent writes globally (is anything being written at all, lately?)
const { data: latest } = await admin
  .from('vocabulary_word_mastery')
  .select('updated_at, mastery_level')
  .order('updated_at', { ascending: false })
  .limit(10)
out.global.latest_writes = (latest || []).map(r => ({ at: r.updated_at, level: r.mastery_level }))

console.log(JSON.stringify(out, null, 2))
