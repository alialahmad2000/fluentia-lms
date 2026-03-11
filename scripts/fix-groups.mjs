import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nmjexpuycmqcxuxljier.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const adminId = 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96'

async function main() {
  // Ensure admin is in trainers table (FK constraint on groups.trainer_id)
  const { data: trainerCheck } = await supabase.from('trainers').select('id').eq('id', adminId).single()
  console.log('Admin in trainers table:', trainerCheck ? 'YES' : 'NO')

  if (!trainerCheck) {
    const { error } = await supabase.from('trainers').upsert({
      id: adminId,
      specialization: ['General English', 'IELTS'],
      per_session_rate: 150,
      is_active: true,
    }, { onConflict: 'id' })
    console.log('Admin trainer record:', error ? error.message : 'created')
  }

  // Assign groups 2B and 1A to admin
  const { error: e1 } = await supabase.from('groups').update({ trainer_id: adminId }).eq('code', '2B')
  const { error: e2 } = await supabase.from('groups').update({ trainer_id: adminId }).eq('code', '1A')
  console.log('2B update:', e1 ? e1.message : 'OK')
  console.log('1A update:', e2 ? e2.message : 'OK')

  // Verify all groups
  const { data: groups } = await supabase.from('groups').select('code, name, trainer_id')
  console.log('\nFinal group assignments:')
  for (const g of groups || []) {
    const isAdmin = g.trainer_id === adminId
    const label = isAdmin ? 'Admin (د. علي)' : 'Trainer (مدرب تجريبي)'
    console.log(`  ${g.code} | ${g.name} | ${label}`)
  }

  // Verify test student is in 2A
  const { data: testStudent } = await supabase
    .from('students')
    .select('id, status, group_id, groups(code, name)')
    .eq('id', '977e9d99-a4f5-4875-b7e6-741089f82058')
    .single()
  console.log('\nTest student group:', testStudent?.groups?.code, testStudent?.groups?.name)
}

main().catch(e => console.error(e))
