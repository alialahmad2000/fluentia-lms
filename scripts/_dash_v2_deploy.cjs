const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const client = new Client({
  host: 'db.nmjexpuycmqcxuxljier.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()
  console.log('Connected. Running migration...\n')

  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '114_dashboard_v2_backend.sql'),
    'utf8'
  )

  try {
    await client.query(sql)
    console.log('=== Migration executed successfully ===\n')
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message)
    console.error('Detail:', err.detail)
    console.error('Position:', err.position)
    await client.end()
    process.exit(1)
  }

  // ─── Verification ───
  console.log('=== PHASE 1 VERIFY: show_in_leaderboard ===')
  const { rows: col } = await client.query(`
    SELECT 'show_in_leaderboard added' AS status
    WHERE EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='students' AND column_name='show_in_leaderboard')
  `)
  console.log(col.length === 1 ? 'PASS' : 'FAIL', col)

  console.log('\n=== PHASE 2 VERIFY: indexes ===')
  const { rows: idxs } = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname='public'
      AND indexname IN (
        'idx_xp_tx_student_created','idx_activity_feed_created',
        'idx_students_academic_level','idx_saved_words_student_created',
        'idx_mastery_student_word'
      )
  `)
  console.log(`${idxs.length}/5 indexes exist:`, idxs.map(r => r.indexname))

  console.log('\n=== PHASE 4 VERIFY: activity_feed columns ===')
  const { rows: afCols } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='activity_feed'
      AND column_name IN ('event_text_ar','xp_amount')
  `)
  console.log('event_text_ar & xp_amount:', afCols.map(r => r.column_name))

  console.log('\n=== PHASE 4 VERIFY: triggers ===')
  const { rows: triggers } = await client.query(`
    SELECT event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema='public'
      AND trigger_name IN ('trg_feed_word_added','trg_feed_xp_earned','trg_feed_section_completed')
  `)
  console.log(`${triggers.length}/3 triggers:`, triggers.map(r => `${r.event_object_table} -> ${r.trigger_name}`))

  console.log('\n=== PHASE 5 VERIFY: realtime ===')
  const { rows: pub } = await client.query(`
    SELECT tablename FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='activity_feed'
  `)
  console.log('activity_feed in supabase_realtime:', pub.length > 0 ? 'YES' : 'NO')

  // ─── Phase 6: Function tests ───
  const testStudentId = 'cad66f17-4471-4e64-acce-aa2836e1a814' // Manar, level 1, 1430 XP
  console.log('\n=== PHASE 6: Function tests (student:', testStudentId, ') ===\n')

  // Temporarily set role to postgres for SECURITY DEFINER testing
  // (these functions check auth.uid() which returns null in direct PG,
  //  but since we're the postgres superuser and functions are SECURITY DEFINER,
  //  we need to handle the auth check. Let's override auth.uid temporarily)

  // Set auth context for testing
  await client.query(`
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT '${testStudentId}'::UUID;
    $$ LANGUAGE sql STABLE;
  `)

  try {
    console.log('--- get_student_today_summary ---')
    const { rows: r1 } = await client.query(`SELECT * FROM get_student_today_summary($1)`, [testStudentId])
    console.log(JSON.stringify(r1, null, 2))

    console.log('\n--- get_student_week_summary ---')
    const { rows: r2 } = await client.query(`SELECT * FROM get_student_week_summary($1)`, [testStudentId])
    console.log(JSON.stringify(r2, null, 2))

    console.log('\n--- get_dictionary_stats ---')
    const { rows: r3 } = await client.query(`SELECT * FROM get_dictionary_stats($1)`, [testStudentId])
    console.log(JSON.stringify(r3, null, 2))

    console.log('\n--- get_personal_dictionary (limit 6) ---')
    const { rows: r4 } = await client.query(`SELECT * FROM get_personal_dictionary($1, 6, 0, NULL, NULL, NULL)`, [testStudentId])
    console.log(JSON.stringify(r4, null, 2))

    console.log('\n--- get_level_activity_feed ---')
    const { rows: r5 } = await client.query(`SELECT * FROM get_level_activity_feed($1, 20)`, [testStudentId])
    console.log(JSON.stringify(r5, null, 2))

    console.log('\n--- get_level_top_movers ---')
    const { rows: r6 } = await client.query(`SELECT * FROM get_level_top_movers($1)`, [testStudentId])
    console.log(JSON.stringify(r6, null, 2))
  } finally {
    // Restore original auth.uid function
    await client.query(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT COALESCE(
          current_setting('request.jwt.claim.sub', true),
          (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
        )::UUID;
      $$ LANGUAGE sql STABLE;
    `)
    console.log('\n--- auth.uid() restored ---')
  }

  // ─── Phase 7: RLS audit ───
  console.log('\n=== PHASE 7: RLS AUDIT ===')
  const { rows: rls } = await client.query(`
    SELECT tablename, policyname, cmd, LEFT(qual::text, 120) as qual
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('student_saved_words','vocabulary_word_mastery','xp_transactions','activity_feed','students','profiles')
    ORDER BY tablename, policyname
  `)
  rls.forEach(r => console.log(`  ${r.tablename} | ${r.policyname} | ${r.cmd} | ${r.qual || 'N/A'}`))

  // Check if activity_feed has RLS enabled
  const { rows: rlsEnabled } = await client.query(`
    SELECT relname, relrowsecurity FROM pg_class
    WHERE relname = 'activity_feed' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `)
  console.log('\nactivity_feed RLS enabled:', rlsEnabled[0]?.relrowsecurity ? 'YES' : 'NO')

  await client.end()
  console.log('\n=== ALL DONE ===')
}

run().catch(e => { console.error(e); process.exit(1) })
