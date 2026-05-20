// scripts/discover-ielts-atelier-phase0.cjs
// READ-ONLY. Prints counts + columns for everything Phase 0 cares about.
// Usage: node scripts/discover-ielts-atelier-phase0.cjs

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
const s = createClient(url, key)

async function main() {
  console.log('=== IELTS ATELIER PHASE 0 — DISCOVERY ===\n')

  // 1) Distinct package values currently in use
  const { data: pkgs, error: pkgErr } = await s
    .from('profiles')
    .select('package')
    .not('package', 'is', null)
  if (pkgErr) console.error('packages error:', pkgErr)
  else {
    const counts = {}
    for (const r of pkgs) counts[r.package] = (counts[r.package] || 0) + 1
    console.log('Distinct package values in profiles:')
    console.log(counts)
  }

  // 2) Students with IELTS-eligible packages (ielts + tamayuz per prompt assumption)
  const { data: ieltsStudents, error: isErr } = await s
    .from('profiles')
    .select('id, full_name, package, role, group_id')
    .in('package', ['ielts', 'tamayuz'])
    .eq('role', 'student')
  if (isErr) console.error('ielts students error:', isErr)
  else {
    console.log(`\nIELTS-eligible students (package IN ielts/tamayuz, role=student): ${ieltsStudents.length}`)
    for (const u of ieltsStudents) console.log(`  - ${u.full_name} (${u.package}) — group ${u.group_id}`)
  }

  // 2b) Cross-check the actual access source-of-truth: students.package + students.custom_access
  try {
    const { data: studentRows, error: srErr } = await s
      .from('students')
      .select('user_id, package, custom_access')
    if (srErr) {
      console.log('\nstudents.package/custom_access read error:', srErr.message)
    } else {
      const pkgCounts = {}
      let withCustomIelts = 0
      for (const r of studentRows) {
        pkgCounts[r.package || '(null)'] = (pkgCounts[r.package || '(null)'] || 0) + 1
        if (Array.isArray(r.custom_access) && r.custom_access.includes('ielts')) withCustomIelts++
      }
      console.log('\nstudents.package distribution:')
      console.log(pkgCounts)
      console.log(`students with custom_access including 'ielts': ${withCustomIelts}`)
    }
  } catch (e) {
    console.log('students table probe failed:', e.message)
  }

  // 3) All ielts_* tables (information_schema)
  console.log('\nielts_* tables in public schema:')
  const { data: infTables, error: tErr } = await s
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', 'ielts_%')
  if (tErr) {
    console.log('  (information_schema.tables not accessible via REST — try MCP)')
  } else if (infTables) {
    for (const t of infTables) console.log(`  - ${t.table_name}`)
  }

  // 4) Rowcounts for the critical V3 tables
  console.log('\nCritical V3 table rowcounts:')
  for (const tbl of [
    'ielts_skill_sessions',
    'ielts_adaptive_plans',
    'ielts_student_progress',
    'ielts_mock_attempts',
    'ielts_error_bank',
  ]) {
    const { count, error } = await s.from(tbl).select('id', { count: 'exact', head: true })
    if (error) console.log(`  ${tbl}: (table missing or RLS — ${error.message})`)
    else console.log(`  ${tbl}: ${count} rows`)
  }

  console.log('\n=== END DISCOVERY ===')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
