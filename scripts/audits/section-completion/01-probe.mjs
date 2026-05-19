import { admin as sb } from '../../lib/supa.mjs'

// 1. unit_progress schema
console.log('=== unit_progress sample row ===')
const { data: up } = await sb.from('unit_progress').select('*').limit(2)
console.log('cols:', up?.[0] ? Object.keys(up[0]) : 'no rows')
console.log(JSON.stringify(up?.[0], null, 2))

// 2. Distinct submission count by student in last 7 days
console.log('\n=== students with recent submissions ===')
// student_curriculum_progress is the per-section row
const { data: scp } = await sb
  .from('student_curriculum_progress')
  .select('student_id, section_type, status, unit_id, created_at')
  .eq('status', 'completed')
  .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .limit(50)
const studentCounts = {}
for (const r of scp || []) studentCounts[r.student_id] = (studentCounts[r.student_id] || 0) + 1
const top = Object.entries(studentCounts).sort((a,b)=>b[1]-a[1]).slice(0, 5)
console.log('top students (last 7d):')
for (const [sid, count] of top) {
  const { data: p } = await sb.from('profiles').select('id, full_name, email').eq('id', sid).maybeSingle()
  console.log(`  ${count} completions  ${p?.email}  "${p?.full_name}"  id=${sid}`)
}

// 3. Pick the top student NOT named Lamia, dig into their unit
const lamiaId = '95124347-7ad8-46b7-b745-b6c085bf3a6f'
const probeId = top.find(([sid]) => sid !== lamiaId)?.[0]
if (probeId) {
  const { data: p } = await sb.from('profiles').select('full_name, email').eq('id', probeId).maybeSingle()
  console.log(`\n=== PROBE: ${p?.email} (${p?.full_name}) ===`)

  // recent units they completed work in
  const { data: units } = await sb
    .from('student_curriculum_progress')
    .select('unit_id, section_type, status, is_best, updated_at')
    .eq('student_id', probeId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(20)
  const byUnit = {}
  for (const r of units || []) {
    if (!byUnit[r.unit_id]) byUnit[r.unit_id] = []
    byUnit[r.unit_id].push(r.section_type)
  }
  console.log('Recent completions by unit:')
  for (const [uid, types] of Object.entries(byUnit)) {
    console.log(`  unit ${uid.slice(0,8)}…  sections: [${[...new Set(types)].join(', ')}]`)
  }

  // For the first unit, compare scp completed types vs unit_progress.breakdown
  const firstUid = Object.keys(byUnit)[0]
  if (firstUid) {
    console.log(`\n--- unit_progress row for ${firstUid.slice(0,8)}… ---`)
    const { data: row, error } = await sb
      .from('unit_progress')
      .select('*')
      .eq('student_id', probeId)
      .eq('unit_id', firstUid)
      .maybeSingle()
    if (error) console.log('  error:', error.message)
    else if (!row) console.log('  NO ROW — trigger never fired or row missing')
    else {
      console.log('  ', JSON.stringify({
        numerator: row.numerator,
        denominator: row.denominator,
        percentage: row.percentage,
        breakdown_keys: row.breakdown ? Object.keys(row.breakdown) : null,
        updated_at: row.updated_at,
      }, null, 2))
      if (row.breakdown) {
        console.log('  breakdown.inventory:', JSON.stringify(row.breakdown.inventory))
        console.log('  breakdown.completion:', JSON.stringify(row.breakdown.completion))
      }
    }
  }
}

// 4. How many students have submissions but NO unit_progress row?
console.log('\n=== orphan students (have submissions, missing unit_progress) ===')
const { data: scpStudents } = await sb
  .from('student_curriculum_progress')
  .select('student_id')
  .eq('status', 'completed')
  .limit(5000)
const scpSet = new Set(scpStudents.map(r => r.student_id))
console.log(`  distinct students with completions: ${scpSet.size}`)
const { data: upStudents } = await sb.from('unit_progress').select('student_id').limit(5000)
const upSet = new Set((upStudents || []).map(r => r.student_id))
console.log(`  distinct students with unit_progress: ${upSet.size}`)
const orphans = [...scpSet].filter(s => !upSet.has(s))
console.log(`  orphans (completion but no unit_progress): ${orphans.length}`)
if (orphans.length > 0) console.log(`  first 3:`, orphans.slice(0, 3))
