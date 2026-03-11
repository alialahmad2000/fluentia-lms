import { createClient } from '@supabase/supabase-js'

const URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjU2MTgsImV4cCI6MjA4ODcwMTYxOH0.Lznjnw2Pmrr04tFjQD6hRfWp-12JlRagZaCmo59KG8A'

async function testLogin(email, password, expectedRole) {
  const client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    console.log(`❌ ${email}: login failed — ${error.message}`)
    return
  }

  // Check profile role
  const { data: profile } = await client.from('profiles').select('role, full_name').eq('id', data.user.id).single()
  const roleMatch = profile?.role === expectedRole
  console.log(`${roleMatch ? '✅' : '❌'} ${email}: role=${profile?.role} (expected ${expectedRole}), name=${profile?.full_name}`)

  // Test what trainer can see
  if (expectedRole === 'trainer') {
    const { data: groups } = await client.from('groups').select('code, name').eq('trainer_id', data.user.id)
    console.log(`   Trainer's groups: ${groups?.map(g => g.code).join(', ') || 'none'}`)

    const { data: allGroups } = await client.from('groups').select('code')
    console.log(`   All visible groups: ${allGroups?.map(g => g.code).join(', ')}`)

    // Should NOT see settings
    const { data: settings } = await client.from('settings').select('key')
    console.log(`   Can see settings: ${settings?.length > 0 ? 'YES ❌' : 'NO ✅'}`)
  }

  if (expectedRole === 'student') {
    const { data: student } = await client.from('students').select('group_id, groups(code, name)').eq('id', data.user.id).single()
    console.log(`   Student group: ${student?.groups?.code} — ${student?.groups?.name}`)
  }

  await client.auth.signOut()
}

async function main() {
  console.log('=== Account Verification ===\n')
  await testLogin('admin@fluentia.academy', 'Fluentia@2026!', 'admin')
  await testLogin('trainer@fluentia.academy', 'Fluentia@2026!', 'trainer')
  await testLogin('teststudent@fluentia.academy', 'Fluentia@2026!', 'student')
  console.log('\n=== Done ===')
}

main().catch(e => console.error(e))
