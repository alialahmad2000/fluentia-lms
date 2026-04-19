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
    // 0.1 Core curriculum tables
    console.log('=== 0.1 curriculum_units columns ===');
    const { rows: unitCols } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_units' ORDER BY ordinal_position"
    );
    unitCols.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type));

    console.log('\n=== 0.1b curriculum_activities columns ===');
    const { rows: actCols } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_activities' ORDER BY ordinal_position"
    );
    actCols.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type));

    // 0.2 Activity completion/progress tables
    console.log('\n=== 0.2 Progress/completion tables ===');
    const { rows: progTables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%progress%' OR table_name ILIKE '%completion%' OR table_name ILIKE '%student_activity%')"
    );
    console.log(progTables.map(r => r.table_name));

    // 0.3 Dump columns for each progress table
    for (const t of progTables) {
      console.log('\n=== 0.3 Columns of ' + t.table_name + ' ===');
      const { rows: cols } = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
        [t.table_name]
      );
      cols.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type));
    }

    // 0.4 Activity type enum values
    console.log('\n=== 0.4 Activity types in use ===');
    const { rows: actTypes } = await client.query(
      "SELECT DISTINCT activity_type, COUNT(*) FROM curriculum_activities GROUP BY 1 ORDER BY 2 DESC"
    );
    actTypes.forEach(r => console.log('  ' + r.activity_type + ': ' + r.count));

    // 0.5 Unit and activity counts
    console.log('\n=== 0.5 Unit + activity counts ===');
    const { rows: [counts] } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM curriculum_units) AS total_units,
        (SELECT COUNT(*) FROM curriculum_activities) AS total_activities,
        (SELECT COUNT(DISTINCT unit_id) FROM curriculum_activities) AS units_with_activities
    `);
    console.log('  total_units:', counts.total_units);
    console.log('  total_activities:', counts.total_activities);
    console.log('  units_with_activities:', counts.units_with_activities);

    // 0.6 Sample units with activity counts
    console.log('\n=== 0.6 Sample units with activities ===');
    const { rows: sampleUnits } = await client.query(`
      SELECT u.id, u.unit_number, u.level_id, COUNT(a.id) AS activity_count
      FROM curriculum_units u
      LEFT JOIN curriculum_activities a ON a.unit_id = u.id
      GROUP BY u.id, u.unit_number, u.level_id
      ORDER BY u.unit_number LIMIT 10
    `);
    sampleUnits.forEach(r => console.log('  unit_' + r.unit_number + ' | level_id:' + r.level_id + ' | activities:' + r.activity_count));

    // 0.8 Notification tables
    console.log('\n=== 0.8 Notification tables ===');
    const { rows: notifTables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%notification%' OR table_name ILIKE '%push%')"
    );
    console.log(notifTables.map(r => r.table_name));

    // Check if curriculum_units has a 'level' column or 'level_id'
    console.log('\n=== 0.9 curriculum_units level column check ===');
    const hasLevel = unitCols.find(c => c.column_name === 'level');
    const hasLevelId = unitCols.find(c => c.column_name === 'level_id');
    console.log('  has level:', !!hasLevel);
    console.log('  has level_id:', !!hasLevelId);

    // Check existing unit_mastery tables
    console.log('\n=== 0.10 Existing unit_mastery tables ===');
    const { rows: umTables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'unit_mastery_%'"
    );
    console.log(umTables.length ? umTables.map(r => r.table_name) : 'NONE');

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
