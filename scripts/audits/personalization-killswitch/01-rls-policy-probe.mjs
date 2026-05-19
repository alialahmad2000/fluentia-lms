// Query pg_policies / pg_proc / information_schema via service-role to find
// any personalization redirect mechanism.
//
// We can't issue raw SQL with supabase-js without a helper RPC. So instead we
// rely on the fact that Postgres' system catalogs CAN be exposed if the user
// (postgres / service_role) has SELECT. Supabase exposes them via the public
// API ONLY if specifically added.
//
// Fallback strategy: write a SECURITY DEFINER helper RPC to introspect.
// But before that, try the existing supabase-js .schema() admin pattern.

import { admin as sb } from '../../lib/supa.mjs'

// Probe what's accessible
console.log('=== probe: pg_policies via supabase REST (likely unavailable) ===')
const { data: p1, error: e1 } = await sb.schema('pg_catalog').from('pg_policies').select('*').limit(5)
console.log('pg_catalog.pg_policies via PostgREST:', e1 ? `❌ ${e1.message}` : `✅ ${p1.length} rows`)

const { data: p2, error: e2 } = await sb.from('pg_policies').select('*').limit(5)
console.log('public.pg_policies:', e2 ? `❌ ${e2.message}` : `✅ ${p2.length} rows`)

// Try views
console.log('\n=== probe: list public views ===')
const { data: p3, error: e3 } = await sb.schema('information_schema').from('views').select('table_name, view_definition').eq('table_schema', 'public')
console.log('information_schema.views:', e3 ? `❌ ${e3.message}` : `✅ ${p3?.length} views`)
if (p3) {
  for (const v of p3) {
    if (/personali|user_interests|variant/i.test(v.view_definition)) {
      console.log(`  🔴 ${v.table_name}: PERSONALIZATION REFERENCE`)
      console.log(`     ${v.view_definition.slice(0, 200)}...`)
    } else {
      console.log(`  ✅ ${v.table_name}`)
    }
  }
}

// Try functions
console.log('\n=== probe: list public functions ===')
const { data: p4, error: e4 } = await sb.schema('information_schema').from('routines').select('routine_name, routine_definition').eq('routine_schema', 'public').eq('routine_type', 'FUNCTION')
console.log('information_schema.routines:', e4 ? `❌ ${e4.message}` : `✅ ${p4?.length} routines`)
if (p4) {
  let suspect = 0
  for (const f of p4) {
    const d = f.routine_definition || ''
    if (/personali|user_interests|variant/i.test(d)) {
      console.log(`  🔴 ${f.routine_name}`)
      console.log(`     ${d.slice(0, 300)}`)
      suspect++
    }
  }
  if (!suspect) console.log('  ✅ No personalization references in any function body')
}

console.log('\n=== probe: tables having an active RLS on personalization-relevant scope ===')
// Try information_schema.tables (limited info)
const { data: t1 } = await sb.schema('pg_catalog').from('pg_policies').select('*')
console.log('Alt pg_policies access:', t1 ? `✅ ${t1.length}` : 'unavailable')
