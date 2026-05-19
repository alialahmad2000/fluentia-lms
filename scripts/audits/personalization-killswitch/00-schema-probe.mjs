import { admin as sb } from '../../lib/supa.mjs'

const tables = [
  'user_interests',
  'personalized_readings',
  'curriculum_readings',
  'curriculum_listening',
  'curriculum_vocabulary',
  'app_config',
  'reading_passage_audio',
  'profiles',
]
console.log('=== table existence + first-row column probe ===')
for (const t of tables) {
  const { data, error } = await sb.from(t).select('*').limit(1)
  if (error) console.log(`  ❌ ${t}: ${error.message}`)
  else {
    const cols = data && data[0] ? Object.keys(data[0]) : []
    console.log(`  ✅ ${t}: ${cols.length} cols`)
    if (cols.length) console.log(`     [${cols.join(', ')}]`)
  }
}

console.log('\n=== row counts ===')
for (const t of ['user_interests','personalized_readings','curriculum_readings','app_config']) {
  const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true })
  console.log(`  ${t}: ${error ? error.message : count}`)
}

console.log('\n=== sample user_interests row ===')
const { data: ui } = await sb.from('user_interests').select('*').limit(3)
console.log(JSON.stringify(ui, null, 2))

console.log('\n=== sample personalized_readings row ===')
const { data: pr } = await sb.from('personalized_readings').select('*').limit(1)
console.log(JSON.stringify(pr, null, 2))
