import { admin } from '../../../scripts/lib/supa.mjs'

// students table columns
const { data: stuSample } = await admin.from('students').select('*').limit(1)
console.log('students columns:', stuSample?.[0] ? Object.keys(stuSample[0]) : 'empty')

const { data: stus } = await admin.from('students').select('*').limit(1)
// Find student rows for the test profiles via any plausible key
const { data: a1 } = await admin.from('students').select('*').or('email.eq.mock-test-a1@fluentia.academy')
console.log('a1 by email col:', a1 ? a1.length : 'no email col', a1?.[0] ? JSON.stringify(a1[0]).slice(0,200) : '')

// curriculum_levels
const { data: levels } = await admin.from('curriculum_levels').select('id, level_number, name_ar').order('level_number')
console.log('\nlevels:', JSON.stringify(levels))

// any unit that has listening audio — pick the first by unit
const { data: anyListen } = await admin.from('curriculum_listening').select('unit_id, audio_url').not('audio_url','is',null).limit(1)
console.log('\nA listening unit_id with audio:', anyListen?.[0]?.unit_id)
if (anyListen?.[0]) {
  const { data: u } = await admin.from('curriculum_units').select('*').eq('id', anyListen[0].unit_id).maybeSingle()
  console.log('Unit:', JSON.stringify(u).slice(0,300))
}
