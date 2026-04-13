const { Client } = require('pg')

const client = new Client({
  host: 'db.nmjexpuycmqcxuxljier.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
})

const TEST_STUDENT = 'cad66f17-4471-4e64-acce-aa2836e1a814'

const SQL = `
-- ============================================================
-- Phase 1: Drop old single-arg functions, create date-aware ones
-- ============================================================

-- 1.1 Drop old get_student_today_summary
DROP FUNCTION IF EXISTS public.get_student_today_summary(UUID);

-- 1.2 Create get_student_day_summary(UUID, DATE)
CREATE OR REPLACE FUNCTION public.get_student_day_summary(
  p_student_id UUID,
  p_date DATE DEFAULT NULL
)
RETURNS TABLE (
  for_date DATE,
  is_today BOOLEAN,
  xp_amount INT,
  activities_count INT,
  units_touched_count INT,
  units_touched_names TEXT[],
  vocab_added INT,
  streak_days INT,
  daily_goal_xp INT,
  daily_goal_pct INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_date DATE;
  v_today_riyadh DATE;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_today_riyadh := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_date := COALESCE(p_date, v_today_riyadh);

  IF v_date > v_today_riyadh THEN
    RAISE EXCEPTION 'Cannot query future dates';
  END IF;

  v_day_start := (v_date::timestamp AT TIME ZONE 'Asia/Riyadh');
  v_day_end   := ((v_date + INTERVAL '1 day')::timestamp AT TIME ZONE 'Asia/Riyadh');

  RETURN QUERY
  WITH day_xp AS (
    SELECT COALESCE(SUM(amount), 0)::INT AS xp_sum,
           COUNT(*)::INT AS act_count
    FROM public.xp_transactions
    WHERE student_id = p_student_id
      AND created_at >= v_day_start
      AND created_at <  v_day_end
  ),
  day_units AS (
    SELECT array_agg(DISTINCT cu.theme_ar) FILTER (WHERE cu.theme_ar IS NOT NULL) AS names,
           COUNT(DISTINCT cu.id)::INT AS cnt
    FROM public.student_curriculum_progress scp
    JOIN public.curriculum_units cu ON cu.id = scp.unit_id
    WHERE scp.student_id = p_student_id
      AND scp.updated_at >= v_day_start
      AND scp.updated_at <  v_day_end
  ),
  day_vocab AS (
    SELECT COUNT(*)::INT AS cnt
    FROM public.student_saved_words
    WHERE student_id = p_student_id
      AND created_at >= v_day_start
      AND created_at <  v_day_end
  ),
  streak AS (
    SELECT COALESCE(s.current_streak, 0)::INT AS days
    FROM public.students s WHERE s.id = p_student_id
  )
  SELECT
    v_date,
    (v_date = v_today_riyadh),
    tx.xp_sum,
    tx.act_count,
    COALESCE(tu.cnt, 0),
    COALESCE(tu.names, ARRAY[]::TEXT[]),
    tv.cnt,
    COALESCE(sk.days, 0),
    50 AS daily_goal_xp,
    LEAST(100, GREATEST(0, (tx.xp_sum * 100 / GREATEST(50, 1))))::INT
  FROM day_xp tx
  CROSS JOIN day_units tu
  CROSS JOIN day_vocab tv
  CROSS JOIN streak sk;
END $$;

GRANT EXECUTE ON FUNCTION public.get_student_day_summary(UUID, DATE) TO authenticated;

-- 1.3 Drop old get_student_week_summary(UUID) and create new with DATE param
DROP FUNCTION IF EXISTS public.get_student_week_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_student_week_summary(
  p_student_id UUID,
  p_week_start DATE DEFAULT NULL
)
RETURNS TABLE (
  week_start DATE,
  week_end DATE,
  is_current_week BOOLEAN,
  xp_week INT,
  xp_prev_week INT,
  comparison_pct INT,
  weekly_goal_xp INT,
  weekly_goal_pct INT,
  activities_by_type JSONB,
  units_completed_this_week JSONB,
  active_days_count INT,
  active_days_mask BOOLEAN[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_today_riyadh DATE;
  v_current_week_start DATE;
  v_week_start DATE;
  v_week_end DATE;
  v_week_start_ts TIMESTAMPTZ;
  v_week_end_ts TIMESTAMPTZ;
  v_prev_start_ts TIMESTAMPTZ;
  v_prev_end_ts TIMESTAMPTZ;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller AND role = 'admin')
  INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_today_riyadh := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_current_week_start := v_today_riyadh - EXTRACT(DOW FROM v_today_riyadh)::INT;
  v_week_start := COALESCE(p_week_start, v_current_week_start);

  -- Snap to Sunday if not already
  IF EXTRACT(DOW FROM v_week_start)::INT <> 0 THEN
    v_week_start := v_week_start - EXTRACT(DOW FROM v_week_start)::INT;
  END IF;

  IF v_week_start > v_current_week_start THEN
    RAISE EXCEPTION 'Cannot query future weeks';
  END IF;

  v_week_end       := v_week_start + 6;
  v_week_start_ts  := (v_week_start::timestamp AT TIME ZONE 'Asia/Riyadh');
  v_week_end_ts    := ((v_week_start + 7)::timestamp AT TIME ZONE 'Asia/Riyadh');
  v_prev_start_ts  := ((v_week_start - 7)::timestamp AT TIME ZONE 'Asia/Riyadh');
  v_prev_end_ts    := v_week_start_ts;

  RETURN QUERY
  WITH this_xp AS (
    SELECT COALESCE(SUM(amount), 0)::INT AS s
    FROM public.xp_transactions
    WHERE student_id = p_student_id
      AND created_at >= v_week_start_ts
      AND created_at <  v_week_end_ts
  ),
  prev_xp AS (
    SELECT COALESCE(SUM(amount), 0)::INT AS s
    FROM public.xp_transactions
    WHERE student_id = p_student_id
      AND created_at >= v_prev_start_ts
      AND created_at <  v_prev_end_ts
  ),
  by_type AS (
    SELECT COALESCE(jsonb_object_agg(skill, cnt), '{}'::jsonb) AS j FROM (
      SELECT
        CASE
          WHEN section_type = 'reading' THEN 'reading'
          WHEN section_type = 'grammar' THEN 'grammar'
          WHEN section_type IN ('vocabulary', 'vocabulary_exercise') THEN 'vocabulary'
          WHEN section_type = 'listening' THEN 'listening'
          WHEN section_type IN ('speaking', 'pronunciation') THEN 'speaking'
          WHEN section_type = 'writing' THEN 'writing'
          ELSE 'other'
        END AS skill,
        COUNT(*)::INT AS cnt
      FROM public.student_curriculum_progress
      WHERE student_id = p_student_id
        AND updated_at >= v_week_start_ts
        AND updated_at <  v_week_end_ts
        AND is_latest = TRUE
      GROUP BY skill
    ) g WHERE skill <> 'other'
  ),
  units_done AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'unit_id', sub.unit_id,
        'theme_ar', sub.theme_ar,
        'completed_at', sub.completed_at
      )), '[]'::jsonb) AS j
    FROM (
      SELECT DISTINCT ON (scp.unit_id) scp.unit_id, cu.theme_ar, scp.completed_at
      FROM public.student_curriculum_progress scp
      JOIN public.curriculum_units cu ON cu.id = scp.unit_id
      WHERE scp.student_id = p_student_id
        AND scp.status = 'completed'
        AND scp.completed_at >= v_week_start_ts
        AND scp.completed_at <  v_week_end_ts
        AND scp.is_best = TRUE
      ORDER BY scp.unit_id, scp.completed_at DESC
    ) sub
  ),
  active_days AS (
    SELECT array_agg(
             EXISTS(
               SELECT 1 FROM public.xp_transactions
               WHERE student_id = p_student_id
                 AND created_at >= ((v_week_start + g)::timestamp AT TIME ZONE 'Asia/Riyadh')
                 AND created_at <  ((v_week_start + g + 1)::timestamp AT TIME ZONE 'Asia/Riyadh')
             ) ORDER BY g
           ) AS mask,
           COUNT(*) FILTER (WHERE EXISTS(
             SELECT 1 FROM public.xp_transactions
             WHERE student_id = p_student_id
               AND created_at >= ((v_week_start + g)::timestamp AT TIME ZONE 'Asia/Riyadh')
               AND created_at <  ((v_week_start + g + 1)::timestamp AT TIME ZONE 'Asia/Riyadh')
           ))::INT AS cnt
    FROM generate_series(0, 6) g
  )
  SELECT
    v_week_start,
    v_week_end,
    (v_week_start = v_current_week_start),
    tx.s,
    px.s,
    CASE WHEN px.s = 0 THEN 0
         ELSE (((tx.s - px.s)::NUMERIC / px.s) * 100)::INT
    END,
    350 AS weekly_goal_xp,
    LEAST(100, GREATEST(0, (tx.s * 100 / GREATEST(350, 1))))::INT,
    bt.j,
    ud.j,
    ad.cnt,
    ad.mask
  FROM this_xp tx
  CROSS JOIN prev_xp px
  CROSS JOIN by_type bt
  CROSS JOIN units_done ud
  CROSS JOIN active_days ad;
END $$;

GRANT EXECUTE ON FUNCTION public.get_student_week_summary(UUID, DATE) TO authenticated;

-- 1.4 Create get_student_history_bounds
CREATE OR REPLACE FUNCTION public.get_student_history_bounds(p_student_id UUID)
RETURNS TABLE (
  earliest_date DATE,
  earliest_week_start DATE,
  today_riyadh DATE,
  current_week_start DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_earliest DATE;
  v_today DATE;
  v_max_lookback DATE;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller AND role = 'admin')
  INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_today := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_max_lookback := v_today - 180;

  SELECT GREATEST(
    v_max_lookback,
    LEAST(
      COALESCE((SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date FROM public.profiles WHERE id = p_student_id), v_today),
      COALESCE((SELECT MIN((created_at AT TIME ZONE 'Asia/Riyadh')::date)
                FROM public.xp_transactions WHERE student_id = p_student_id), v_today)
    )
  ) INTO v_earliest;

  RETURN QUERY SELECT
    v_earliest,
    (v_earliest - EXTRACT(DOW FROM v_earliest)::INT)::date,
    v_today,
    (v_today - EXTRACT(DOW FROM v_today)::INT)::date;
END $$;

GRANT EXECUTE ON FUNCTION public.get_student_history_bounds(UUID) TO authenticated;
`

