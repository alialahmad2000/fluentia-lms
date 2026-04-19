const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    // Check ALL public tables
    console.log('=== ALL PUBLIC TABLES ===');
    const allTables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' ORDER BY table_name
    `);
    allTables.rows.forEach(r => console.log('  ' + r.table_name));

    // Check for v2 tables specifically
    console.log('\n=== V2 TABLES ===');
    const v2 = allTables.rows.filter(r => r.table_name.includes('v2') || r.table_name.includes('_v2'));
    if (v2.length === 0) console.log('  NONE FOUND');
    else v2.forEach(r => console.log('  ' + r.table_name));

    // Check for curriculum tables
    console.log('\n=== CURRICULUM TABLES ===');
    const curr = allTables.rows.filter(r => r.table_name.includes('curriculum'));
    curr.forEach(r => console.log('  ' + r.table_name));

    // Check curriculum_units structure
    console.log('\n=== curriculum_units structure ===');
    const units = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='curriculum_units'
      ORDER BY ordinal_position
    `);
    units.rows.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type + ' | ' + r.is_nullable));

    // Check for activities table
    console.log('\n=== ACTIVITY TABLES ===');
    const act = allTables.rows.filter(r => r.table_name.includes('activit'));
    if (act.length === 0) console.log('  NONE');
    else act.forEach(r => console.log('  ' + r.table_name));

    // Check for any progress/completion tables
    console.log('\n=== PROGRESS/COMPLETION TABLES ===');
    const prog = allTables.rows.filter(r =>
      r.table_name.includes('progress') || r.table_name.includes('completion') || r.table_name.includes('student_')
    );
    prog.forEach(r => console.log('  ' + r.table_name));

    // Check levels and units
    console.log('\n=== LEVELS & UNITS ===');
    const levelsUnits = await client.query(`
      SELECT l.level_number, l.name, COUNT(u.id) AS units
      FROM curriculum_levels l
      LEFT JOIN curriculum_units u ON u.level_id = l.id
      GROUP BY l.id, l.level_number, l.name
      ORDER BY l.level_number
    `);
    let totalUnits = 0;
    levelsUnits.rows.forEach(r => { totalUnits += parseInt(r.units); console.log('  L' + r.level_number + ' (' + r.name + '): ' + r.units + ' units'); });
    console.log('  Total: ' + totalUnits);

    // Check for assessment tables
    console.log('\n=== ASSESSMENT TABLES ===');
    const assess = allTables.rows.filter(r => r.table_name.includes('assess'));
    if (assess.length === 0) console.log('  NONE');
    else assess.forEach(r => console.log('  ' + r.table_name));

    // Check for XP tables
    console.log('\n=== XP / REWARD TABLES ===');
    const xp = allTables.rows.filter(r => r.table_name.includes('xp') || r.table_name.includes('reward') || r.table_name.includes('star'));
    if (xp.length === 0) console.log('  NONE');
    else xp.forEach(r => console.log('  ' + r.table_name));

  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
