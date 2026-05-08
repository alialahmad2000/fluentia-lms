require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const pg = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await pg.connect();

  // 1. brief_questions on curriculum_units
  const { rows: bq } = await pg.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE brief_questions IS NOT NULL AND brief_questions::text != '[]') AS with_questions
    FROM curriculum_units
  `);
  console.log('brief_questions check:'); console.table(bq);
  if (bq[0].total !== bq[0].with_questions) {
    console.error(`STOP: only ${bq[0].with_questions}/${bq[0].total} units have brief_questions`);
    process.exit(1);
  }
  console.log('✅ All', bq[0].total, 'units have brief_questions\n');

  // 2. ai_student_profiles — check columns
  const { rows: aspCols } = await pg.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_student_profiles'
    ORDER BY ordinal_position`);
  const colNames = aspCols.map(r => r.column_name);
  console.log('ai_student_profiles columns:', colNames.join(', '));
  const hasIsLatest = colNames.includes('is_latest');
  console.log('has is_latest column:', hasIsLatest, '(will use generated_at DESC instead if false)');

  const { rows: aspCount } = await pg.query(`
    SELECT COUNT(*) AS total, COUNT(DISTINCT student_id) AS distinct_students
    FROM ai_student_profiles`);
  console.log('ai_student_profiles rows:', aspCount[0].total, '| distinct students:', aspCount[0].distinct_students);

  // 3. Active students
  const { rows: activeStudents } = await pg.query(`
    SELECT s.id, p.full_name, p.email, s.status
    FROM students s JOIN profiles p ON p.id = s.id
    WHERE s.status = 'active' AND s.deleted_at IS NULL
    ORDER BY p.created_at
  `);
  console.log(`\nActive students: ${activeStudents.length}`);
  console.table(activeStudents.map(r => ({ id: r.id, name: r.full_name, email: r.email })));

  // 4. generate-ai-student-profile exists?
  const fnPath = 'C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/generate-ai-student-profile/index.ts';
  const fnExists = fs.existsSync(fnPath);
  console.log('\ngenerate-ai-student-profile edge function:', fnExists ? '✅ EXISTS' : '❌ MISSING');
  if (!fnExists) { console.error('STOP: function missing'); process.exit(1); }

  // Peek at its input shape
  const fnContent = fs.readFileSync(fnPath, 'utf8');
  const acceptsAll = fnContent.includes('"all"') || fnContent.includes("'all'") || fnContent.includes('student_id = \'all\'');
  console.log('Accepts student_id="all":', acceptsAll);
  // Print first 300 chars for input parsing
  console.log('Function start:\n', fnContent.slice(0, 400));

  await pg.end();
  console.log('\n✅ Phase A verification complete — proceed to Phase B');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
