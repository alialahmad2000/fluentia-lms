const { Client } = require('pg')

const client = new Client({
  host: 'db.nmjexpuycmqcxuxljier.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
})

const TEST_STUDENT = 'cad66f17-4471-4e64-acce-aa2836e1a814'

async function testFn(name, sql, params) {
  console.log(`\n--- ${name} ---`)
  try {
    // Set JWT claim to simulate authenticated student
    await client.query('BEGIN')
    await client.query(`SET LOCAL request.jwt.claim.sub = '${TEST_STUDENT}'`)
    await client.query(`SET LOCAL request.jwt.claims = '{"sub":"${TEST_STUDENT}"}'`)
    const { rows } = await client.query(sql, params)
    await client.query('COMMIT')
    console.log(`Returned ${rows.length} row(s)`)
    console.log(JSON.stringify(rows, null, 2))
    return rows
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`ERROR: ${err.message}`)
    return null
  }
}

async function run() {
  await client.connect()
  console.log('Connected. Testing functions with student:', TEST_STUDENT)

  await testFn('get_student_today_summary',
    'SELECT * FROM get_student_today_summary($1)', [TEST_STUDENT])

  await testFn('get_student_week_summary',
    'SELECT * FROM get_student_week_summary($1)', [TEST_STUDENT])

  await testFn('get_dictionary_stats',
    'SELECT * FROM get_dictionary_stats($1)', [TEST_STUDENT])

  await testFn('get_personal_dictionary',
    'SELECT * FROM get_personal_dictionary($1, 6, 0, NULL, NULL, NULL)', [TEST_STUDENT])

  await testFn('get_level_activity_feed',
    'SELECT * FROM get_level_activity_feed($1, 20)', [TEST_STUDENT])

  await testFn('get_level_top_movers',
    'SELECT * FROM get_level_top_movers($1)', [TEST_STUDENT])

  // RLS audit
  console.log('\n=== RLS AUDIT ===')
  const { rows: rls } = await client.query(`
    SELECT tablename, policyname, cmd, LEFT(qual::text, 150) as qual
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('student_saved_words','vocabulary_word_mastery','xp_transactions','activity_feed','students','profiles')
    ORDER BY tablename, policyname
  `)
  rls.forEach(r => console.log(`  ${r.tablename} | ${r.policyname} | ${r.cmd}`))

  const { rows: rlsState } = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname IN ('activity_feed','student_saved_words','vocabulary_word_mastery','xp_transactions')
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `)
  console.log('\nRLS enabled state:')
  rlsState.forEach(r => console.log(`  ${r.relname}: ${r.relrowsecurity ? 'YES' : 'NO'}`))

  await client.end()
  console.log('\n=== ALL TESTS COMPLETE ===')
}

run().catch(e => { console.error(e); process.exit(1) })
