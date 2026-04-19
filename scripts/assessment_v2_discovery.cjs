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
  const results = {};

  try {
    // 0.1 All V2 tables
    console.log('=== 0.1 All V2 tables ===');
    const q1 = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name LIKE '%_v2'
      ORDER BY table_name
    `);
    results['0.1'] = q1.rows;
    q1.rows.forEach(r => console.log('  ' + r.table_name));

    // 0.2 curriculum_units_v2 structure
    console.log('\n=== 0.2 curriculum_units_v2 structure ===');
    const q2 = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='curriculum_units_v2'
      ORDER BY ordinal_position
    `);
    results['0.2'] = q2.rows;
    q2.rows.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type + ' | nullable=' + r.is_nullable));

    // 0.3 curriculum_activities_v2 structure
    console.log('\n=== 0.3 curriculum_activities_v2 structure ===');
    const q3 = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='curriculum_activities_v2'
      ORDER BY ordinal_position
    `);
    results['0.3'] = q3.rows;
    q3.rows.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type + ' | nullable=' + r.is_nullable));

    // 0.4 Existing assessment activity types
    console.log('\n=== 0.4 Activity types ===');
    const q4 = await client.query(`
      SELECT DISTINCT activity_type, COUNT(*) AS cnt
      FROM curriculum_activities_v2 GROUP BY 1
    `);
    results['0.4'] = q4.rows;
    q4.rows.forEach(r => console.log('  ' + r.activity_type + ': ' + r.cnt));

    // 0.5 Activity count per unit
    console.log('\n=== 0.5 Activity count per unit (first 20) ===');
    const q5 = await client.query(`
      SELECT u.id, u.unit_number, u.level, COUNT(a.id) AS activity_count
      FROM curriculum_units_v2 u
      LEFT JOIN curriculum_activities_v2 a ON a.unit_id = u.id
      GROUP BY u.id, u.unit_number, u.level
      ORDER BY u.level, u.unit_number
      LIMIT 20
    `);
    results['0.5'] = q5.rows;
    q5.rows.forEach(r => console.log('  L' + r.level + ' U' + r.unit_number + ': ' + r.activity_count + ' activities'));

    // 0.6 Student unit progress / completion tracking table
    console.log('\n=== 0.6 Completion tracking tables ===');
    const q6 = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema='public'
        AND (table_name LIKE '%unit_progress%' OR table_name LIKE '%unit_completion%'
             OR table_name LIKE '%activity_completion%' OR table_name LIKE '%activity_progress%')
      ORDER BY table_name, ordinal_position
    `);
    results['0.6'] = q6.rows;
    if (q6.rows.length === 0) {
      console.log('  (none found with unit_progress/unit_completion/activity_completion/activity_progress)');
      // Broader search
      const q6b = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema='public'
          AND (table_name LIKE '%progress%' OR table_name LIKE '%completion%' OR table_name LIKE '%student_activity%')
        ORDER BY table_name
      `);
      console.log('  Broader search:');
      q6b.rows.forEach(r => console.log('    ' + r.table_name));
      results['0.6_broad'] = q6b.rows;

      // If found, get columns
      for (const r of q6b.rows) {
        const cols = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1
          ORDER BY ordinal_position
        `, [r.table_name]);
        console.log('  Columns of ' + r.table_name + ':');
        cols.rows.forEach(c => console.log('    ' + c.column_name + ' | ' + c.data_type + ' | nullable=' + c.is_nullable));
        results['0.6_' + r.table_name] = cols.rows;
      }
    } else {
      q6.rows.forEach(r => console.log('  ' + r.table_name + '.' + r.column_name + ' | ' + r.data_type));
    }

    // 0.7 Any existing unit-level assessment table
    console.log('\n=== 0.7 Existing unit assessment tables ===');
    const q7 = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name ILIKE '%unit%assess%'
    `);
    results['0.7'] = q7.rows;
    if (q7.rows.length === 0) console.log('  (none)');
    else q7.rows.forEach(r => console.log('  ' + r.table_name));

    // 0.8 Total units count
    console.log('\n=== 0.8 Total V2 units ===');
    const q8 = await client.query(`
      SELECT level, COUNT(*) AS unit_count
      FROM curriculum_units_v2
      GROUP BY level ORDER BY level
    `);
    results['0.8'] = q8.rows;
    let total = 0;
    q8.rows.forEach(r => { total += parseInt(r.unit_count); console.log('  L' + r.level + ': ' + r.unit_count + ' units'); });
    console.log('  Total: ' + total);

    // 0.9 Check CinematicBackground exists
    console.log('\n=== 0.9 Design system check ===');
    const q9 = await client.query(`SELECT 1`); // placeholder
    results['0.9'] = 'checked via file system';

    // Save discovery to file
    const outDir = path.join(__dirname, '..', 'prompts', 'agents');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const md = `# UNIT-ASSESSMENT-DISCOVERY
Generated: ${new Date().toISOString()}

## 0.1 All V2 Tables
${q1.rows.map(r => '- ' + r.table_name).join('\n')}

## 0.2 curriculum_units_v2 Structure
| Column | Type | Nullable |
|--------|------|----------|
${q2.rows.map(r => '| ' + r.column_name + ' | ' + r.data_type + ' | ' + r.is_nullable + ' |').join('\n')}

## 0.3 curriculum_activities_v2 Structure
| Column | Type | Nullable |
|--------|------|----------|
${q3.rows.map(r => '| ' + r.column_name + ' | ' + r.data_type + ' | ' + r.is_nullable + ' |').join('\n')}

## 0.4 Activity Types
${q4.rows.map(r => '- ' + r.activity_type + ': ' + r.cnt).join('\n')}

## 0.5 Activity Count per Unit (first 20)
${q5.rows.map(r => '- L' + r.level + ' U' + r.unit_number + ': ' + r.activity_count).join('\n')}

## 0.6 Completion Tracking
${q6.rows.length > 0 ? q6.rows.map(r => '- ' + r.table_name + '.' + r.column_name + ' (' + r.data_type + ')').join('\n') : 'No direct match. Broader search results included in console output.'}

## 0.7 Existing Assessment Tables
${q7.rows.length > 0 ? q7.rows.map(r => '- ' + r.table_name).join('\n') : 'None'}

## 0.8 Unit Counts by Level
${q8.rows.map(r => '- L' + r.level + ': ' + r.unit_count).join('\n')}
- **Total: ${total}**
`;

    fs.writeFileSync(path.join(outDir, 'UNIT-ASSESSMENT-DISCOVERY.md'), md);
    console.log('\nDiscovery saved to prompts/agents/UNIT-ASSESSMENT-DISCOVERY.md');

  } catch(e) {
    console.error('ERROR:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
