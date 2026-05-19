import { admin as sb } from '../../lib/supa.mjs'

console.log('=== finding Lamia in profiles ===')
const { data: candidates } = await sb
  .from('profiles')
  .select('id, email, full_name, display_name, role, created_at')
  .or('full_name.ilike.%لمياء%,full_name.ilike.%Lamia%,full_name.ilike.%Lamya%,full_name.ilike.%harbi%,full_name.ilike.%الحربي%,display_name.ilike.%لمياء%')
  .limit(10)

console.log(`Found ${candidates?.length || 0} candidates:`)
for (const c of candidates || []) {
  console.log(`  id=${c.id}  role=${c.role}  email=${c.email}  full_name="${c.full_name}"  display_name="${c.display_name}"`)
}

if (!candidates?.length) {
  console.log('NO MATCHES — falling back to all-students scan for any name containing Lamia/Lamya/Lamiaa/...')
  const { data: all } = await sb
    .from('profiles')
    .select('id, email, full_name, display_name, role')
    .eq('role', 'student')
    .order('full_name')
  for (const r of all || []) {
    if (/lam|harb|حرب|لميا|لمي/i.test(r.full_name || '') || /lam|harb|حرب|لميا|لمي/i.test(r.display_name || '')) {
      console.log(`  MAYBE: id=${r.id} full_name="${r.full_name}" display_name="${r.display_name}"`)
    }
  }
}

console.log('\n=== students table — alternate place for student data ===')
const { data: students } = await sb
  .from('students')
  .select('id, profile_id, full_name, group_id, status')
  .or('full_name.ilike.%لمياء%,full_name.ilike.%Lamia%,full_name.ilike.%Lamya%,full_name.ilike.%harbi%,full_name.ilike.%الحربي%')
  .limit(5)
  .then(r => r, e => ({ error: e }))
if (students?.error) console.log('  students table error:', students.error.message)
else for (const s of students || []) {
  console.log(`  id=${s.id} profile_id=${s.profile_id} full_name="${s.full_name}" group=${s.group_id} status=${s.status}`)
}
