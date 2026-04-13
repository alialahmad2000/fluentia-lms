const { Client } = require('pg');
const c = new Client({ host: 'db.nmjexpuycmqcxuxljier.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false } });

(async () => {
  await c.connect();

  // 1. Reading tables
  console.log('=== 1. READING TABLES ===');
  const rt = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%reading%' OR table_name ILIKE '%passage%')`);
  rt.rows.forEach(r => console.log(' ', r.table_name));

  // 2. Reading table columns
  console.log('\n=== 2. curriculum_readings COLUMNS ===');
  const rcols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_readings' ORDER BY ordinal_position`);
  rcols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

  // 3. Listening tables + columns
  console.log('\n=== 3. LISTENING TABLES ===');
  const lt = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%listen%'`);
  lt.rows.forEach(r => console.log(' ', r.table_name));

  console.log('\n=== 4. curriculum_listening COLUMNS ===');
  const lcols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_listening' ORDER BY ordinal_position`);
  lcols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

  // 5. Count passages for L1 + L3
  console.log('\n=== 5. READING PASSAGES COUNT (L1+L3) ===');
  const rc = await c.query(`SELECT l.level_number, COUNT(*) AS passages FROM curriculum_readings r JOIN curriculum_units u ON u.id = r.unit_id JOIN curriculum_levels l ON l.id = u.level_id WHERE l.level_number IN (1, 3) GROUP BY l.level_number ORDER BY l.level_number`);
  rc.rows.forEach(r => console.log(`  Level ${r.level_number}: ${r.passages} passages`));

  // 6. Listening count for L1 + L3
  console.log('\n=== 6. LISTENING COUNT (L1+L3) ===');
  const lcount = await c.query(`SELECT l.level_number, COUNT(*) AS items FROM curriculum_listening cl JOIN curriculum_units u ON u.id = cl.unit_id JOIN curriculum_levels l ON l.id = u.level_id WHERE l.level_number IN (1, 3) GROUP BY l.level_number ORDER BY l.level_number`);
  lcount.rows.forEach(r => console.log(`  Level ${r.level_number}: ${r.items} items`));

  // 7. Audio tables
  console.log('\n=== 7. AUDIO TABLES ===');
  const at = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%audio%'`);
  console.log(at.rows.length ? at.rows.map(r => r.table_name).join(', ') : '  NONE');

  // 8. Sample reading content - check content column and paragraph style
  console.log('\n=== 8. SAMPLE READING CONTENT ===');
  // First check what columns have the actual text
  const textCols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_readings' AND (column_name ILIKE '%content%' OR column_name ILIKE '%passage%' OR column_name ILIKE '%text%')`);
  console.log('  Content columns:', textCols.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));

  // Get sample with all text columns
  const contentColNames = textCols.rows.map(r => r.column_name).join(', ');
  if (contentColNames) {
    const sample = await c.query(`SELECT r.id, r.reading_label, ${contentColNames}, u.unit_number, l.level_number FROM curriculum_readings r JOIN curriculum_units u ON u.id = r.unit_id JOIN curriculum_levels l ON l.id = u.level_id WHERE l.level_number = 1 ORDER BY u.unit_number, r.reading_label LIMIT 2`);
    sample.rows.forEach(r => {
      console.log(`\n  L${r.level_number} U${r.unit_number} [${r.reading_label}]:`);
      for (const col of textCols.rows) {
        const val = r[col.column_name];
        if (val) {
          const preview = typeof val === 'string' ? val.substring(0, 300) : JSON.stringify(val).substring(0, 300);
          console.log(`  ${col.column_name}: ${preview}...`);
        }
      }
    });
  }

  // 9. Sample listening content
  console.log('\n=== 9. SAMPLE LISTENING CONTENT ===');
  const lisTextCols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_listening' AND (column_name ILIKE '%content%' OR column_name ILIKE '%script%' OR column_name ILIKE '%text%' OR column_name ILIKE '%transcript%')`);
  console.log('  Content columns:', lisTextCols.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));

  const lisColNames = lisTextCols.rows.map(r => r.column_name).join(', ');
  if (lisColNames) {
    const lsample = await c.query(`SELECT cl.id, ${lisColNames}, u.unit_number, l.level_number FROM curriculum_listening cl JOIN curriculum_units u ON u.id = cl.unit_id JOIN curriculum_levels l ON l.id = u.level_id WHERE l.level_number = 1 ORDER BY u.unit_number LIMIT 2`);
    lsample.rows.forEach(r => {
      console.log(`\n  L${r.level_number} U${r.unit_number}:`);
      for (const col of lisTextCols.rows) {
        const val = r[col.column_name];
        if (val) {
          const preview = typeof val === 'string' ? val.substring(0, 300) : JSON.stringify(val).substring(0, 300);
          console.log(`  ${col.column_name}: ${preview}...`);
        }
      }
    });
  }

  // 10. Storage bucket
  console.log('\n=== 10. STORAGE BUCKET ===');
  const bucket = await c.query(`SELECT id, public FROM storage.buckets WHERE id='curriculum-audio'`);
  console.log(bucket.rows.length ? JSON.stringify(bucket.rows[0]) : '  NOT FOUND');

  // 11. Char count estimates for L1+L3
  console.log('\n=== 11. CHAR COUNT ESTIMATES (L1+L3 only) ===');

  // Reading chars - need to handle JSONB vs text
  const readingType = textCols.rows.find(r => r.column_name === 'passage_content');
  if (readingType) {
    if (readingType.data_type === 'jsonb' || readingType.data_type === 'json') {
      // JSONB - sum up paragraph lengths
      const rchars = await c.query(`
        SELECT l.level_number,
          SUM(LENGTH(r.passage_content::text)) as raw_chars,
          COUNT(*) as passages
        FROM curriculum_readings r
        JOIN curriculum_units u ON u.id = r.unit_id
        JOIN curriculum_levels l ON l.id = u.level_id
        WHERE l.level_number IN (1, 3)
        GROUP BY l.level_number ORDER BY l.level_number
      `);
      rchars.rows.forEach(r => console.log(`  Reading L${r.level_number}: ~${r.raw_chars} raw JSON chars across ${r.passages} passages`));
    } else {
      const rchars = await c.query(`
        SELECT l.level_number, SUM(LENGTH(r.passage_content)) as chars, COUNT(*) as passages
        FROM curriculum_readings r
        JOIN curriculum_units u ON u.id = r.unit_id
        JOIN curriculum_levels l ON l.id = u.level_id
        WHERE l.level_number IN (1, 3)
        GROUP BY l.level_number ORDER BY l.level_number
      `);
      rchars.rows.forEach(r => console.log(`  Reading L${r.level_number}: ${r.chars} chars across ${r.passages} passages`));
    }
  }

  // Also check content_en if it exists
  const contentEn = textCols.rows.find(r => r.column_name === 'content_en');
  if (contentEn) {
    const rchars2 = await c.query(`
      SELECT l.level_number, SUM(LENGTH(r.content_en)) as chars, COUNT(*) as passages
      FROM curriculum_readings r
      JOIN curriculum_units u ON u.id = r.unit_id
      JOIN curriculum_levels l ON l.id = u.level_id
      WHERE l.level_number IN (1, 3)
      GROUP BY l.level_number ORDER BY l.level_number
    `);
    rchars2.rows.forEach(r => console.log(`  Reading L${r.level_number} (content_en): ${r.chars} chars across ${r.passages} passages`));
  }

  // Listening chars
  const lisScriptCol = lisTextCols.rows.find(r => r.column_name === 'transcript') || lisTextCols.rows[0];
  if (lisScriptCol) {
    const lchars = await c.query(`
      SELECT l.level_number, SUM(LENGTH(cl.${lisScriptCol.column_name})) as chars, COUNT(*) as items
      FROM curriculum_listening cl
      JOIN curriculum_units u ON u.id = cl.unit_id
      JOIN curriculum_levels l ON l.id = u.level_id
      WHERE l.level_number IN (1, 3)
      GROUP BY l.level_number ORDER BY l.level_number
    `);
    lchars.rows.forEach(r => console.log(`  Listening L${r.level_number}: ${r.chars} chars across ${r.items} items`));
  }

  // 12. Existing audio URLs - check if any readings already have audio
  console.log('\n=== 12. EXISTING AUDIO STATUS ===');
  const existingAudio = await c.query(`
    SELECT l.level_number, COUNT(*) as total,
      COUNT(r.passage_audio_url) as with_audio
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE l.level_number IN (1, 3)
    GROUP BY l.level_number ORDER BY l.level_number
  `);
  existingAudio.rows.forEach(r => console.log(`  Reading L${r.level_number}: ${r.with_audio}/${r.total} have audio`));

  const existingLisAudio = await c.query(`
    SELECT l.level_number, COUNT(*) as total,
      COUNT(cl.audio_url) as with_audio
    FROM curriculum_listening cl
    JOIN curriculum_units u ON u.id = cl.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE l.level_number IN (1, 3)
    GROUP BY l.level_number ORDER BY l.level_number
  `);
  existingLisAudio.rows.forEach(r => console.log(`  Listening L${r.level_number}: ${r.with_audio}/${r.total} have audio`));

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
