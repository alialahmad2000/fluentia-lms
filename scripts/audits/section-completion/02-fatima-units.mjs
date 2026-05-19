import { admin as sb } from '../../lib/supa.mjs'

const studentId = 'f9ecb220-107e-436e-a4b7-80fd9df0cba4' // Fatima
const prefixes = ['f3a651e1', '55a4d6c2', '95530744', 'dfefdb76', '49ed7c2c']

for (const prefix of prefixes) {
  const { data: rows } = await sb.from('curriculum_units').select('id, unit_number, level_id').ilike('id', prefix + '%').limit(1)
  if (!rows?.length) { console.log(prefix + ' — no unit found'); continue }
  const uid = rows[0].id
  const { data: lvl } = await sb.from('curriculum_levels').select('level_number').eq('id', rows[0].level_id).maybeSingle()
  const { data: up } = await sb.from('unit_progress').select('*').eq('student_id', studentId).eq('unit_id', uid).maybeSingle()
  console.log(`\nL${lvl?.level_number ?? '?'} U${rows[0].unit_number} (${uid.slice(0,8)}…)`)
  if (!up) {
    console.log('  NO unit_progress ROW')
    // What completions does she have?
    const { data: scp } = await sb
      .from('student_curriculum_progress')
      .select('section_type, status, is_best, reading_id, updated_at')
      .eq('student_id', studentId)
      .eq('unit_id', uid)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
    console.log('  but scp has', scp?.length, 'completed rows:')
    for (const r of scp || []) console.log(`    section=${r.section_type} is_best=${r.is_best} reading=${r.reading_id?.slice(0,8)} at=${r.updated_at?.slice(0,19)}`)
  } else {
    console.log(`  numerator/denominator: ${up.numerator}/${up.denominator} = ${up.percentage}%, updated_at=${up.updated_at?.slice(0,19)}`)
    console.log('  inventory:', JSON.stringify(up.breakdown?.inventory))
    console.log('  completion:', JSON.stringify(up.breakdown?.completion))
  }
}
