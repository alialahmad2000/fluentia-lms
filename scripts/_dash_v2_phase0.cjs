const { Client } = require('pg')
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

  const tables = [
    'student_saved_words', 'vocabulary_word_mastery', 'xp_transactions',
    'student_curriculum_progress', 'activity_feed', 'students', 'profiles',
    'curriculum_vocabulary', 'curriculum_units'
  ]

  for (const t of tables) {
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position
    `, [t])
    console.log(`\n=== ${t} (${rows.length} columns) ===`)
    rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable=${r.is_nullable} | default=${r.column_default || 'none'}`))
  }

  // Check specific columns we need
  console.log('\n=== CRITICAL COLUMN CHECKS ===')

  // profiles: gender, current_streak, first_name
  const { rows: profCols } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
      AND column_name IN ('gender','current_streak','first_name','streak_days','xp_total')
  `)
  console.log('profiles special cols:', profCols.map(r => r.column_name))

  // students: show_in_leaderboard, xp_total, current_streak
  const { rows: stuCols } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students'
      AND column_name IN ('show_in_leaderboard','xp_total','current_streak','streak_days')
  `)
  console.log('students special cols:', stuCols.map(r => r.column_name))

  // Check existing triggers on our tables
  const { rows: triggers } = await client.query(`
    SELECT event_object_table, trigger_name, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema='public'
      AND event_object_table IN ('xp_transactions','student_saved_words','student_curriculum_progress')
    ORDER BY event_object_table, trigger_name
  `)
  console.log('\n=== EXISTING TRIGGERS ===')
  triggers.forEach(r => console.log(`  ${r.event_object_table} -> ${r.trigger_name}: ${r.action_statement}`))
  if (triggers.length === 0) console.log('  (none found)')

  // Check realtime publication
  const { rows: pub } = await client.query(`
    SELECT tablename FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='activity_feed'
  `)
  console.log('\n=== REALTIME ===')
  console.log('activity_feed in supabase_realtime:', pub.length > 0 ? 'YES' : 'NO')

  // Check existing RLS
  const { rows: rls } = await client.query(`
    SELECT tablename, policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('student_saved_words','vocabulary_word_mastery','xp_transactions','activity_feed','students','profiles')
    ORDER BY tablename, policyname
  `)
  console.log('\n=== RLS POLICIES ===')
  rls.forEach(r => console.log(`  ${r.tablename} | ${r.policyname} | ${r.cmd} | ${(r.qual||'').substring(0,100)}`))

  // Get a test student
  const { rows: testStudent } = await client.query(`
    SELECT s.id, p.full_name, p.display_name, s.academic_level, s.xp_total
    FROM students s JOIN profiles p ON p.id = s.id
    WHERE s.academic_level IS NOT NULL
    ORDER BY s.xp_total DESC NULLS LAST
    LIMIT 3
  `)
  console.log('\n=== TEST STUDENTS ===')
  testStudent.forEach(r => console.log(`  ${r.id} | ${r.display_name || r.full_name} | level=${r.academic_level} | xp=${r.xp_total}`))

  // Check existing indexes
  const { rows: idxs } = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname='public'
      AND indexname IN (
        'idx_xp_tx_student_created','idx_activity_feed_created',
        'idx_students_academic_level','idx_saved_words_student_created',
        'idx_mastery_student_word'
      )
  `)
  console.log('\n=== EXISTING INDEXES ===')
  console.log(idxs.map(r => r.indexname))

  await client.end()
}
run().catch(e => { console.error(e); process.exit(1) })
