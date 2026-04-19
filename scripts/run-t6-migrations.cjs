const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

const migrations = ['145_grading_debrief_v2.sql'];

(async () => {
  await client.connect();
  console.log('Connected to Supabase DB');
  for (const file of migrations) {
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`\n▶ Running ${file}...`);
    try {
      await client.query(sql);
      console.log(`✓ ${file} applied`);
    } catch (e) {
      console.error(`✗ ${file} failed:`, e.message);
      process.exit(1);
    }
  }
  await client.end();
  console.log('\nAll T6 migrations applied.');
})();
