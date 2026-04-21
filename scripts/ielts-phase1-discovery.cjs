require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listColumns(table) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', table);
  return { data, error };
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  return { count, error };
}

async function sampleRow(table, limit = 1) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(limit);
  return { data, error };
}

async function main() {
  const IELTS_TABLES = [
    'ielts_diagnostic_tests',
    'ielts_diagnostic_results',
    'ielts_reading_passages',
    'ielts_reading_questions',
    'ielts_reading_skills',
    'ielts_writing_tasks',
    'ielts_listening_sections',
    'ielts_listening_questions',
    'ielts_speaking_questions',
    'ielts_speaking_topics',
    'ielts_mock_tests',
    'ielts_mock_attempts',
    'ielts_student_results',
    'ielts_student_progress',
    'ielts_error_bank',
    'ielts_adaptive_plans',
    'ielts_strategy_videos',
    'ielts_weekly_plans',
    'ielts_trainer_notes',
    // extras found in hooks
    'ielts_skill_sessions',
    'ielts_submissions',
  ];

  console.log('═══════════════════════════════════════');
  console.log('IELTS PHASE 1 DISCOVERY');
  console.log('═══════════════════════════════════════\n');

  console.log('## Table Inventory\n');
  const existingTables = [];
  for (const t of IELTS_TABLES) {
    const { count, error } = await countRows(t);
    if (error && (error.code === '42P01' || (error.message && error.message.includes('does not exist')))) {
      console.log(`  ✗ ${t} — does not exist`);
    } else if (error) {
      console.log(`  ? ${t} — error: ${error.message}`);
    } else {
      console.log(`  ✓ ${t} — ${count} rows`);
      existingTables.push({ name: t, count });
    }
  }

  console.log('\n## Column Inventory (existing tables)\n');
  for (const { name } of existingTables) {
    const { data } = await listColumns(name);
    if (!data) continue;
    console.log(`\n### ${name}`);
    for (const col of data) {
      console.log(`  - ${col.column_name} : ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    }
  }

  console.log('\n## Sample Rows (first 1 from each non-empty table)\n');
  for (const { name, count } of existingTables) {
    if (count === 0) continue;
    const { data } = await sampleRow(name, 1);
    if (data && data.length > 0) {
      console.log(`\n### ${name} (sample)`);
      const sample = data[0];
      const compact = {};
      for (const key of Object.keys(sample)) {
        const val = sample[key];
        if (typeof val === 'string' && val.length > 150) {
          compact[key] = val.substring(0, 100) + '... (' + val.length + ' chars)';
        } else {
          compact[key] = val;
        }
      }
      console.log(JSON.stringify(compact, null, 2));
    }
  }

  console.log('\n## Students on IELTS Track\n');
  const { data: students, error: sErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, package, custom_access, track')
    .or('package.eq.ielts,track.eq.ielts');
  if (sErr) {
    // try without track column
    const { data: s2 } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, package, custom_access')
      .eq('package', 'ielts');
    console.log(`  Count: ${s2?.length || 0}`);
    for (const s of s2 || []) {
      console.log(`  - ${s.full_name} (${s.email}) — package: ${s.package || '-'}`);
    }
  } else {
    console.log(`  Count: ${students?.length || 0}`);
    for (const s of students || []) {
      console.log(`  - ${s.full_name} (${s.email}) — package: ${s.package || '-'}, track: ${s.track || '-'}`);
    }
  }

  console.log('\n## Students with ielts in custom_access\n');
  const { data: customStudents } = await supabase
    .from('profiles')
    .select('id, full_name, email, custom_access')
    .contains('custom_access', ['ielts']);
  console.log(`  Count: ${customStudents?.length || 0}`);
  for (const s of customStudents || []) {
    console.log(`  - ${s.full_name} (${s.email}) — custom: ${JSON.stringify(s.custom_access)}`);
  }

  console.log('\n## Storage Buckets (IELTS-related)\n');
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets) {
    const ieltsBuckets = buckets.filter(b => /ielts|band|speaking|listening|writing/i.test(b.name));
    for (const b of ieltsBuckets) {
      console.log(`  - ${b.name} (public: ${b.public})`);
    }
    if (ieltsBuckets.length === 0) console.log('  (none with ielts-related names)');
    console.log(`  All buckets: ${buckets.map(b => b.name).join(', ')}`);
  }

  // Check adaptive plan structure in detail
  console.log('\n## Adaptive Plan Detail\n');
  const apRes = existingTables.find(t => t.name === 'ielts_adaptive_plans');
  if (apRes && apRes.count > 0) {
    const { data } = await sampleRow('ielts_adaptive_plans', 3);
    console.log('  Sample (up to 3 rows):');
    for (const row of data || []) {
      const compact = {};
      for (const key of Object.keys(row)) {
        const val = row[key];
        if (typeof val === 'string' && val.length > 200) compact[key] = val.substring(0, 150) + '...';
        else if (typeof val === 'object' && val !== null) compact[key] = JSON.stringify(val).substring(0, 150);
        else compact[key] = val;
      }
      console.log(JSON.stringify(compact, null, 2));
    }
  } else {
    console.log('  Table empty or missing — fallback plan needed');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('Discovery complete.');
  console.log('═══════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
