require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('IELTS V3-2 PROBE — Diagnostic Schema');
  console.log('═══════════════════════════════════════\n');

  // A.2.1 — Tables with "diagnostic" in name
  console.log('## Diagnostic Tables\n');
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .ilike('table_name', '%diagnostic%');
  for (const t of tables || []) console.log(`  - ${t.table_name}`);

  // A.2.2 + A.2.3 — Columns + row counts for each
  for (const t of tables || []) {
    console.log(`\n### ${t.table_name} columns`);
    const { data: cols } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', t.table_name);
    for (const c of cols || []) {
      console.log(`  - ${c.column_name} : ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}${c.column_default ? ` DEFAULT ${c.column_default}` : ''}`);
    }
    const { count } = await supabase.from(t.table_name).select('*', { count: 'exact', head: true });
    console.log(`  → Row count: ${count}`);
  }

  // A.2.3 — Also check ielts_mock_attempts (diagnostic attempt lives here)
  console.log('\n### ielts_mock_attempts columns');
  const { data: maCols } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'ielts_mock_attempts');
  for (const c of maCols || []) {
    console.log(`  - ${c.column_name} : ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
  }
  const { count: maCount } = await supabase.from('ielts_mock_attempts').select('*', { count: 'exact', head: true });
  console.log(`  → Row count: ${maCount}`);

  // A.2.4 — Most recent completed diagnostic result
  console.log('\n## Most Recent Diagnostic Result\n');
  const { data: results } = await supabase
    .from('ielts_student_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  if (results && results.length > 0) {
    const r = results[0];
    const compact = {};
    for (const k of Object.keys(r)) {
      const v = r[k];
      compact[k] = typeof v === 'string' && v.length > 150 ? v.substring(0, 100) + '...' : v;
    }
    console.log(JSON.stringify(compact, null, 2));
  } else {
    console.log('  (no results found)');
  }

  // A.2.4b — Also check ielts_diagnostic_results if it exists
  const { data: dr, error: drErr } = await supabase
    .from('ielts_diagnostic_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  if (!drErr) {
    console.log('\n## Most Recent ielts_diagnostic_results row\n');
    if (dr && dr.length > 0) {
      console.log(JSON.stringify(dr[0], null, 2));
    } else {
      console.log('  (empty)');
    }
  }

  // A.2.5 — Recent diagnostic attempts
  console.log('\n## Recent Diagnostic Attempts (mock test_number=0)\n');
  // First get the diagnostic mock test id
  const { data: diagMock } = await supabase
    .from('ielts_mock_tests')
    .select('id, test_number')
    .eq('test_number', 0)
    .maybeSingle();
  console.log(`  Diagnostic mock test: ${diagMock ? JSON.stringify(diagMock) : 'NOT FOUND'}`);

  if (diagMock) {
    const { data: attempts } = await supabase
      .from('ielts_mock_attempts')
      .select('id, student_id, mock_test_id, status, current_section, started_at, completed_at, result_id')
      .eq('mock_test_id', diagMock.id)
      .order('started_at', { ascending: false })
      .limit(5);
    console.log(`\n  Recent attempts (${attempts?.length || 0}):`);
    for (const a of attempts || []) {
      console.log(`  ${JSON.stringify(a)}`);
    }
  }

  // A.7 — Ali's profile and diagnostic state
  console.log('\n## Ali\'s Profile\n');
  const { data: ali } = await supabase
    .from('profiles')
    .select('id, full_name, email, package, role')
    .eq('email', 'alialahmad2000@gmail.com')
    .maybeSingle();
  console.log(`  ${ali ? JSON.stringify(ali) : 'NOT FOUND'}`);

  if (ali && diagMock) {
    console.log('\n## Ali\'s Diagnostic Attempts\n');
    const { data: aliAttempts } = await supabase
      .from('ielts_mock_attempts')
      .select('id, status, current_section, started_at, completed_at, result_id')
      .eq('student_id', ali.id)
      .eq('mock_test_id', diagMock.id)
      .order('started_at', { ascending: false })
      .limit(3);
    for (const a of aliAttempts || []) console.log(`  ${JSON.stringify(a)}`);
    if (!aliAttempts?.length) console.log('  (none)');

    console.log('\n## Ali\'s Diagnostic Results\n');
    const { data: aliResults } = await supabase
      .from('ielts_student_results')
      .select('id, result_type, overall_band, reading_score, listening_score, writing_score, speaking_score, strengths, weaknesses, created_at')
      .eq('student_id', ali.id)
      .order('created_at', { ascending: false })
      .limit(3);
    for (const r of aliResults || []) console.log(`  ${JSON.stringify(r)}`);
    if (!aliResults?.length) console.log('  (none)');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('Probe complete.');
  console.log('═══════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
