const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Find all curriculum_* tables
    console.log('=== All curriculum_* tables ===');
    const { rows: currTables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'curriculum_%' ORDER BY 1"
    );
    currTables.forEach(r => console.log('  ' + r.table_name));

    // Check student_curriculum_progress more closely - this is the activity tracking table
    console.log('\n=== student_curriculum_progress section_type values ===');
    const { rows: sectionTypes } = await client.query(
      "SELECT DISTINCT section_type, COUNT(*) FROM student_curriculum_progress GROUP BY 1 ORDER BY 2 DESC"
    );
    sectionTypes.forEach(r => console.log('  ' + r.section_type + ': ' + r.count));

    // Check what curriculum_readings look like (this is the activity equivalent)
    console.log('\n=== curriculum_readings columns ===');
    const { rows: readCols } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_readings' ORDER BY ordinal_position"
    );
    readCols.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type));

    // Check curriculum_grammar
    console.log('\n=== curriculum_grammar columns ===');
    const { rows: gramCols } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_grammar' ORDER BY ordinal_position"
    );
    if (gramCols.length) gramCols.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type));
    else console.log('  TABLE NOT FOUND');

    // Count sections per unit
    console.log('\n=== Sections per unit (from student_curriculum_progress) ===');
    const { rows: sectionCounts } = await client.query(`
      SELECT scp.unit_id, u.unit_number, COUNT(DISTINCT scp.section_type) as section_types,
             COUNT(*) as total_records
      FROM student_curriculum_progress scp
      JOIN curriculum_units u ON u.id = scp.unit_id
      GROUP BY scp.unit_id, u.unit_number
      ORDER BY u.unit_number
      LIMIT 10
    `);
    sectionCounts.forEach(r => console.log('  unit_' + r.unit_number + ' | types:' + r.section_types + ' | records:' + r.total_records));

    // Check how activities map in student_curriculum_progress
    console.log('\n=== student_curriculum_progress — unique FK columns used ===');
    const { rows: fkUsage } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE reading_id IS NOT NULL) as has_reading,
        COUNT(*) FILTER (WHERE grammar_id IS NOT NULL) as has_grammar,
        COUNT(*) FILTER (WHERE assessment_id IS NOT NULL) as has_assessment,
        COUNT(*) FILTER (WHERE writing_id IS NOT NULL) as has_writing,
        COUNT(*) FILTER (WHERE listening_id IS NOT NULL) as has_listening,
        COUNT(*) FILTER (WHERE speaking_id IS NOT NULL) as has_speaking,
        COUNT(*) FILTER (WHERE pronunciation_id IS NOT NULL) as has_pronunciation,
        COUNT(*) as total
      FROM student_curriculum_progress
    `);
    console.log(fkUsage[0]);

    // Unit count
    console.log('\n=== Total units ===');
    const { rows: [uc] } = await client.query('SELECT COUNT(*) as c FROM curriculum_units');
    console.log('  ' + uc.c);

    // XP discovery
    console.log('\n=== XP-related tables ===');
    const { rows: xpTables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%xp%' OR table_name ILIKE '%gamif%')"
    );
    console.log(xpTables.map(r => r.table_name));

    // xp_transactions columns
    console.log('\n=== xp_transactions columns ===');
    const { rows: xpCols } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='xp_transactions' ORDER BY ordinal_position"
    );
    if (xpCols.length) xpCols.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type));
    else console.log('  TABLE NOT FOUND');

    // Notifications table
    console.log('\n=== notifications columns ===');
    const { rows: notifCols } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' ORDER BY ordinal_position"
    );
    if (notifCols.length) notifCols.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type));
    else console.log('  TABLE NOT FOUND');

    // Check level mapping: curriculum_units.level_id -> curriculum_levels
    console.log('\n=== curriculum_levels ===');
    const { rows: levels } = await client.query(
      "SELECT id, level_number, name_en FROM curriculum_levels ORDER BY level_number"
    );
    levels.forEach(r => console.log('  L' + r.level_number + ' | ' + r.name_en + ' | ' + r.id));

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
