require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

;(async () => {
  // === Speaking recordings — uses ai_evaluation column ===
  const { data: spk, error: spkErr } = await sb
    .from('speaking_recordings')
    .select('id, ai_evaluation, ai_evaluated_at, trainer_reviewed, is_latest')
    .not('ai_evaluation', 'is', null)
    .order('ai_evaluated_at', { ascending: false })
    .limit(50)

  if (spkErr) {
    console.log('speaking_recordings error:', spkErr.message)
  } else {
    console.log(`\n=== speaking_recordings (${spk.length} rows with ai_evaluation) ===`)
    const scores = spk.map(r => r.ai_evaluation?.overall_score ?? r.ai_evaluation?.score ?? null).filter(s => s !== null)
    const buckets = {}
    scores.forEach(s => { const k = String(s); buckets[k] = (buckets[k] || 0) + 1 })
    console.log('Unique score values:', [...new Set(scores)].length)
    console.log('Score distribution:', buckets)
    console.log('Sample scores (last 10):', scores.slice(0, 10))

    // Sub-score breakdown for first 5
    console.log('\nSub-scores (first 5):')
    spk.slice(0, 5).forEach((r, i) => {
      const ev = r.ai_evaluation || {}
      console.log(`  [${i}] overall=${ev.overall_score} grammar=${ev.grammar_score} vocab=${ev.vocabulary_score} fluency=${ev.fluency_score} task=${ev.task_completion_score}`)
    })

    // Pending ungraded count
    const pending = spk.filter(r => r.trainer_reviewed !== true && r.is_latest === true)
    console.log(`\nPending ungraded (is_latest=true, trainer_reviewed!=true): ${pending.length}`)
  }

  // === student_curriculum_progress — writing ai_feedback ===
  const { data: wrt, error: wrtErr } = await sb
    .from('student_curriculum_progress')
    .select('id, ai_feedback, trainer_graded_at, section_type')
    .eq('section_type', 'writing')
    .not('ai_feedback', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (wrtErr) {
    console.log('student_curriculum_progress error:', wrtErr.message)
  } else {
    console.log(`\n=== student_curriculum_progress writing (${wrt.length} rows with ai_feedback) ===`)
    const scores = wrt.map(r => r.ai_feedback?.overall_score ?? r.ai_feedback?.score ?? r.ai_feedback?.fluency_score ?? null).filter(s => s !== null)
    const buckets = {}
    scores.forEach(s => { const k = String(s); buckets[k] = (buckets[k] || 0) + 1 })
    console.log('Unique score values:', [...new Set(scores)].length)
    console.log('Score distribution:', buckets)
    console.log('Sample scores (last 10):', scores.slice(0, 10))

    const pending = wrt.filter(r => r.trainer_graded_at === null)
    console.log(`Pending ungraded: ${pending.length}`)
  }

  // === Level path check ===
  console.log('\n=== Level path check ===')
  const { data: lvlCheck } = await sb
    .from('students')
    .select('id, group_id, groups(level, name)')
    .not('group_id', 'is', null)
    .limit(5)
  console.log('students → groups.level sample:', (lvlCheck || []).map(s => ({ student: s.id.slice(0,8), group: s.groups?.name, level: s.groups?.level })))

  const { data: cols } = await sb.rpc('get_table_columns', { p_table: 'profiles' }).catch(() => ({ data: null }))
  // Fallback: try information_schema
  const { data: profCols } = await sb
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'profiles')
    .ilike('column_name', '%level%')
    .catch(() => ({ data: null }))
  console.log('profiles level columns:', profCols?.map(c => c.column_name) || 'N/A')

  const { data: studCols } = await sb
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'students')
    .ilike('column_name', '%level%')
    .catch(() => ({ data: null }))
  console.log('students level columns:', studCols?.map(c => c.column_name) || 'N/A')
})()
