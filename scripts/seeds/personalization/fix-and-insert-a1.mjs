/**
 * Fix UUIDs in all A1 bucket files, then insert into DB.
 * Idempotent: ON CONFLICT upserts existing rows.
 */
import fs from 'fs';
import pg from 'pg';

// Correct A1 reading UUIDs in order
const realUUIDs = [
  '76d1051f-3e7c-4263-af48-98700a879bad',
  '0d3b261d-f139-4dec-9958-581a35986661',
  'fd8f24d7-02c5-4c7c-a07d-99656ff83c7f',
  'c812db3e-470a-40bd-b10e-40188e5699dc',
  'facd74da-54a6-453e-baed-aa995011718e',
  'd7fa776f-f0dc-4585-a3ea-1046ef633e73',
  '5a3594c9-d07f-4ede-848e-23c1388e0572',
  '59528adc-bf75-4881-914e-2e158527d163',
  'f23d9dfa-3add-44b6-93c5-8b813e3f2ce8',
  '5cf42d5b-f08a-45fe-b939-b102d8abd97d',
  '074b5897-63b9-4446-a7d4-6ab9f80baff9',
  'a882498d-285d-4418-bc4b-07d9365cf79f',
  '2e2c9994-ce65-4c6a-aa6e-2c83cb190c72',
  'd060f681-7e1b-405f-9cde-7b59ab1a6354',
  '635a21e7-a303-436a-8236-87daa74f7d14',
  '33e04971-5fc5-4324-b54c-4816dc4409e6',
  'a06e190b-ff65-46b7-969a-52a6bdb21298',
  'a03db754-37ba-4d7c-bbaf-3ada190715bd',
  'bb7081a8-7c02-4ea7-aef2-e48d77a709d2',
  '763410ec-0986-46fa-a570-7a011f38f449',
  '558b7c93-8dbe-473c-9db2-6421139b112f',
  '5f22076f-4654-4774-86f6-579b4b26700b',
  '34f048e4-23c7-4d39-bb7a-0b3d2e63764b',
  '212b4a0d-072e-4acd-85a3-6d7d910f0589',
];
const prefixMap = {};
for (const u of realUUIDs) prefixMap[u.slice(0, 8)] = u;

const bucketFiles = [
  'a1-medical.js', 'a1-business.js', 'a1-tech.js', 'a1-sports.js',
  'a1-travel-food.js', 'a1-islamic.js', 'a1-fashion-beauty.js', 'a1-family.js',
];

const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

// Fix UUIDs in each file
let fixCount = 0;
for (const fname of bucketFiles) {
  const path = `${dir}/${fname}`;
  if (!fs.existsSync(path)) { console.log(`MISSING: ${fname}`); continue; }
  let content = fs.readFileSync(path, 'utf8');
  const orig = content;
  content = content.replace(/canonical_reading_id:\s*['"]([0-9a-f]{8})['"]/g,
    (m, s) => prefixMap[s] ? `canonical_reading_id: '${prefixMap[s]}'` : m);
  content = content.replace(/canonical_reading_id:\s*['"]([0-9a-f]{8}-[0-9a-f-]{27})['"]/g,
    (m, u) => { const r = prefixMap[u.slice(0,8)]; if (r && r !== u) { fixCount++; return `canonical_reading_id: '${r}'`; } return m; });
  if (content !== orig) { fs.writeFileSync(path, content, 'utf8'); console.log(`Fixed ${fname}`); }
}
console.log(`UUID fixes applied: ${fixCount}`);

// Import all variants
const allVariants = [];
for (const fname of bucketFiles) {
  const path = `${dir}/${fname}`;
  if (!fs.existsSync(path)) continue;
  try {
    const mod = await import(`file:///${path.replace(/\\/g,'/')}`);
    allVariants.push(...(mod.variants || []));
    console.log(`Loaded ${fname}: ${mod.variants?.length} variants`);
  } catch (e) { console.error(`ERROR loading ${fname}:`, e.message); }
}
console.log(`Total to insert: ${allVariants.length}`);

// Insert
const { Client } = pg;
const client = new Client({ host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false } });
await client.connect();

function wc(text) { return text.trim().split(/\s+/).length; }
let ok = 0, fail = 0;
for (const v of allVariants) {
  try {
    await client.query(`
      INSERT INTO public.personalized_readings
        (canonical_reading_id,interest_bucket,title,body,word_count,cefr_level,
         target_vocabulary,tags,generation_batch,qa_word_count_ratio,qa_vocab_coverage,qa_passed,is_published)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)
      ON CONFLICT (canonical_reading_id,interest_bucket) DO UPDATE SET
        title=EXCLUDED.title,body=EXCLUDED.body,word_count=EXCLUDED.word_count,
        cefr_level=EXCLUDED.cefr_level,target_vocabulary=EXCLUDED.target_vocabulary,
        tags=EXCLUDED.tags,generation_batch=EXCLUDED.generation_batch,
        qa_word_count_ratio=EXCLUDED.qa_word_count_ratio,qa_vocab_coverage=EXCLUDED.qa_vocab_coverage,
        qa_passed=EXCLUDED.qa_passed,updated_at=now()
    `, [v.canonical_reading_id,v.interest_bucket,v.title,v.body,wc(v.body),
        v.cefr_level,v.target_vocabulary,v.tags,v.generation_batch,
        v.qa_word_count_ratio,v.qa_vocab_coverage,v.qa_passed]);
    ok++;
  } catch (e) {
    console.error(`FAIL: ${v.canonical_reading_id?.slice(0,8)} / ${v.interest_bucket}:`, e.message);
    fail++;
  }
}

const { rows: [{ count: total }] } = await client.query(`SELECT COUNT(*) FROM public.personalized_readings`);
const { rows: dist } = await client.query(`SELECT interest_bucket, COUNT(*) FROM public.personalized_readings WHERE cefr_level='A1' GROUP BY interest_bucket ORDER BY interest_bucket`);
const { rows: [qa] } = await client.query(`SELECT AVG(qa_word_count_ratio)::NUMERIC(4,2) r, AVG(qa_vocab_coverage)::NUMERIC(4,2) c, COUNT(*) FILTER (WHERE qa_passed=FALSE) f FROM public.personalized_readings WHERE cefr_level='A1'`);

console.log(`\nInserted: ${ok} | Failed: ${fail}`);
console.log(`Total in DB: ${total}`);
console.log('A1 distribution:', dist.map(r=>`${r.interest_bucket}:${r.count}`).join(', '));
console.log(`A1 QA: avg_ratio=${qa.r} avg_coverage=${qa.c} failures=${qa.f}`);
await client.end();
