const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  await client.connect();
  let allGood = true;

  // 1. All 7 tables exist and are accessible
  const tables = [
    'trainer_xp_events', 'trainer_streaks', 'student_interventions',
    'trainer_daily_rituals', 'nabih_conversations', 'nabih_messages', 'class_debriefs'
  ];
  console.log('\n── Tables ──');
  for (const t of tables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    const ok = !error;
    if (!ok) allGood = false;
    console.log(`  ${ok ? '✓' : '✗'} ${t}: ${error ? 'ERR ' + error.message : count + ' rows'}`);
  }

  // 2. RPCs callable
  console.log('\n── RPCs ──');
  const { data: totals, error: tErr } = await sb.rpc('get_trainer_totals', {
    p_trainer_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log(`  ${!tErr ? '✓' : '✗'} get_trainer_totals: ${tErr ? tErr.message : JSON.stringify(totals)}`);
  if (tErr) allGood = false;

  const { data: queue, error: qErr } = await sb.rpc('get_intervention_queue', {
    p_trainer_id: '00000000-0000-0000-0000-000000000000', p_limit: 5
  });
  console.log(`  ${!qErr ? '✓' : '✗'} get_intervention_queue: ${qErr ? qErr.message : (Array.isArray(queue) ? queue.length + ' items' : JSON.stringify(queue))}`);
  if (qErr) allGood = false;

  // 3. RLS check — ensure tables have RLS enabled
  const { rows: rlsRows } = await client.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
    ORDER BY tablename;
  `, [tables]);
  console.log('\n── RLS enabled ──');
  for (const row of rlsRows) {
    const ok = row.rowsecurity;
    if (!ok) allGood = false;
    console.log(`  ${ok ? '✓' : '✗'} ${row.tablename}: RLS ${ok ? 'ON' : 'OFF'}`);
  }

  // 4. Policy count
  const { rows: policies } = await client.query(`
    SELECT count(*) as policy_count FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[]);
  `, [tables]);
  console.log(`\n── Policies: ${policies[0].policy_count} total on 7 tables ──`);

  await client.end();
  console.log(`\n${allGood ? '✅ All checks PASS' : '❌ Some checks FAILED'}`);
  if (!allGood) process.exit(1);
})();
