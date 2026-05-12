import fs from 'fs'; import pg from 'pg';
const realUUIDs = [
  'a211d142-39ba-49f3-84e5-74edf7cc4007','23237846-d915-4a9a-a2c3-c8ce893b9a4a',
  'cf5f9afd-4da2-40e2-ace5-cc12d2b532f8','9ec0cfb8-fa46-4ab9-a2ae-c03c6f630bd3',
  '193cf4e6-85d9-454d-8d45-c14e82f48022','9f81050e-8227-4b84-a2fd-c7e921be301c',
  '00e4371d-8351-4040-b9ee-523ce0393aa2','d8dc3031-f0d2-4497-bd24-36e7d8edad70',
  'b1a9f3c0-59fb-4f17-bb95-203f63438e48','19b2d071-2172-4c10-a979-63497295c42b',
  'e27dcd0e-527a-4d13-8010-aa5f01789c44','641ae79b-17fe-40fe-b622-5fe9f658ea75',
  '80c564e8-aed4-4d3c-840d-28be30448ae3','e48846c6-94f3-45a1-9461-8d39f79f2c55',
  'ebb4e37f-3e8e-4595-85f8-50813dab345e','5a42053f-4a4c-4245-96dc-2f71ffae615f',
  'd4f6b362-0e40-443d-8f4c-3d2b40f37661','7b39524c-7eda-47d0-97d1-66e237a179d1',
  '530b3b23-d8a2-4a8b-9e49-e0c13b614e0b','723df69f-7dc6-4e4a-8122-d56c91dbe9da',
  '1a044d4d-6cf5-401c-a3e1-704c932f5b1d','9ece9e74-4a31-4e06-ad44-97457d8e8c6a',
  'fb29df9e-814a-4367-81ee-1c809afd0c68','03c9655c-b88f-4377-b5a1-3aa283205bdd',
];
const LEVEL = 'A2';
const buckets = ['medical','business','tech','sports','travel-food','islamic','fashion-beauty','family'];
const prefixMap = {};
for (const u of realUUIDs) prefixMap[u.slice(0,8)] = u;
const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1');
let fixCount = 0;
for (const b of buckets) {
  const path = `${dir}/a2-${b}.js`;
  if (!fs.existsSync(path)) continue;
  let c = fs.readFileSync(path,'utf8'), o = c;
  c = c.replace(/canonical_reading_id:\s*['"]([0-9a-f]{8})['"]/g,(m,s)=>prefixMap[s]?`canonical_reading_id: '${prefixMap[s]}'`:m);
  c = c.replace(/canonical_reading_id:\s*['"]([0-9a-f]{8}-[0-9a-f-]{27})['"]/g,(m,u)=>{const r=prefixMap[u.slice(0,8)];if(r&&r!==u){fixCount++;return`canonical_reading_id: '${r}'`;}return m;});
  if(c!==o){fs.writeFileSync(path,c,'utf8');console.log(`Fixed ${b}`);}
}
console.log(`UUID fixes: ${fixCount}`);
const all = [];
for (const b of buckets) {
  const path = `${dir}/a2-${b}.js`;
  if (!fs.existsSync(path)) { console.log(`MISSING: a2-${b}.js`); continue; }
  try { const m = await import(`file:///${path.replace(/\\/g,'/')}`); all.push(...(m.variants||[])); console.log(`Loaded a2-${b}.js: ${m.variants?.length}`); } catch(e) { console.error(`ERROR a2-${b}:`,e.message); }
}
console.log(`Total: ${all.length}`);
const {Client}=pg; const client=new Client({host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
await client.connect();
function wc(t){return t.trim().split(/\s+/).length;}
let ok=0,fail=0;
for(const v of all){
  try{await client.query(`INSERT INTO public.personalized_readings(canonical_reading_id,interest_bucket,title,body,word_count,cefr_level,target_vocabulary,tags,generation_batch,qa_word_count_ratio,qa_vocab_coverage,qa_passed,is_published)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)ON CONFLICT(canonical_reading_id,interest_bucket)DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,word_count=EXCLUDED.word_count,cefr_level=EXCLUDED.cefr_level,target_vocabulary=EXCLUDED.target_vocabulary,tags=EXCLUDED.tags,generation_batch=EXCLUDED.generation_batch,qa_word_count_ratio=EXCLUDED.qa_word_count_ratio,qa_vocab_coverage=EXCLUDED.qa_vocab_coverage,qa_passed=EXCLUDED.qa_passed,updated_at=now()`,
  [v.canonical_reading_id,v.interest_bucket,v.title,v.body,wc(v.body),v.cefr_level,v.target_vocabulary,v.tags,v.generation_batch,v.qa_word_count_ratio,v.qa_vocab_coverage,v.qa_passed]);ok++;}
  catch(e){console.error(`FAIL ${v.canonical_reading_id?.slice(0,8)}/${v.interest_bucket}:`,e.message);fail++;}
}
const {rows:[{count:total}]}=await client.query(`SELECT COUNT(*) FROM public.personalized_readings`);
const {rows:dist}=await client.query(`SELECT interest_bucket,COUNT(*) FROM public.personalized_readings WHERE cefr_level='${LEVEL}' GROUP BY interest_bucket ORDER BY interest_bucket`);
console.log(`OK:${ok} FAIL:${fail} Total:${total}\n${LEVEL}:`,dist.map(r=>`${r.interest_bucket}:${r.count}`).join(', '));
await client.end();
