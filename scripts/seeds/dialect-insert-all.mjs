import pg from 'pg';
import { batch as preA1 } from './dialect-batch-pre-a1.js';
import { batch as a1 } from './dialect-batch-a1.js';
import { batch as a2 } from './dialect-batch-a2.js';
import { batch as b1 } from './dialect-batch-b1.js';
import { batch as b2 } from './dialect-batch-b2.js';
import { batch as c1 } from './dialect-batch-c1.js';

const { Client } = pg;
const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432,
  database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false },
});
await client.connect();

const allRows = [...preA1, ...a1, ...a2, ...b1, ...b2, ...c1];
console.log(`Total rows to insert: ${allRows.length}`);

function wordCount(text) { return text.trim().split(/\s+/).length; }

let ok = 0, fail = 0;
for (const row of allRows) {
  const wc = wordCount(row.explanation_najdi);
  try {
    await client.query(`
      INSERT INTO public.dialect_explanations
        (grammar_lesson_id, concept_title, explanation_najdi, cefr_level, tags, word_count, is_published)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      ON CONFLICT (grammar_lesson_id) DO UPDATE SET
        concept_title = EXCLUDED.concept_title,
        explanation_najdi = EXCLUDED.explanation_najdi,
        cefr_level = EXCLUDED.cefr_level,
        tags = EXCLUDED.tags,
        word_count = EXCLUDED.word_count,
        updated_at = now()
    `, [row.grammar_lesson_id, row.concept_title, row.explanation_najdi, row.cefr_level, row.tags, wc]);
    console.log(`✅ ${row.cefr_level} | ${row.concept_title.split('—')[0].trim()} | words: ${wc}`);
    ok++;
  } catch (e) {
    console.error(`❌ FAILED: ${row.grammar_lesson_id}`, e.message);
    fail++;
  }
}

// Verification queries
const { rows: [{ count: total }] } = await client.query(`SELECT COUNT(*) FROM public.dialect_explanations`);
const { rows: dist } = await client.query(`SELECT cefr_level, COUNT(*) FROM public.dialect_explanations GROUP BY cefr_level ORDER BY cefr_level`);
const { rows: [wcs] } = await client.query(`SELECT MIN(word_count) AS mn, AVG(word_count)::INT AS avg, MAX(word_count) AS mx, COUNT(*) FILTER (WHERE word_count < 150) AS too_short, COUNT(*) FILTER (WHERE word_count > 450) AS too_long FROM public.dialect_explanations`);
const { rows: [{ count: pub }] } = await client.query(`SELECT COUNT(*) FROM public.dialect_explanations WHERE is_published = TRUE`);
const { rows: [{ count: orphans }] } = await client.query(`SELECT COUNT(*) FROM public.dialect_explanations de LEFT JOIN public.curriculum_grammar g ON g.id = de.grammar_lesson_id WHERE g.id IS NULL`);

console.log(`\n═══════════════════ VERIFICATION ═══════════════════`);
console.log(`Inserted OK: ${ok} | Failed: ${fail}`);
console.log(`Total in DB: ${total}`);
console.log(`Published: ${pub}`);
console.log(`Word count — min: ${wcs.mn}, avg: ${wcs.avg}, max: ${wcs.mx}`);
console.log(`Too short (<150): ${wcs.too_short} | Too long (>450): ${wcs.too_long}`);
console.log(`FK orphans: ${orphans}`);
console.log(`Distribution:`, dist.map(r => `${r.cefr_level}: ${r.count}`).join(', '));

await client.end();
