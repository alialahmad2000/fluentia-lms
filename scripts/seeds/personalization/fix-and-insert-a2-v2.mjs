/**
 * Fix apostrophe issues in titles, fix UUIDs, then insert A2 variants.
 */
import fs from 'fs'; import pg from 'pg';
const BASE = 'C:/Users/Dr. Ali/Desktop/fluentia-lms/scripts/seeds/personalization';
const realUUIDs = JSON.parse(fs.readFileSync(`${BASE}/a2-uuids.json`, 'utf8'));
const prefixMap = {};
for (const u of realUUIDs) prefixMap[u.slice(0,8)] = u;

const buckets = ['medical','business','tech','sports','travel-food','islamic','fashion-beauty','family'];

// Fix apostrophes and UUIDs in each file
let fixCount = 0;
for (const b of buckets) {
  const path = `${BASE}/a2-${b}.js`;
  if (!fs.existsSync(path)) { console.log(`MISSING: a2-${b}.js`); continue; }
  let c = fs.readFileSync(path,'utf8'), o = c;
  // Fix title apostrophes: title: '...it's...' -> double-quoted
  c = c.replace(/^(\s+title:\s*)'(.+)'(,\s*)$/gm, (match, prefix, inner, suffix) => {
    if (inner.includes("'")) return `${prefix}"${inner.replace(/"/g, '\\"')}"${suffix}`;
    return match;
  });
  // Fix UUIDs
  c = c.replace(/canonical_reading_id:\s*['"]([0-9a-f]{8})['"]/g,(m,s)=>prefixMap[s]?`canonical_reading_id: '${prefixMap[s]}'`:m);
  c = c.replace(/canonical_reading_id:\s*['"]([0-9a-f]{8}-[0-9a-f-]{27})['"]/g,(m,u)=>{const r=prefixMap[u.slice(0,8)];if(r&&r!==u){fixCount++;return`canonical_reading_id: '${r}'`;}return m;});
  if(c!==o){fs.writeFileSync(path,c,'utf8');console.log(`Fixed a2-${b}.js`);}
}
console.log(`UUID fixes: ${fixCount}`);

// Load all variants
const all = [];
for (const b of buckets) {
  const path = `${BASE}/a2-${b}.js`;
  if (!fs.existsSync(path)) continue;
  try {
    const mod = await import(`file:///C:/Users/Dr.%20Ali/Desktop/fluentia-lms/scripts/seeds/personalization/a2-${b}.js`);
    all.push(...(mod.variants||[]));
    console.log(`Loaded a2-${b}.js: ${mod.variants?.length}`);
  } catch(e) { console.error(`ERROR a2-${b}:`,e.message.slice(0,120)); }
}
console.log(`Total: ${all.length}`);

const {Client}=pg;
const client=new Client({host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
await client.connect();
function wc(t){return t.trim().split(/\s+/).length;}
let ok=0,fail=0;
for(const v of all){
  try{await client.query(`INSERT INTO public.personalized_readings(canonical_reading_id,interest_bucket,title,body,word_count,cefr_level,target_vocabulary,tags,generation_batch,qa_word_count_ratio,qa_vocab_coverage,qa_passed,is_published)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)ON CONFLICT(canonical_reading_id,interest_bucket)DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,word_count=EXCLUDED.word_count,cefr_level=EXCLUDED.cefr_level,target_vocabulary=EXCLUDED.target_vocabulary,tags=EXCLUDED.tags,generation_batch=EXCLUDED.generation_batch,qa_word_count_ratio=EXCLUDED.qa_word_count_ratio,qa_vocab_coverage=EXCLUDED.qa_vocab_coverage,qa_passed=EXCLUDED.qa_passed,updated_at=now()`,
  [v.canonical_reading_id,v.interest_bucket,v.title,v.body,wc(v.body),v.cefr_level,v.target_vocabulary,v.tags,v.generation_batch,v.qa_word_count_ratio,v.qa_vocab_coverage,v.qa_passed]);ok++;}
  catch(e){console.error(`FAIL ${v.canonical_reading_id?.slice(0,8)}/${v.interest_bucket}:`,e.message.slice(0,80));fail++;}
}
const {rows:[{count:total}]}=await client.query(`SELECT COUNT(*) FROM public.personalized_readings`);
const {rows:dist}=await client.query(`SELECT interest_bucket,COUNT(*) FROM public.personalized_readings WHERE cefr_level='A2' GROUP BY interest_bucket ORDER BY interest_bucket`);
const {rows:[qa]}=await client.query(`SELECT AVG(qa_word_count_ratio)::NUMERIC(4,2) r,AVG(qa_vocab_coverage)::NUMERIC(4,2) c,COUNT(*) FILTER(WHERE qa_passed=FALSE) f FROM public.personalized_readings WHERE cefr_level='A2'`);
console.log(`OK:${ok} FAIL:${fail} | Total in DB: ${total}`);
console.log('A2:',dist.map(r=>`${r.interest_bucket}:${r.count}`).join(', '));
console.log(`QA: ratio=${qa.r} coverage=${qa.c} failures=${qa.f}`);
await client.end();
