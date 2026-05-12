const { Client } = require('pg');
const c = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});
c.connect().then(async () => {
  // Check student vocab progress tables
  for (const tbl of ['student_saved_words', 'vocabulary_word_mastery', 'curriculum_vocabulary_srs', 'anki_cards']) {
    const cols = await c.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position LIMIT 20",
      [tbl]
    ).catch(e => ({ rows: [], err: e.message }));
    if (cols.err) console.log(tbl + ': not found');
    else console.log(tbl + ': ' + cols.rows.map(r => r.column_name).join(', '));
  }

  // Check distinct level_ids
  const levels = await c.query(`
    SELECT DISTINCT cu.level_id, count(*) AS vocab_count
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    GROUP BY cu.level_id ORDER BY cu.level_id
  `);
  console.log('\nVocab per level_id:');
  levels.rows.forEach(r => console.log('  level_id=' + r.level_id + ': ' + r.vocab_count));

  await c.end();
}).catch(e => console.error(e.message));
