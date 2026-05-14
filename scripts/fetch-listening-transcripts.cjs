const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

const query = `
  SELECT cl.id, cl.title_en, cl.title_ar, cl.audio_type,
         clv.level_number, cu.unit_number,
         LEFT(cl.transcript, 300) AS transcript_preview
  FROM curriculum_listening cl
  JOIN curriculum_units cu ON cu.id = cl.unit_id
  JOIN curriculum_levels clv ON clv.id = cu.level_id
  ORDER BY clv.level_number, cu.unit_number
`;

(async () => {
  try {
    await client.connect();
    const result = await client.query(query);
    console.log(`Total rows: ${result.rows.length}\n`);

    let currentLevel = null;
    for (const row of result.rows) {
      if (row.level_number !== currentLevel) {
        currentLevel = row.level_number;
        console.log(`\n========== LEVEL ${currentLevel} ==========`);
      }
      console.log(`\nL${row.level_number}/U${row.unit_number} [${row.audio_type}] id:${row.id}`);
      console.log(`title_en: ${row.title_en}`);
      console.log(`title_ar: ${row.title_ar || '(none)'}`);
      console.log(`transcript: ${row.transcript_preview || '(none)'}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
