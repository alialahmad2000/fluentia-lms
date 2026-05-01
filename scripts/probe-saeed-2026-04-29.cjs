require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars'); process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

(async () => {
  console.log('═══ PHASE A — DISCOVERY ═══\n');

  const pg = new Client({
    host: 'aws-1-eu-central-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.nmjexpuycmqcxuxljier',
    password: 'Ali-al-ahmad2000',
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  // A.1 — students columns
  console.log('--- A.1 students columns ---');
  const { rows: cols } = await pg.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students'
    ORDER BY ordinal_position;
  `);
  console.log(cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));

  // A.2 — package enum values
  console.log('\n--- A.2 package enum check ---');
  const { rows: enumRows } = await pg.query(`
    SELECT t.typname, e.enumlabel FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname LIKE '%package%'
    ORDER BY t.typname, e.enumsortorder;
  `);
  const labels = enumRows.map(r => r.enumlabel);
  const typeNames = [...new Set(enumRows.map(r => r.typname))];
  console.log('enum type(s):', typeNames.join(', '));
  console.log('package enum values:', labels.join(', '));
  const recordingsExists = labels.includes('recordings');
  console.log(`'recordings' present: ${recordingsExists ? '✅ YES' : '❌ NO — migration required'}`);

  // A.3 — target group
  console.log('\n--- A.3 target group lookup ---');
  const { data: groups, error: gErr } = await supabase
    .from('groups')
    .select('id, name, code, level, max_students')
    .eq('level', 1)
    .order('name');
  if (gErr) { console.error('groups query failed:', gErr.message); process.exit(1); }
  console.table(groups);
  const targetGroup = groups.find(g => g.name.includes('المجموعة 2')) || groups[0];
  if (!targetGroup) { console.error('❌ No Level 1 group found'); process.exit(1); }
  console.log(`✅ Target group: ${targetGroup.name} (id=${targetGroup.id})`);

  // A.4 — current student count
  const { count: groupCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', targetGroup.id)
    .eq('status', 'active');
  console.log(`Current active students in ${targetGroup.name}: ${groupCount}`);

  // A.5 — email collision
  console.log('\n--- A.5 email collision check ---');
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .ilike('email', 'aresaee71@gmail.com')
    .maybeSingle();
  if (existingProfile) {
    console.log('⚠️  EMAIL ALREADY EXISTS:');
    console.log(JSON.stringify(existingProfile, null, 2));
  } else {
    console.log('✅ Email is free — safe to create');
  }

  // A.6 — must_change_password location
  console.log('\n--- A.6 must_change_password location ---');
  const { rows: mcpRows } = await pg.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema='public'
      AND column_name='must_change_password'
      AND table_name IN ('profiles','students');
  `);
  console.log(mcpRows.length ? mcpRows : '⚠️  Column not found on profiles or students');

  await pg.end();

  console.log('\n═══ PHASE A COMPLETE ═══');
  console.log(`NEXT: ${recordingsExists ? 'recordings enum ✅ — proceed to Phase C' : '❌ recordings missing — apply migration first (Phase B)'}`);
})().catch(e => { console.error('💥 PROBE FAILED:', e.message); process.exit(1); });
