import { admin } from '../../../scripts/lib/supa.mjs'

// find the mock test students
const { data: profs } = await admin.from('profiles').select('id, email, role').in('email', ['mock-test-a1@fluentia.academy','mock-test-b1@fluentia.academy'])
console.log('Test profiles:', JSON.stringify(profs, null, 2))

for (const p of profs || []) {
  const { data: stu } = await admin.from('students').select('id, academic_level, group_id').eq('profile_id', p.id).maybeSingle()
  console.log(`${p.email}: student=${JSON.stringify(stu)}`)
}

// Find a unit at L1 that has a listening row with audio + is reachable
const { data: l1lvl } = await admin.from('curriculum_levels').select('id, level_number').eq('level_number', 1).maybeSingle()
const { data: units } = await admin.from('curriculum_units').select('id, unit_number, title_ar').eq('level_id', l1lvl?.id).order('unit_number').limit(3)
console.log('\nL1 units:', JSON.stringify(units, null, 2))
for (const u of units || []) {
  const { data: lis } = await admin.from('curriculum_listening').select('id, audio_url, title_ar').eq('unit_id', u.id)
  console.log(`Unit ${u.unit_number} (${u.id}): ${lis?.length} listening rows, audio=${lis?.[0]?.audio_url ? 'YES' : 'NO'}`)
}
