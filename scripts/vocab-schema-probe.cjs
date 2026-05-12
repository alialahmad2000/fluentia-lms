const { Client } = require('pg');
const c = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});
c.connect().then(async () => {
  const r1 = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_readings' ORDER BY ordinal_position LIMIT 20"
  );
  console.log('curriculum_readings columns:', r1.rows.map(r => r.column_name).join(', '));

  const r2 = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%reading%' OR table_name LIKE '%unit%') ORDER BY table_name"
  );
  console.log('reading/unit tables:', r2.rows.map(r => r.table_name).join(', '));

  const r3 = await c.query(
    "SELECT cv.reading_id, cr.unit_id FROM curriculum_vocabulary cv JOIN curriculum_readings cr ON cr.id = cv.reading_id LIMIT 3"
  ).catch(e => ({ rows: [], err: e.message }));
  if (r3.err) console.log('join error:', r3.err);
  else console.log('join sample:', JSON.stringify(r3.rows[0]));

  const r4 = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_units' ORDER BY ordinal_position LIMIT 20"
  ).catch(e => ({ rows: [], err: e.message }));
  if (r4.err) console.log('units err:', r4.err);
  else console.log('curriculum_units columns:', r4.rows.map(r => r.column_name).join(', '));

  await c.end();
}).catch(e => console.error(e.message));