async function run() {
  await client.connect()

  try {
    await client.query(SQL)
    console.log('Migration applied successfully\n')
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message, err.detail)
    await client.end()
    process.exit(1)
  }

  // Test with JWT context
  const tests = [
    ['history_bounds', `SELECT * FROM get_student_history_bounds('${TEST_STUDENT}')`],
    ['day_summary (today)', `SELECT * FROM get_student_day_summary('${TEST_STUDENT}', NULL)`],
    ['day_summary (yesterday)', `SELECT * FROM get_student_day_summary('${TEST_STUDENT}', ((NOW() AT TIME ZONE 'Asia/Riyadh')::date - 1))`],
    ['week_summary (current)', `SELECT * FROM get_student_week_summary('${TEST_STUDENT}', NULL)`],
    ['week_summary (last week)', `SELECT * FROM get_student_week_summary('${TEST_STUDENT}', ((NOW() AT TIME ZONE 'Asia/Riyadh')::date - EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Asia/Riyadh')::date)::INT - 7)::date)`],
  ]

  for (const [name, sql] of tests) {
    console.log(`\n--- ${name} ---`)
    try {
      await client.query('BEGIN')
      await client.query(`SET LOCAL request.jwt.claim.sub = '${TEST_STUDENT}'`)
      await client.query(`SET LOCAL request.jwt.claims = '{"sub":"${TEST_STUDENT}"}'`)
      const { rows } = await client.query(sql)
      await client.query('COMMIT')
      console.log(`PASS: ${rows.length} row(s)`)
      console.log(JSON.stringify(rows, null, 2))
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`FAIL: ${err.message}`)
    }
  }

  await client.end()
  console.log('\n=== ALL TESTS COMPLETE ===')
}

run().catch(e => { console.error(e); process.exit(1) })
