import { admin as sb } from '../../lib/supa.mjs'
import { writeFileSync } from 'node:fs'

const LAMIA_ID = '95124347-7ad8-46b7-b745-b6c085bf3a6f'

// 1. user_interests
const { data: ui } = await sb.from('user_interests').select('*').eq('user_id', LAMIA_ID).maybeSingle()
console.log('--- user_interests ---')
console.log(JSON.stringify(ui, null, 2))

// 2. personalized_readings — by user_id? actually schema doesn't have user_id; it's by canonical_reading_id + interest_bucket
console.log('\n--- personalized_readings: does this table even have user_id? ---')
const { data: prSample } = await sb.from('personalized_readings').select('*').limit(1)
console.log('  columns:', prSample?.[0] ? Object.keys(prSample[0]).join(', ') : 'n/a')

// 3. activity_attempts — what unit was she most recently in?
console.log('\n--- recent activity_attempts ---')
const { data: aa, error: aaErr } = await sb
  .from('activity_attempts')
  .select('id, student_id, activity_id, activity_type, status, created_at')
  .eq('student_id', LAMIA_ID)
  .order('created_at', { ascending: false })
  .limit(5)
if (aaErr) console.log('  activity_attempts err:', aaErr.message)
else for (const a of aa || []) console.log(`  ${a.created_at} type=${a.activity_type} status=${a.status}`)

// 4. student_curriculum_progress
console.log('\n--- student_curriculum_progress (last 10) ---')
const { data: scp } = await sb
  .from('student_curriculum_progress')
  .select('id, student_id, unit_id, reading_id, section_type, status, created_at, updated_at')
  .eq('student_id', LAMIA_ID)
  .order('updated_at', { ascending: false })
  .limit(10)
for (const r of scp || []) console.log(`  ${r.updated_at}  unit=${r.unit_id?.slice(0,8)}…  reading=${r.reading_id?.slice(0,8)}…  section=${r.section_type}  status=${r.status}`)

// 5. students table for level + group
console.log('\n--- students row ---')
const { data: stu } = await sb
  .from('students')
  .select('*')
  .eq('profile_id', LAMIA_ID)
  .maybeSingle()
console.log(JSON.stringify(stu, null, 2))

// 6. find Unit 1 in her level
let unit1 = null
if (stu?.current_level_id || stu?.level_id) {
  const lvl = stu.current_level_id || stu.level_id
  const { data: units } = await sb
    .from('curriculum_units')
    .select('id, unit_number, level_id, theme_en, theme_ar, sort_order')
    .eq('level_id', lvl)
    .order('unit_number')
    .limit(3)
  console.log(`\n--- units in her level ${lvl} ---`)
  for (const u of units || []) console.log(`  unit_number=${u.unit_number}  id=${u.id}  theme="${u.theme_en}"`)
  unit1 = units?.[0]
}

// 7. Reading A of Unit 1 — full row + audio
if (unit1) {
  const { data: readings } = await sb
    .from('curriculum_readings')
    .select('id, reading_label, title_ar, title_en, passage_content, passage_audio_url, audio_duration_seconds, sort_order')
    .eq('unit_id', unit1.id)
    .order('sort_order')
  console.log(`\n--- readings in unit ${unit1.id} (theme "${unit1.theme_en}") ---`)
  for (const r of readings || []) {
    const firstP = (r.passage_content?.paragraphs || [])[0] || ''
    console.log(`  label=${r.reading_label} id=${r.id}`)
    console.log(`    title: "${r.title_en}"`)
    console.log(`    first 80 chars: "${firstP.slice(0,80)}..."`)
    console.log(`    passage_audio_url: ${r.passage_audio_url}`)
  }

  // Audio table rows
  const ids = readings.map(r => r.id)
  const { data: audio } = await sb
    .from('reading_passage_audio')
    .select('passage_id, full_audio_url, full_duration_ms, voice_id')
    .in('passage_id', ids)
  console.log(`\n--- reading_passage_audio rows ---`)
  for (const a of audio || []) {
    console.log(`  passage_id=${a.passage_id}  url=${a.full_audio_url}  voice=${a.voice_id}`)
  }
}

// 8. Save state
writeFileSync(
  'docs/audits/audio-text-mismatch-fix/lamia-state.json',
  JSON.stringify({ lamia: { id: LAMIA_ID }, user_interests: ui, students_row: stu, recent_activity_attempts: aa, recent_progress: scp }, null, 2)
)
console.log('\n✓ saved docs/audits/audio-text-mismatch-fix/lamia-state.json')
