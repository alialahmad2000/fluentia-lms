require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();

  // Storage buckets
  const {rows: buckets} = await pg.query(`
    SELECT id, name, public FROM storage.buckets`);
  console.log('Storage buckets:'); console.table(buckets);

  // speaking_practice_attempts already exists?
  const {rows: tbl} = await pg.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name='speaking_practice_attempts'`);
  console.log('speaking_practice_attempts exists:', tbl.length > 0 ? 'YES (skip migration)' : 'NO (need to create)');

  // ai_usage type enum values for context
  const {rows: usageTypes} = await pg.query(`
    SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='ai_usage_type' ORDER BY e.enumsortorder`);
  console.log('ai_usage_type enum:', usageTypes.map(r=>r.enumlabel).join(', '));

  // IELTS speaking files
  const ieltsFiles = [
    'src/pages/student/ielts',
    'supabase/functions/evaluate-ielts-speaking',
  ];
  for (const f of ieltsFiles) {
    const exists = fs.existsSync(`C:/Users/Dr. Ali/Desktop/fluentia-lms/${f}`);
    console.log(`${f}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  }

  // getSupportedMimeType in VoiceRecorder
  const vrContent = fs.readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/components/VoiceRecorder.jsx','utf8');
  const hasMimeHelper = vrContent.includes('getSupportedMimeType');
  console.log('\nVoiceRecorder.jsx has getSupportedMimeType helper:', hasMimeHelper ? 'YES (can reuse)' : 'NO');

  // Check RecordRTC usage pattern (for Practice Mode recording)
  const hasRecordRTC = vrContent.includes('RecordRTC');
  console.log('VoiceRecorder uses RecordRTC:', hasRecordRTC);

  // speaking_recordings has audio_path (service role download pattern)
  const {rows: srCols} = await pg.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='speaking_recordings'
    AND column_name IN ('audio_path','audio_url','audio_format')`);
  console.log('speaking_recordings key columns:', srCols.map(r=>r.column_name));

  await pg.end();
  console.log('\n✅ Phase A complete');
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
