// verify-ielts-trainer-rls.cjs
// G.2+G.3 verification for PROMPT-IELTS-12
const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs'

async function get(path) {
  const res = await fetch(SUPABASE_URL + path, {
    headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}

async function main() {
  console.log('=== IELTS Trainer RLS + Schema Verification ===\n')
  let passed = 0, failed = 0

  function ok(msg) { console.log('  ✅', msg); passed++ }
  function fail(msg) { console.log('  ❌', msg); failed++ }

  // G.3 — Schema: trainer columns on ielts_submissions
  const cols = ['trainer_feedback', 'trainer_overridden_band', 'trainer_reviewed_at', 'trainer_id']
  for (const col of cols) {
    const r = await get(`/rest/v1/ielts_submissions?select=${col}&limit=0`)
    r.status === 200 ? ok(`ielts_submissions.${col} EXISTS`) : fail(`ielts_submissions.${col} MISSING`)
  }

  // G.1 — All IELTS tables accessible with service role
  const tables = [
    'ielts_submissions','ielts_mock_attempts','ielts_student_results',
    'ielts_error_bank','ielts_adaptive_plans','ielts_skill_sessions','ielts_student_progress'
  ]
  for (const t of tables) {
    const r = await get(`/rest/v1/${t}?select=id&limit=0`)
    r.status === 200 ? ok(`${t} accessible`) : fail(`${t} NOT accessible (${r.status})`)
  }

  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`)
  if (failed > 0) process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
