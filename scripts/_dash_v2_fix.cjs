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

const TEST_STUDENT = 'cad66f17-4471-4e64-acce-aa2836e1a814'

async function run() {
  await client.connect()

  // Re-run the fixed migration (CREATE OR REPLACE is idempotent)
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '114_dashboard_v2_backend.sql'),
    'utf8'
  )

  try {
    await client.query(sql)
    console.log('Migration re-applied successfully\n')
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message, err.detail)
    await client.end()
    process.exit(1)
  }

  // Test each function using SET LOCAL to simulate JWT
  const tests = [
    ['get_student_today_summary', `SELECT * FROM get_student_today_summary('${TEST_STUDENT}')`],
    ['get_student_week_summary', `SELECT * FROM get_student_week_summary('${TEST_STUDENT}')`],
    ['get_dictionary_stats', `SELECT * FROM get_dictionary_stats('${TEST_STUDENT}')`],
    ['get_personal_dictionary', `SELECT * FROM get_personal_dictionary('${TEST_STUDENT}', 6, 0, NULL, NULL, NULL)`],
    ['get_level_activity_feed', `SELECT * FROM get_level_activity_feed('${TEST_STUDENT}', 20)`],
    ['get_level_top_movers', `SELECT * FROM get_level_top_movers('${TEST_STUDENT}')`],
  ]

  for (const [name, sql] of tests) {
    console.log(`\n--- ${name} ---`)
    try {
      await client.query('BEGIN')
      await client.query(`SET LOCAL request.jwt.claim.sub = '${TEST_STUDENT}'`)
      await client.query(`SET LOCAL request.jwt.claims = '{"sub":"${TEST_STUDENT}"}'`)
      const { rows } = await client.query(sql)
      await client.query('COMMIT')
      console.log(`PASS: ${rows.length} row(s)`)
      console.log(JSON.stringify(rows, null, 2))
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`FAIL: ${err.message}`)
    }
  }

  await client.end()
  console.log('\n=== ALL TESTS COMPLETE ===')
}

run().catch(e => { console.error(e); process.exit(1) })
