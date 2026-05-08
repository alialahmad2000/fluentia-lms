// Phase A discovery — schema audit, find Lama, inventory, global counts, cron audit
require('dotenv').config();
const { Client } = require('pg');

const pg = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await pg.connect();

  // ── A1. Schema audit ──
  console.log('\n═══ A1. SCHEMA AUDIT ═══');
  const { rows: schemaCols } = await pg.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('writing_submissions','speaking_recordings','profiles','students','notifications','ai_usage')
    ORDER BY table_name, ordinal_position
  `);
  const byTable = {};
  for (const r of schemaCols) {
    if (!byTable[r.table_name]) byTable[r.table_name] = [];
    byTable[r.table_name].push(r);
  }
  for (const [tbl, cols] of Object.entries(byTable)) {
    console.log(`\n--- ${tbl} ---`);
    console.table(cols.map(c => ({ column: c.column_name, type: c.data_type, nullable: c.is_nullable })));
  }

  // Check for specific evaluation columns
  const evalCols = ['evaluation_status','evaluation_attempts','last_attempt_at','last_error',
                    'last_evaluation_attempt_at','last_evaluation_error','ai_feedback','ai_evaluation'];
  const gaps = { writing_submissions: [], speaking_recordings: [] };
  for (const tbl of ['writing_submissions','speaking_recordings']) {
    const existing = (byTable[tbl] || []).map(c => c.column_name);
    for (const col of evalCols) {
      if (!existing.includes(col)) gaps[tbl].push(col);
    }
    console.log(`\n${tbl} missing eval cols:`, gaps[tbl].length ? gaps[tbl].join(', ') : 'NONE');
    console.log(`${tbl} has eval cols:`, evalCols.filter(c => existing.includes(c)).join(', ') || 'NONE');
  }

  // ── A2. Find Lama ──
  console.log('\n═══ A2. FIND LAMA ═══');
  const { rows: lamaRows } = await pg.query(`
    SELECT p.id, p.full_name, p.email, s.academic_level, s.group_id, p.created_at
    FROM profiles p
    LEFT JOIN students s ON s.id = p.id
    WHERE p.full_name ILIKE '%لم%' OR p.full_name ILIKE '%lam%' OR p.email ILIKE '%lam%'
    ORDER BY p.created_at DESC
  `);
  console.table(lamaRows);

  // ── A3. Lama's stuck items ──
  if (lamaRows.length > 0) {
    for (const lama of lamaRows) {
      console.log(`\n═══ A3. LAMA: ${lama.full_name} (${lama.email}) ID=${lama.id} ═══`);

      const { rows: writing } = await pg.query(`
        SELECT id, unit_id, status,
               ai_feedback IS NOT NULL AS has_feedback,
               evaluation_status, evaluation_attempts, last_evaluation_error,
               LENGTH(content::text) AS content_chars, submitted_at, updated_at
        FROM writing_submissions
        WHERE student_id = $1
        ORDER BY submitted_at DESC
      `, [lama.id]);
      console.log(`Writing submissions (${writing.length} total):`);
      console.table(writing);

      const { rows: speaking } = await pg.query(`
        SELECT id, unit_id, audio_path IS NOT NULL AS has_path,
               ai_evaluation IS NOT NULL AS has_eval,
               evaluation_status, evaluation_attempts, last_error AS last_evaluation_error,
               created_at
        FROM speaking_recordings
        WHERE student_id = $1
        ORDER BY created_at DESC
      `, [lama.id]);
      console.log(`Speaking recordings (${speaking.length} total):`);
      console.table(speaking);

      const writingNoFeedback = writing.filter(r => !r.has_feedback).length;
      const speakingNoEval = speaking.filter(r => !r.has_eval).length;
      console.log(`\nLama writing WITHOUT feedback: ${writingNoFeedback}/${writing.length}`);
      console.log(`Lama speaking WITHOUT eval: ${speakingNoEval}/${speaking.length}`);
    }
  }

  // ── A4. Global stuck inventory ──
  console.log('\n═══ A4. GLOBAL STUCK (last 90d) ═══');
  const { rows: writingGlobal } = await pg.query(`
    SELECT COUNT(*) AS total_writing,
           COUNT(*) FILTER (WHERE ai_feedback IS NULL) AS without_feedback,
           COUNT(DISTINCT student_id) FILTER (WHERE ai_feedback IS NULL) AS affected_students
    FROM writing_submissions
    WHERE submitted_at >= NOW() - INTERVAL '90 days'
  `);
  console.log('Writing:'); console.table(writingGlobal);

  const { rows: speakingGlobal } = await pg.query(`
    SELECT COUNT(*) AS total_speaking,
           COUNT(*) FILTER (WHERE ai_evaluation IS NULL) AS without_eval,
           COUNT(DISTINCT student_id) FILTER (WHERE ai_evaluation IS NULL) AS affected_students
    FROM speaking_recordings
    WHERE created_at >= NOW() - INTERVAL '90 days'
  `);
  console.log('Speaking:'); console.table(speakingGlobal);

  // ── A6. Cron audit ──
  console.log('\n═══ A6. CRON JOBS ═══');
  const { rows: cronJobs } = await pg.query(`
    SELECT jobname, schedule, active
    FROM cron.job
    WHERE jobname ILIKE '%sweep%' OR jobname ILIKE '%eval%' OR jobname ILIKE '%health%'
    ORDER BY jobname
  `);
  console.table(cronJobs);

  // ── Speaking score variance ──
  console.log('\n═══ SPEAKING SCORE VARIANCE ═══');
  const { rows: variance } = await pg.query(`
    SELECT
      ROUND(STDDEV((ai_evaluation->>'overall_score')::numeric)::numeric, 2) AS stddev,
      ROUND(AVG((ai_evaluation->>'overall_score')::numeric)::numeric, 2) AS avg,
      COUNT(*) AS sample_size,
      array_agg((ai_evaluation->>'overall_score')::numeric ORDER BY created_at DESC) AS scores
    FROM speaking_recordings
    WHERE ai_evaluation IS NOT NULL
      AND created_at >= NOW() - INTERVAL '14 days'
  `);
  console.table(variance);

  await pg.end();
  console.log('\n═══ DISCOVERY COMPLETE ═══');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
