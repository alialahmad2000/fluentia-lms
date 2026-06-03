// Introspect exact schema + row counts of every vocab source table before writing the unified migration.
const { query } = require('./_db.cjs')

const TABLES = [
  'curriculum_vocabulary',
  'curriculum_vocabulary_srs',
  'vocabulary_word_mastery',
  'student_saved_words',
  'vocabulary_bank',
  'vocabulary_quiz_attempts',
  'anki_cards',
  'srs_review_logs',
  'hard_words_drill_log',
  'vocab_cards', // may not exist yet
]

async function main() {
  // 1) which tables exist
  const exists = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name = ANY(ARRAY[${TABLES.map(t => `'${t}'`).join(',')}])
    ORDER BY table_name;`)
  const existing = (exists || []).map(r => r.table_name)
  console.log('=== EXISTING TABLES ===')
  console.log(existing.join('\n') || '(none)')

  // 2) columns for each existing table
  for (const t of existing) {
    const cols = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='${t}'
      ORDER BY ordinal_position;`)
    console.log(`\n=== COLUMNS: ${t} ===`)
    for (const c of cols) {
      console.log(`  ${c.column_name.padEnd(28)} ${String(c.data_type).padEnd(26)} ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}  ${c.column_default ? 'default ' + String(c.column_default).slice(0, 40) : ''}`)
    }
  }

  // 3) row counts
  console.log('\n=== ROW COUNTS ===')
  for (const t of existing) {
    try {
      const r = await query(`SELECT count(*)::int AS n FROM public.${t};`)
      console.log(`  ${t.padEnd(28)} ${r[0].n}`)
    } catch (e) {
      console.log(`  ${t.padEnd(28)} ERR ${e.message.slice(0, 80)}`)
    }
  }

  // 4) distinct students with any vocab data (sizing the backfill)
  console.log('\n=== DISTINCT STUDENTS PER STORE ===')
  const studentCols = {
    curriculum_vocabulary_srs: 'student_id',
    vocabulary_word_mastery: 'student_id',
    student_saved_words: 'student_id',
    vocabulary_bank: 'student_id',
  }
  for (const [t, col] of Object.entries(studentCols)) {
    if (!existing.includes(t)) continue
    try {
      const r = await query(`SELECT count(DISTINCT ${col})::int AS n FROM public.${t};`)
      console.log(`  ${t.padEnd(28)} ${r[0].n} students`)
    } catch (e) {
      console.log(`  ${t.padEnd(28)} ERR ${e.message.slice(0, 80)}`)
    }
  }
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1) })
