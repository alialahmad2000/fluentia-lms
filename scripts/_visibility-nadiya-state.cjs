const fs = require('fs')
const env = {}
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) {
    let val = v.join('=').trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    val = val.replace(/\\n$/, '')
    env[k.trim()] = val
  }
})
const { createClient } = require('@supabase/supabase-js')
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .ilike('full_name', '%نادية%')
  console.log('profile:', profile)
  if (!profile?.length) return
  for (const p of profile) {
    const { data: att } = await admin
      .from('mock_exam_attempts')
      .select('id, exam_id, is_submitted, submitted_at, score_total, passed, expires_at, started_at, is_revealed, ai_writing_status')
      .eq('student_id', p.id)
    console.log(p.full_name + ':')
    console.log(JSON.stringify(att, null, 2))
  }
})()
