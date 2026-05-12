import pg from 'pg';
import { variants as medical } from './preA1-medical.js';

// Check for other bucket files
let sports = [], business = [], tech = [], travel_food = [], islamic = [], fashion_beauty = [], family = [];
try { ({ variants: business } = await import('./preA1-business.js')); } catch {}
try { ({ variants: tech } = await import('./preA1-tech.js')); } catch {}
try { ({ variants: sports } = await import('./preA1-sports.js')); } catch {}
try { ({ variants: travel_food } = await import('./preA1-travel-food.js')); } catch {}
try { ({ variants: islamic } = await import('./preA1-islamic.js')); } catch {}
try { ({ variants: fashion_beauty } = await import('./preA1-fashion-beauty.js')); } catch {}
try { ({ variants: family } = await import('./preA1-family.js')); } catch {}

const allVariants = [...medical, ...business, ...tech, ...sports, ...travel_food, ...islamic, ...fashion_beauty, ...family];
console.log(`Total variants to insert: ${allVariants.length}`);

const { Client } = pg;
const client = new Client({ host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false } });
await client.connect();

let ok = 0, fail = 0;
function wordCount(text) { return text.trim().split(/\s+/).length; }

for (const v of allVariants) {
  const wc = wordCount(v.body);
  try {
    await client.query(`
      INSERT INTO public.personalized_readings
        (canonical_reading_id, interest_bucket, title, body, word_count, cefr_level,
         target_vocabulary, tags, generation_batch, qa_word_count_ratio, qa_vocab_coverage, qa_passed, is_published)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)
      ON CONFLICT (canonical_reading_id, interest_bucket) DO UPDATE SET
        title=EXCLUDED.title, body=EXCLUDED.body, word_count=EXCLUDED.word_count,
        cefr_level=EXCLUDED.cefr_level, target_vocabulary=EXCLUDED.target_vocabulary,
        tags=EXCLUDED.tags, generation_batch=EXCLUDED.generation_batch,
        qa_word_count_ratio=EXCLUDED.qa_word_count_ratio, qa_vocab_coverage=EXCLUDED.qa_vocab_coverage,
        qa_passed=EXCLUDED.qa_passed, updated_at=now()
    `, [v.canonical_reading_id, v.interest_bucket, v.title, v.body, wc,
        v.cefr_level, v.target_vocabulary, v.tags, v.generation_batch,
        v.qa_word_count_ratio, v.qa_vocab_coverage, v.qa_passed]);
    ok++;
  } catch(e) {
    console.error(`FAIL: ${v.canonical_reading_id} / ${v.interest_bucket}:`, e.message);
    fail++;
  }
}

// Verify
const { rows: [{ count: total }] } = await client.query(`SELECT COUNT(*) FROM public.personalized_readings`);
const { rows: dist } = await client.query(`SELECT interest_bucket, COUNT(*) FROM public.personalized_readings WHERE cefr_level='Pre-A1' GROUP BY interest_bucket ORDER BY interest_bucket`);
console.log(`\nInserted: ${ok} | Failed: ${fail}`);
console.log(`Total in DB: ${total}`);
console.log('Pre-A1 distribution:', dist.map(r=>`${r.interest_bucket}:${r.count}`).join(', '));
await client.end();
