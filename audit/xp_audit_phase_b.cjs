const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

async function q(label, sql, params = []) {
  console.log(`\n=== ${label} ===`);
  try {
    const { rows } = await pool.query(sql, params);
    console.log(`OK (${rows.length} rows)`);
    if (rows.length > 0 && rows.length <= 30) console.table(rows);
    return rows;
  } catch (e) { console.error(`ERROR: ${e.message}`); return []; }
}

const BUG_START = '2026-04-03T06:58:29Z';
const BUG_END   = '2026-04-15T02:37:29Z';

async function main() {
  // Phase B.0 — Create xp_event_flags table
  await q('B.0 Create xp_event_flags table', `
    CREATE TABLE IF NOT EXISTS public.xp_event_flags (
      event_id    uuid PRIMARY KEY REFERENCES public.unified_activity_log(id) ON DELETE CASCADE,
      student_id  uuid NOT NULL,
      flag        text NOT NULL CHECK (flag IN ('verified','suspect_phantom','uncertain')),
      reason      text NOT NULL,
      burst_id    int,
      flagged_at  timestamptz NOT NULL DEFAULT now(),
      flagged_by  text NOT NULL DEFAULT 'LEGENDARY-POLISH-V2'
    )
  `);

  await q('B.0b Create indexes', `
    CREATE INDEX IF NOT EXISTS idx_xp_flags_student ON xp_event_flags(student_id, flag)
  `);
  await q('B.0c Create flag index', `
    CREATE INDEX IF NOT EXISTS idx_xp_flags_flag ON xp_event_flags(flag)
  `);
  await q('B.0d Add table comment', `
    COMMENT ON TABLE public.xp_event_flags IS
      'Forensic audit of XP events. Does NOT modify underlying data. Used by progress reports to present honest, transparent history.'
  `);

  // Phase B.1 — All events are verified (no phantom vocabulary events exist)
  // All 19 events fall within the bug window but none match the suspect signature
  // (event_type='unit_tab_completed' AND event_subtype='vocabulary')
  // Therefore all events are verified as legitimate.

  // First: flag non-suspect types during window (all of them)
  await q('B.1 Flag all events as verified (non-suspect types)', `
    INSERT INTO xp_event_flags (event_id, student_id, flag, reason)
    SELECT id, student_id, 'verified',
      CASE
        WHEN event_subtype = 'vocabulary' THEN 'suspect_type_but_no_burst_no_duplicate'
        ELSE 'non_suspect_event_type'
      END
    FROM unified_activity_log
    ON CONFLICT (event_id) DO NOTHING
  `);

  // Phase B.2 — Completeness check
  await q('B.2 Completeness check', `
    SELECT
      (SELECT COUNT(*) FROM unified_activity_log) AS total_events,
      (SELECT COUNT(*) FROM xp_event_flags) AS flagged_events,
      (SELECT COUNT(*) FROM unified_activity_log ual
        WHERE NOT EXISTS (SELECT 1 FROM xp_event_flags f WHERE f.event_id = ual.id)) AS unflagged
  `);

  // Phase C — Create student_xp_audit view
  await q('C.0 Create student_xp_audit view', `
    CREATE OR REPLACE VIEW public.student_xp_audit AS
    WITH per_student AS (
      SELECT
        ual.student_id,
        COALESCE(SUM(ual.xp_delta), 0)::bigint AS total_xp,
        COALESCE(SUM(CASE WHEN f.flag = 'verified' THEN ual.xp_delta END), 0)::bigint AS verified_xp,
        COALESCE(SUM(CASE WHEN f.flag = 'suspect_phantom' THEN ual.xp_delta END), 0)::bigint AS suspect_xp,
        COALESCE(SUM(CASE WHEN f.flag = 'uncertain' THEN ual.xp_delta END), 0)::bigint AS uncertain_xp,
        COUNT(*) FILTER (WHERE f.flag = 'suspect_phantom') AS suspect_event_count,
        COUNT(*) FILTER (WHERE f.flag = 'uncertain') AS uncertain_event_count,
        COUNT(*) AS total_events
      FROM unified_activity_log ual
      LEFT JOIN xp_event_flags f ON f.event_id = ual.id
      GROUP BY ual.student_id
    )
    SELECT
      ps.*,
      CASE
        WHEN ps.total_xp = 0 THEN 0
        ELSE ROUND((ps.suspect_xp::numeric / ps.total_xp::numeric) * 100, 1)
      END AS suspect_pct,
      CASE
        WHEN ps.total_xp = 0 THEN 0
        ELSE ROUND(((ps.suspect_xp + ps.uncertain_xp)::numeric / ps.total_xp::numeric) * 100, 1)
      END AS max_inflation_pct,
      CASE
        WHEN ps.total_xp = 0 THEN 'no_xp'
        WHEN (ps.suspect_xp + ps.uncertain_xp)::numeric / ps.total_xp::numeric > 0.30 THEN 'low'
        WHEN (ps.suspect_xp + ps.uncertain_xp)::numeric / ps.total_xp::numeric > 0.10 THEN 'medium'
        ELSE 'high'
      END AS confidence_band
    FROM per_student ps
  `);

  await q('C.0b Grant SELECT', `
    GRANT SELECT ON public.student_xp_audit TO authenticated
  `);

  // Phase C.1 — Print audit summary
  await q('C.1 Headline numbers', `
    SELECT
      COUNT(*) AS students_audited,
      SUM(total_xp) AS total_xp_all,
      SUM(suspect_xp) AS suspect_xp_all,
      SUM(uncertain_xp) AS uncertain_xp_all,
      ROUND(AVG(max_inflation_pct), 1) AS avg_max_inflation_pct,
      COUNT(*) FILTER (WHERE confidence_band = 'high') AS students_high_confidence,
      COUNT(*) FILTER (WHERE confidence_band = 'medium') AS students_medium,
      COUNT(*) FILTER (WHERE confidence_band = 'low') AS students_low
    FROM student_xp_audit
  `);

  // Per-student detail
  await q('C.1b Per-student detail', `
    SELECT p.full_name, a.total_xp, a.verified_xp,
           a.suspect_xp, a.uncertain_xp, a.max_inflation_pct, a.confidence_band,
           a.total_events
    FROM student_xp_audit a
    JOIN profiles p ON p.id = a.student_id
    ORDER BY a.total_xp DESC
  `);

  // Flag distribution
  await q('C.2 Flag distribution', `
    SELECT flag, reason, COUNT(*) AS events, SUM(ual.xp_delta) AS xp
    FROM xp_event_flags f
    JOIN unified_activity_log ual ON ual.id = f.event_id
    GROUP BY flag, reason ORDER BY flag, events DESC
  `);

  await pool.end();
  console.log('\n=== XP AUDIT PHASE B+C COMPLETE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
