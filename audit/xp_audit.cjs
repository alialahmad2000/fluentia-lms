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
    if (rows.length === 0) { console.log('(no rows)'); return rows; }
    console.table(rows);
    return rows;
  } catch (e) { console.error(`ERROR: ${e.message}`); return []; }
}

// Bug window:
// Introduced: 35247e5 — 2026-04-03 09:58:29 +0300 → 2026-04-03T06:58:29Z
// Fixed:      640fb7d — 2026-04-15 05:37:29 +0300 → 2026-04-15T02:37:29Z
const BUG_START = '2026-04-03T06:58:29Z';
const BUG_END   = '2026-04-15T02:37:29Z';

async function main() {
  // A.2 — All event types in the suspect window
  await q('A.2 Event distribution during bug window', `
    SELECT event_type, event_subtype,
           COUNT(*) AS events,
           COUNT(DISTINCT student_id) AS distinct_students,
           SUM(xp_delta) AS total_xp,
           MIN(occurred_at) AS first_seen,
           MAX(occurred_at) AS last_seen
    FROM unified_activity_log
    WHERE occurred_at >= $1 AND occurred_at < $2
    GROUP BY event_type, event_subtype
    ORDER BY events DESC
  `, [BUG_START, BUG_END]);

  // A.2b — Full event distribution (all time)
  await q('A.2b ALL event types (all time)', `
    SELECT event_type, event_subtype,
           COUNT(*) AS events,
           COUNT(DISTINCT student_id) AS distinct_students,
           SUM(xp_delta) AS total_xp
    FROM unified_activity_log
    GROUP BY event_type, event_subtype
    ORDER BY events DESC
  `);

  // A.3 — Suspect events: unit_tab_completed + vocabulary
  await q('A.3 Suspect signature events in window', `
    SELECT student_id, ref_id, xp_delta, occurred_at, metadata
    FROM unified_activity_log
    WHERE event_type = 'unit_tab_completed'
      AND event_subtype = 'vocabulary'
      AND occurred_at >= $1 AND occurred_at < $2
    ORDER BY student_id, occurred_at
  `, [BUG_START, BUG_END]);

  // A.4 — Burst detection
  await q('A.4 Burst detection (3+ events in 60s)', `
    WITH events AS (
      SELECT id, student_id, occurred_at, xp_delta,
             LAG(occurred_at) OVER (PARTITION BY student_id ORDER BY occurred_at) AS prev_at
      FROM unified_activity_log
      WHERE occurred_at >= $1 AND occurred_at < $2
        AND event_type = 'unit_tab_completed'
        AND event_subtype = 'vocabulary'
        AND xp_delta > 0
    ),
    gaps AS (
      SELECT *, EXTRACT(EPOCH FROM (occurred_at - prev_at)) AS gap_s
      FROM events
    ),
    bursts AS (
      SELECT id, student_id, occurred_at, xp_delta,
             SUM(CASE WHEN gap_s IS NULL OR gap_s > 60 THEN 1 ELSE 0 END)
               OVER (PARTITION BY student_id ORDER BY occurred_at) AS burst_id
      FROM gaps
    ),
    burst_counts AS (
      SELECT student_id, burst_id, COUNT(*) AS n
      FROM bursts GROUP BY student_id, burst_id
    )
    SELECT b.student_id, b.burst_id, bc.n AS events_in_burst,
           MIN(b.occurred_at) AS burst_start, SUM(b.xp_delta) AS burst_xp
    FROM bursts b
    JOIN burst_counts bc ON bc.student_id = b.student_id AND bc.burst_id = b.burst_id
    WHERE bc.n >= 3
    GROUP BY b.student_id, b.burst_id, bc.n
    ORDER BY b.student_id, burst_start
  `, [BUG_START, BUG_END]);

  // A.5 — Total events in DB
  await q('A.5 Total events in DB', `
    SELECT COUNT(*) AS total_events, SUM(xp_delta) AS total_xp FROM unified_activity_log
  `);

  // A.6 — Events before / during / after window
  await q('A.6 Events by window position', `
    SELECT
      COUNT(*) FILTER (WHERE occurred_at < $1) AS before_window,
      COUNT(*) FILTER (WHERE occurred_at >= $1 AND occurred_at < $2) AS during_window,
      COUNT(*) FILTER (WHERE occurred_at >= $2) AS after_window,
      SUM(xp_delta) FILTER (WHERE occurred_at < $1) AS xp_before,
      SUM(xp_delta) FILTER (WHERE occurred_at >= $1 AND occurred_at < $2) AS xp_during,
      SUM(xp_delta) FILTER (WHERE occurred_at >= $2) AS xp_after
    FROM unified_activity_log
  `, [BUG_START, BUG_END]);

  // A.7 — Duplicate siblings check (same student+ref_id within 10s)
  await q('A.7 Duplicate siblings (same student+ref_id within 10s)', `
    SELECT a.id, a.student_id, a.ref_id, a.xp_delta, a.occurred_at
    FROM unified_activity_log a
    JOIN unified_activity_log b
      ON b.student_id = a.student_id
     AND b.ref_id = a.ref_id
     AND b.event_type = a.event_type
     AND b.event_subtype = a.event_subtype
     AND b.id <> a.id
     AND ABS(EXTRACT(EPOCH FROM (b.occurred_at - a.occurred_at))) <= 10
    WHERE a.occurred_at >= $1 AND a.occurred_at < $2
      AND a.event_type = 'unit_tab_completed'
      AND a.event_subtype = 'vocabulary'
      AND a.xp_delta > 0
    ORDER BY a.student_id, a.occurred_at
  `, [BUG_START, BUG_END]);

  // Check profiles table structure for student names
  await q('Profiles columns check', `
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name LIKE '%name%'
    ORDER BY ordinal_position
  `);

  await pool.end();
  console.log('\n=== XP AUDIT PHASE A COMPLETE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
