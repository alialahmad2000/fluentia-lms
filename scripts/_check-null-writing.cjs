require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();

  // The 2 null evaluation_status writing rows
  const {rows} = await pg.query(`
    SELECT scp.id, scp.student_id, scp.unit_id, scp.section_type,
           scp.status, scp.score, scp.ai_feedback IS NOT NULL AS has_feedback,
           scp.evaluation_status, scp.evaluation_attempts,
           scp.answers IS NOT NULL AS has_answers,
           LEFT(scp.answers::text, 100) AS answers_preview,
           scp.created_at,
           p.full_name, p.email
    FROM student_curriculum_progress scp
    JOIN profiles p ON p.id = scp.student_id
    WHERE scp.section_type = 'writing' AND scp.evaluation_status IS NULL
  `);
  console.log('=== Null evaluation_status writing rows ==='); console.table(rows);

  // Also check notification enum for writing_evaluated
  const {rows: enumVals} = await pg.query(`
    SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname LIKE '%notification%type%'
    ORDER BY e.enumsortorder
  `);
  console.log('\nNotification type enum:');
  console.log(enumVals.map(r=>r.enumlabel).join(', '));
  const hasWritingEvaluated = enumVals.some(r=>r.enumlabel==='writing_evaluated');
  console.log('writing_evaluated in enum:', hasWritingEvaluated ? 'YES' : 'NO — needs adding');

  // Speaking score variance
  const {rows: variance} = await pg.query(`
    SELECT ROUND(STDDEV((ai_evaluation->>'overall_score')::numeric)::numeric,2) AS stddev,
           ROUND(AVG((ai_evaluation->>'overall_score')::numeric)::numeric,2) AS avg,
           COUNT(*) AS sample_size
    FROM speaking_recordings
    WHERE ai_evaluation IS NOT NULL AND created_at >= NOW() - INTERVAL '14 days'
  `);
  console.log('\n=== Speaking score variance (last 14d) ==='); console.table(variance);

  await pg.end();
})().catch(e=>{console.error(e.message);process.exit(1);});
