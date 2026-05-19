import { admin as sb } from '../../lib/supa.mjs'

// 1. Verify pronunciation is no longer in inventory/completion for any row
console.log('=== check: no pronunciation in unit_progress.breakdown ===')
const { data: rows } = await sb.from('unit_progress').select('student_id, unit_id, breakdown')
let hasPronInventory = 0, hasPronCompletion = 0
for (const r of rows) {
  if (r.breakdown?.inventory?.pronunciation != null) hasPronInventory++
  if (r.breakdown?.completion?.pronunciation_done != null) hasPronCompletion++
}
console.log(`  rows: ${rows.length}, with pronunciation in inventory: ${hasPronInventory}, with pronunciation_done in completion: ${hasPronCompletion}`)
console.log(`  expected: both 0 → ${hasPronInventory === 0 && hasPronCompletion === 0 ? '✅ PASS' : '❌ FAIL'}`)

// 2. Probe student: Fatima
console.log('\n=== probe student: Fatima ===')
const fatimaId = 'f9ecb220-107e-436e-a4b7-80fd9df0cba4'
const { data: scpRows } = await sb
  .from('student_curriculum_progress')
  .select('unit_id, section_type, status, is_best')
  .eq('student_id', fatimaId)
  .eq('status', 'completed')
  .eq('is_best', true)
const fatimaUnits = [...new Set(scpRows.map(r => r.unit_id))]

for (const uid of fatimaUnits) {
  const expected = [...new Set(scpRows.filter(r => r.unit_id === uid).map(r => r.section_type))]
  const { data: up } = await sb.from('unit_progress').select('breakdown, percentage, denominator').eq('student_id', fatimaId).eq('unit_id', uid).maybeSingle()
  const completion = up?.breakdown?.completion || {}
  const matches = []
  for (const t of expected) {
    if (t === 'reading' && (completion.reading_done || 0) >= (up?.breakdown?.inventory?.reading || 1)) matches.push('reading ✓')
    else if (t === 'reading') matches.push(`reading ✗ (${completion.reading_done}/${up?.breakdown?.inventory?.reading})`)
    else if (t === 'grammar' && completion.grammar_done) matches.push('grammar ✓')
    else if (t === 'grammar') matches.push(`grammar ✗`)
    else if (t === 'writing' && completion.writing_done) matches.push('writing ✓')
    else if (t === 'writing') matches.push(`writing ✗`)
    else if (t === 'listening' && completion.listening_done) matches.push('listening ✓')
    else if (t === 'listening') matches.push(`listening ✗`)
    else if (t === 'speaking' && completion.speaking_done) matches.push('speaking ✓')
    else if (t === 'speaking') matches.push(`speaking ✗`)
    else matches.push(`${t} (skipped check)`)
  }
  console.log(`  unit ${uid.slice(0,8)}…  expected=[${expected.join(', ')}]  matched=[${matches.join(', ')}]  pct=${up?.percentage}% (den=${up?.denominator})`)
}

// 3. Five random students
console.log('\n=== five random students ===')
const { data: studentRows } = await sb.from('profiles').select('id, full_name, email').eq('role', 'student').limit(50)
const shuffled = studentRows.sort(() => Math.random() - 0.5).slice(0, 5)
for (const s of shuffled) {
  const { data: scpRow } = await sb.from('student_curriculum_progress').select('unit_id, section_type').eq('student_id', s.id).eq('status', 'completed').eq('is_best', true).limit(20)
  if (!scpRow?.length) { console.log(`  ${s.email}: no completions`); continue }
  const ua = [...new Set(scpRow.map(r => r.unit_id))][0]
  const { data: up } = await sb.from('unit_progress').select('numerator, denominator, percentage, breakdown').eq('student_id', s.id).eq('unit_id', ua).maybeSingle()
  console.log(`  ${s.email}: unit ${ua.slice(0,8)}…  ${up?.numerator}/${up?.denominator} (${up?.percentage}%)  ${up ? '✅' : '❌ no row'}`)
}

// 4. Orphan check
console.log('\n=== orphan students (completion without unit_progress) ===')
const { data: scpAll } = await sb.from('student_curriculum_progress').select('student_id').eq('status', 'completed').limit(5000)
const scpSet = new Set(scpAll.map(r => r.student_id))
const { data: upAll } = await sb.from('unit_progress').select('student_id').limit(5000)
const upSet = new Set(upAll.map(r => r.student_id))
const orphans = [...scpSet].filter(s => !upSet.has(s))
console.log(`  orphans: ${orphans.length} ${orphans.length === 0 ? '✅' : '❌'}`)
