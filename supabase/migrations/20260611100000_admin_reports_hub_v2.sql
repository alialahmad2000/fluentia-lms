-- =============================================================================
-- ADMIN REPORTS HUB v2 (مركز التقارير) — 2026-06-11
-- Supersedes 20260610120000 (full CREATE OR REPLACE re-definition).
-- v2: window clamp 1..3650 days (اليوم .. كل التاريخ) · NEW admin_report_refresh_today()
--     materializes today partial rollup · admin_report_usage gains section_time
-- 6 staff-gated SECURITY DEFINER report RPCs, one per tab of the new
-- /admin/reports hub. Built on the tables that actually carry production data
-- (student_daily_activity rollup, analytics_events, user_sessions, ai_usage,
-- student_curriculum_progress, srs_review_logs, client_error_log, …) — NOT the
-- dead payments/submissions/attendance tables the legacy page read.
--
-- Rules:
--   * every function gates on public.is_staff() (admin + agent) as line 1
--   * Riyadh-day bucketing everywhere: (ts AT TIME ZONE 'Asia/Riyadh')::date
--   * roster = non-deleted students whose profile is not a test account
--   * daily series come from the nightly rollup (current through YESTERDAY);
--     live "today"/"active now" values are computed separately in pulse
--   * REVOKE from PUBLIC/anon; EXECUTE granted to authenticated+service_role
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) admin_report_pulse — overview: totals + deltas, daily series, live today,
--    WAU/MAU, hour×weekday heatmap, top events
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_report_pulse(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days     int  := LEAST(GREATEST(COALESCE(p_days, 30), 1), 3650);
  v_today    date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_start    date;
  v_pstart   date;
  v_start_ts timestamptz;
  v_today_ts timestamptz;
  v_totals jsonb; v_prev jsonb; v_daily jsonb; v_today_live jsonb;
  v_active_now int; v_wau int; v_mau int; v_heat jsonb; v_topev jsonb;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;

  v_start    := v_today - (v_days - 1);
  v_pstart   := v_start - v_days;
  v_start_ts := (v_start::timestamp) AT TIME ZONE 'Asia/Riyadh';
  v_today_ts := (v_today::timestamp) AT TIME ZONE 'Asia/Riyadh';

  -- current + previous window totals (rollup + ai cost)
  WITH roster AS (
    SELECT s.id FROM students s JOIN profiles p ON p.id = s.id
    WHERE s.deleted_at IS NULL AND COALESCE(p.is_test_account, false) = false
  ),
  cur AS (
    SELECT COUNT(DISTINCT da.student_id) AS active_students,
           ROUND(COALESCE(SUM(da.learning_seconds),0)/60.0) AS learning_minutes,
           COALESCE(SUM(da.session_count),0) AS sessions,
           COALESCE(SUM(da.page_views),0) AS page_views,
           COALESCE(SUM(da.sections_completed),0) AS sections_completed,
           COALESCE(SUM(da.xp_earned),0) AS xp,
           COALESCE(SUM(da.words_mastered),0) AS words_mastered
    FROM student_daily_activity da JOIN roster r ON r.id = da.student_id
    WHERE da.activity_date BETWEEN v_start AND v_today
  ),
  prev AS (
    SELECT COUNT(DISTINCT da.student_id) AS active_students,
           ROUND(COALESCE(SUM(da.learning_seconds),0)/60.0) AS learning_minutes,
           COALESCE(SUM(da.session_count),0) AS sessions,
           COALESCE(SUM(da.page_views),0) AS page_views,
           COALESCE(SUM(da.sections_completed),0) AS sections_completed,
           COALESCE(SUM(da.xp_earned),0) AS xp,
           COALESCE(SUM(da.words_mastered),0) AS words_mastered
    FROM student_daily_activity da JOIN roster r ON r.id = da.student_id
    WHERE da.activity_date BETWEEN v_pstart AND v_start - 1
  )
  SELECT
    (SELECT to_jsonb(cur) FROM cur) ||
      jsonb_build_object('ai_cost_sar', (SELECT ROUND(COALESCE(SUM(estimated_cost_sar),0),2) FROM ai_usage WHERE created_at >= v_start_ts)),
    (SELECT to_jsonb(prev) FROM prev) ||
      jsonb_build_object('ai_cost_sar', (SELECT ROUND(COALESCE(SUM(estimated_cost_sar),0),2) FROM ai_usage
                                          WHERE created_at >= (v_pstart::timestamp) AT TIME ZONE 'Asia/Riyadh'
                                            AND created_at <  v_start_ts))
  INTO v_totals, v_prev;

  -- daily series from rollup (through yesterday — labeled "حتى أمس" in UI)
  SELECT COALESCE(jsonb_agg(d ORDER BY d->>'date'), '[]'::jsonb) INTO v_daily
  FROM (
    SELECT jsonb_build_object(
      'date', da.activity_date,
      'students', COUNT(DISTINCT da.student_id),
      'learning_minutes', ROUND(COALESCE(SUM(da.learning_seconds),0)/60.0),
      'sessions', COALESCE(SUM(da.session_count),0),
      'sections', COALESCE(SUM(da.sections_completed),0),
      'xp', COALESCE(SUM(da.xp_earned),0)
    ) AS d
    FROM student_daily_activity da
    JOIN students s ON s.id = da.student_id AND s.deleted_at IS NULL
    JOIN profiles p ON p.id = da.student_id AND COALESCE(p.is_test_account,false) = false
    WHERE da.activity_date BETWEEN v_start AND v_today
    GROUP BY da.activity_date
  ) q;

  -- live today (rollup hasn't run yet for today)
  SELECT jsonb_build_object(
    'students_active', (SELECT COUNT(DISTINCT us.user_id) FROM user_sessions us
                        JOIN students s ON s.id = us.user_id AND s.deleted_at IS NULL
                        WHERE us.last_seen_at >= v_today_ts),
    'sessions', (SELECT COUNT(*) FROM user_sessions us
                 JOIN students s ON s.id = us.user_id AND s.deleted_at IS NULL
                 WHERE us.started_at >= v_today_ts),
    'learning_minutes', (SELECT ROUND(COALESCE(SUM(scp.time_spent_seconds),0)/60.0)
                         FROM student_curriculum_progress scp
                         JOIN students s ON s.id = scp.student_id AND s.deleted_at IS NULL
                         WHERE scp.updated_at >= v_today_ts),
    'events', (SELECT COUNT(*) FROM analytics_events WHERE created_at >= v_today_ts)
  ) INTO v_today_live;

  SELECT COUNT(DISTINCT us.user_id) INTO v_active_now
  FROM user_sessions us JOIN students s ON s.id = us.user_id AND s.deleted_at IS NULL
  WHERE us.is_active = true AND us.last_seen_at > now() - interval '5 minutes';

  SELECT COUNT(DISTINCT student_id) INTO v_wau FROM student_daily_activity
  WHERE activity_date > v_today - 7;
  SELECT COUNT(DISTINCT student_id) INTO v_mau FROM student_daily_activity
  WHERE activity_date > v_today - 30;

  -- when do students study: hour × weekday heatmap (Riyadh local)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hr, 'count', c)), '[]'::jsonb) INTO v_heat
  FROM (
    SELECT EXTRACT(dow  FROM (e.created_at AT TIME ZONE 'Asia/Riyadh'))::int AS dow,
           EXTRACT(hour FROM (e.created_at AT TIME ZONE 'Asia/Riyadh'))::int AS hr,
           COUNT(*) AS c
    FROM analytics_events e
    JOIN students s ON s.id = e.user_id AND s.deleted_at IS NULL
    JOIN profiles p ON p.id = e.user_id AND COALESCE(p.is_test_account,false) = false
    WHERE e.created_at >= v_start_ts AND e.event IN ('page_view','login')
    GROUP BY 1, 2
  ) q;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'count')::int DESC), '[]'::jsonb) INTO v_topev
  FROM (
    SELECT jsonb_build_object('event', e.event, 'count', COUNT(*), 'users', COUNT(DISTINCT e.user_id)) AS t
    FROM analytics_events e
    WHERE e.created_at >= v_start_ts
    GROUP BY e.event ORDER BY COUNT(*) DESC LIMIT 15
  ) q;

  RETURN jsonb_build_object(
    'days', v_days,
    'range', jsonb_build_object('start', v_start, 'end', v_today),
    'now', jsonb_build_object('active_now', COALESCE(v_active_now,0)),
    'today', v_today_live,
    'totals', v_totals,
    'prev_totals', v_prev,
    'wau', COALESCE(v_wau,0), 'mau', COALESCE(v_mau,0),
    'daily', v_daily,
    'heatmap', v_heat,
    'top_events', v_topev
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) admin_report_students — the retention heart: one object per student with
--    identity, live signals, window aggregates, trend halves, 14d sparkline
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_report_students(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days  int  := LEAST(GREATEST(COALESCE(p_days, 30), 1), 3650);
  v_today date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_start date;
  v_mid   date;
  v_out jsonb;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_start := v_today - (v_days - 1);
  v_mid   := v_start + (v_days / 2);

  WITH roster AS (
    SELECT s.id, COALESCE(pr.display_name, pr.full_name) AS name, pr.avatar_url,
           g.name AS group_name, s.academic_level AS level, s.package::text AS package,
           s.status::text AS status, s.gender, s.last_active_at, s.access_expires_at,
           s.current_streak, s.xp_total, s.enrollment_date
    FROM students s
    JOIN profiles pr ON pr.id = s.id
    LEFT JOIN groups g ON g.id = s.group_id
    WHERE s.deleted_at IS NULL AND COALESCE(pr.is_test_account, false) = false
  ),
  agg AS (
    SELECT da.student_id,
           ROUND(COALESCE(SUM(da.learning_seconds),0)/60.0) AS minutes,
           COUNT(*) AS active_days,
           COALESCE(SUM(da.session_count),0) AS sessions,
           COALESCE(SUM(da.sections_completed),0) AS sections_completed,
           ROUND(AVG(da.avg_score) FILTER (WHERE da.avg_score IS NOT NULL), 1) AS avg_score,
           COALESCE(SUM(da.words_mastered),0) AS words_mastered,
           COALESCE(SUM(da.speaking_recordings),0) AS speaking_recordings,
           COALESCE(SUM(da.xp_earned),0) AS xp_earned,
           ROUND(COALESCE(SUM(da.learning_seconds) FILTER (WHERE da.activity_date <  v_mid),0)/60.0) AS first_half_minutes,
           ROUND(COALESCE(SUM(da.learning_seconds) FILTER (WHERE da.activity_date >= v_mid),0)/60.0) AS second_half_minutes
    FROM student_daily_activity da
    WHERE da.activity_date BETWEEN v_start AND v_today
    GROUP BY da.student_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id, 'name', r.name, 'avatar', r.avatar_url,
      'group_name', r.group_name, 'level', r.level, 'package', r.package,
      'status', r.status, 'gender', r.gender,
      'last_active_at', r.last_active_at, 'access_expires_at', r.access_expires_at,
      'current_streak', COALESCE(r.current_streak,0), 'xp_total', COALESCE(r.xp_total,0),
      'enrollment_date', r.enrollment_date,
      'minutes', COALESCE(a.minutes,0), 'active_days', COALESCE(a.active_days,0),
      'sessions', COALESCE(a.sessions,0), 'sections_completed', COALESCE(a.sections_completed,0),
      'avg_score', a.avg_score, 'words_mastered', COALESCE(a.words_mastered,0),
      'speaking_recordings', COALESCE(a.speaking_recordings,0), 'xp_earned', COALESCE(a.xp_earned,0),
      'first_half_minutes', COALESCE(a.first_half_minutes,0),
      'second_half_minutes', COALESCE(a.second_half_minutes,0),
      'days_inactive', CASE WHEN r.last_active_at IS NULL THEN NULL
                            ELSE v_today - (r.last_active_at AT TIME ZONE 'Asia/Riyadh')::date END,
      'sparkline', (
        SELECT COALESCE(jsonb_agg(COALESCE(m.mins,0) ORDER BY gs.d), '[]'::jsonb)
        FROM generate_series(v_today - 13, v_today, interval '1 day') gs(d)
        LEFT JOIN LATERAL (
          SELECT ROUND(da.learning_seconds/60.0) AS mins
          FROM student_daily_activity da
          WHERE da.student_id = r.id AND da.activity_date = gs.d::date
        ) m ON true
      )
    )
    ORDER BY (r.status = 'active') DESC, r.last_active_at DESC NULLS LAST
  ), '[]'::jsonb)
  INTO v_out
  FROM roster r LEFT JOIN agg a ON a.student_id = r.id;

  RETURN jsonb_build_object('days', v_days,
    'range', jsonb_build_object('start', v_start, 'end', v_today),
    'students', v_out);
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) admin_report_usage — which features get used vs ignored
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_report_usage(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days  int  := LEAST(GREATEST(COALESCE(p_days, 30), 1), 3650);
  v_today date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_start date;
  v_start_ts timestamptz;
  v_features jsonb; v_devices jsonb; v_browsers jsonb; v_pages jsonb; v_events jsonb;
  v_section_time jsonb;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_start := v_today - (v_days - 1);
  v_start_ts := (v_start::timestamp) AT TIME ZONE 'Asia/Riyadh';

  -- time spent per curriculum section (from the rollup's skill_breakdown)
  WITH roster AS (
    SELECT s.id FROM students s JOIN profiles p ON p.id = s.id
    WHERE s.deleted_at IS NULL AND COALESCE(p.is_test_account, false) = false
  ),
  sk AS (
    SELECT kv.key AS section,
           SUM(COALESCE((kv.value->>'time_seconds')::numeric, 0)) AS secs,
           SUM(COALESCE((kv.value->>'completed')::int, 0)) AS completed,
           COUNT(DISTINCT da.student_id) AS users
    FROM student_daily_activity da
    JOIN roster r ON r.id = da.student_id,
    LATERAL jsonb_each(COALESCE(da.skill_breakdown, '{}'::jsonb)) kv
    WHERE da.activity_date BETWEEN v_start AND v_today
    GROUP BY kv.key
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'section', section,
           'minutes', ROUND(secs / 60.0),
           'completed', completed,
           'users', users) ORDER BY secs DESC), '[]'::jsonb)
  INTO v_section_time
  FROM sk WHERE secs > 0 OR completed > 0;

  WITH roster AS (
    SELECT s.id FROM students s JOIN profiles p ON p.id = s.id
    WHERE s.deleted_at IS NULL AND COALESCE(p.is_test_account, false) = false
  ),
  feat AS (
    SELECT 'curriculum_' || scp.section_type AS key, 'curriculum' AS kind,
           COUNT(*) AS c, COUNT(DISTINCT scp.student_id) AS u
    FROM student_curriculum_progress scp JOIN roster r ON r.id = scp.student_id
    WHERE scp.status = 'completed' AND scp.completed_at >= v_start_ts
      AND COALESCE(scp.is_phantom,false) = false
    GROUP BY scp.section_type
    UNION ALL
    SELECT 'srs_reviews', 'practice', COUNT(*), COUNT(DISTINCT srl.student_id)
    FROM srs_review_logs srl JOIN roster r ON r.id = srl.student_id
    WHERE srl.reviewed_at >= v_start_ts
    UNION ALL
    SELECT 'game_' || gs.game_type, 'game', COUNT(*), COUNT(DISTINCT gs.student_id)
    FROM game_sessions gs JOIN roster r ON r.id = gs.student_id
    WHERE gs.created_at >= v_start_ts
    GROUP BY gs.game_type
    UNION ALL
    SELECT 'spelling_lab', 'practice', COUNT(*), COUNT(DISTINCT sla.student_id)
    FROM spelling_lab_attempts sla JOIN roster r ON r.id = sla.student_id
    WHERE sla.created_at >= v_start_ts
    UNION ALL
    SELECT 'library', 'reading', COUNT(*), COUNT(DISTINCT lsa.student_id)
    FROM library_shadow_attempts lsa JOIN roster r ON r.id = lsa.student_id
    WHERE lsa.created_at >= v_start_ts
    UNION ALL
    SELECT 'speaking_conversation', 'speaking', COUNT(*), COUNT(DISTINCT sc.student_id)
    FROM speaking_conversations sc JOIN roster r ON r.id = sc.student_id
    WHERE sc.created_at >= v_start_ts AND sc.deleted_at IS NULL
    UNION ALL
    SELECT 'speaking_recording', 'speaking', COUNT(*), COUNT(DISTINCT sr.student_id)
    FROM speaking_recordings sr JOIN roster r ON r.id = sr.student_id
    WHERE sr.created_at >= v_start_ts
    UNION ALL
    SELECT 'chat_messages', 'social', COUNT(*), COUNT(DISTINCT gm.sender_id)
    FROM group_messages gm JOIN roster r ON r.id = gm.sender_id
    WHERE gm.created_at >= v_start_ts AND gm.deleted_at IS NULL
    UNION ALL
    SELECT 'saved_words', 'practice', COUNT(*), COUNT(DISTINCT sw.student_id)
    FROM student_saved_words sw JOIN roster r ON r.id = sw.student_id
    WHERE sw.created_at >= v_start_ts
  )
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('key', key, 'kind', kind, 'count', c, 'users', u)
           ORDER BY c DESC), '[]'::jsonb)
  INTO v_features
  FROM feat WHERE c > 0;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('device', d, 'sessions', c, 'users', u) ORDER BY c DESC), '[]'::jsonb)
  INTO v_devices
  FROM (
    SELECT COALESCE(NULLIF(us.device,''),'غير معروف') AS d,
           COUNT(*) AS c, COUNT(DISTINCT us.user_id) AS u
    FROM user_sessions us
    JOIN students s ON s.id = us.user_id AND s.deleted_at IS NULL
    WHERE us.started_at >= v_start_ts
    GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 8
  ) q;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('browser', b, 'sessions', c, 'users', u) ORDER BY c DESC), '[]'::jsonb)
  INTO v_browsers
  FROM (
    SELECT COALESCE(NULLIF(us.browser,''),'غير معروف') AS b,
           COUNT(*) AS c, COUNT(DISTINCT us.user_id) AS u
    FROM user_sessions us
    JOIN students s ON s.id = us.user_id AND s.deleted_at IS NULL
    WHERE us.started_at >= v_start_ts
    GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 8
  ) q;

  -- unit/detail UUIDs collapsed to :id so pages group meaningfully
  SELECT COALESCE(jsonb_agg(jsonb_build_object('page_path', pp, 'views', c, 'users', u) ORDER BY c DESC), '[]'::jsonb)
  INTO v_pages
  FROM (
    SELECT regexp_replace(COALESCE(e.page_path, e.properties->>'path', '؟'),
                          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ':id', 'g') AS pp,
           COUNT(*) AS c, COUNT(DISTINCT e.user_id) AS u
    FROM analytics_events e
    WHERE e.created_at >= v_start_ts AND e.event = 'page_view'
    GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 20
  ) q;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'count')::int DESC), '[]'::jsonb) INTO v_events
  FROM (
    SELECT jsonb_build_object('event', e.event, 'count', COUNT(*), 'users', COUNT(DISTINCT e.user_id)) AS t
    FROM analytics_events e
    WHERE e.created_at >= v_start_ts
    GROUP BY e.event ORDER BY COUNT(*) DESC LIMIT 20
  ) q;

  RETURN jsonb_build_object('days', v_days, 'features', v_features,
    'section_time', v_section_time,
    'devices', v_devices, 'browsers', v_browsers,
    'top_pages', v_pages, 'top_events', v_events);
END;
$$;

-- -----------------------------------------------------------------------------
-- 4) admin_report_learning — outcomes: scores by skill over time, distribution,
--    hardest units, vocab growth, SRS ratings, speaking volume
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_report_learning(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days  int  := LEAST(GREATEST(COALESCE(p_days, 30), 1), 3650);
  v_today date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_start date;
  v_start_ts timestamptz;
  v_skills jsonb; v_dist jsonb; v_hardest jsonb; v_vocab jsonb; v_srs jsonb; v_spk jsonb;
  v_vocab_baseline bigint;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_start := v_today - (v_days - 1);
  v_start_ts := (v_start::timestamp) AT TIME ZONE 'Asia/Riyadh';

  -- weekly avg score per skill
  WITH base AS (
    SELECT scp.section_type, scp.score, scp.unit_id, scp.completed_at
    FROM student_curriculum_progress scp
    JOIN students s ON s.id = scp.student_id AND s.deleted_at IS NULL
    JOIN profiles p ON p.id = scp.student_id AND COALESCE(p.is_test_account,false) = false
    WHERE scp.status = 'completed' AND scp.completed_at >= v_start_ts
      AND COALESCE(scp.is_phantom,false) = false AND COALESCE(scp.is_latest,true) = true
  )
  SELECT
    (SELECT COALESCE(jsonb_agg(w ORDER BY w->>'week'), '[]'::jsonb) FROM (
       SELECT jsonb_build_object(
         'week', (date_trunc('week', b.completed_at AT TIME ZONE 'Asia/Riyadh'))::date,
         'section_type', b.section_type,
         'avg_score', ROUND(AVG(b.score) FILTER (WHERE b.score IS NOT NULL), 1),
         'completed', COUNT(*)) AS w
       FROM base b GROUP BY date_trunc('week', b.completed_at AT TIME ZONE 'Asia/Riyadh'), b.section_type
     ) q),
    (SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
       SELECT jsonb_build_object('bucket', bucket, 'count', COUNT(*)) AS d
       FROM (SELECT CASE WHEN score >= 90 THEN '90-100' WHEN score >= 75 THEN '75-89'
                         WHEN score >= 60 THEN '60-74' WHEN score >= 40 THEN '40-59'
                         ELSE '0-39' END AS bucket
             FROM base WHERE score IS NOT NULL) z
       GROUP BY bucket
     ) q),
    (SELECT COALESCE(jsonb_agg(h ORDER BY (h->>'avg_score')::numeric ASC), '[]'::jsonb) FROM (
       SELECT jsonb_build_object('unit_id', b.unit_id,
                'theme', COALESCE(u.theme_ar, u.theme_en),
                'unit_number', u.unit_number,
                'attempts', COUNT(*),
                'avg_score', ROUND(AVG(b.score), 1)) AS h
       FROM base b JOIN curriculum_units u ON u.id = b.unit_id
       WHERE b.score IS NOT NULL
       GROUP BY b.unit_id, u.theme_ar, u.theme_en, u.unit_number
       HAVING COUNT(*) >= 5
       ORDER BY AVG(b.score) ASC LIMIT 10
     ) q)
  INTO v_skills, v_dist, v_hardest;

  -- vocab growth: daily mastered + cumulative (baseline = before window)
  SELECT COALESCE(SUM(words_mastered),0) INTO v_vocab_baseline
  FROM student_daily_activity WHERE activity_date < v_start;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'mastered', m, 'cumulative', cum) ORDER BY d), '[]'::jsonb)
  INTO v_vocab
  FROM (
    SELECT activity_date AS d, COALESCE(SUM(words_mastered),0) AS m,
           v_vocab_baseline + SUM(COALESCE(SUM(words_mastered),0)) OVER (ORDER BY activity_date) AS cum
    FROM student_daily_activity
    WHERE activity_date BETWEEN v_start AND v_today
    GROUP BY activity_date
  ) q;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('rating', rating, 'count', c) ORDER BY rating), '[]'::jsonb)
  INTO v_srs
  FROM (SELECT rating, COUNT(*) AS c FROM srs_review_logs WHERE reviewed_at >= v_start_ts GROUP BY rating) q;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'recordings', rec, 'conversations', conv) ORDER BY d), '[]'::jsonb)
  INTO v_spk
  FROM (
    SELECT d, SUM(rec) AS rec, SUM(conv) AS conv FROM (
      SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d, COUNT(*) AS rec, 0 AS conv
      FROM speaking_recordings WHERE created_at >= v_start_ts GROUP BY 1
      UNION ALL
      SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date, 0, COUNT(*)
      FROM speaking_conversations WHERE created_at >= v_start_ts AND deleted_at IS NULL GROUP BY 1
    ) z GROUP BY d
  ) q;

  RETURN jsonb_build_object('days', v_days,
    'skills_weekly', v_skills, 'score_distribution', v_dist, 'hardest_units', v_hardest,
    'vocab_growth', v_vocab, 'srs_ratings', v_srs, 'speaking_trend', v_spk);
END;
$$;

-- -----------------------------------------------------------------------------
-- 5) admin_report_health — errors, crashes, audio health, quality flags, AI cost
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_report_health(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days  int  := LEAST(GREATEST(COALESCE(p_days, 30), 1), 3650);
  v_today date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_start_ts timestamptz;
  v_err_daily jsonb; v_err_top jsonb; v_crash jsonb; v_audio jsonb; v_ai jsonb;
  v_flags int;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_start_ts := ((v_today - (v_days - 1))::timestamp) AT TIME ZONE 'Asia/Riyadh';

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_err_daily
  FROM (SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d, COUNT(*) AS c
        FROM client_error_log WHERE created_at >= v_start_ts GROUP BY 1) q;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'count')::int DESC), '[]'::jsonb) INTO v_err_top
  FROM (
    SELECT jsonb_build_object('error_kind', error_kind, 'message', LEFT(message, 140),
             'count', COUNT(*), 'users', COUNT(DISTINCT user_id), 'last_at', MAX(created_at)) AS t
    FROM client_error_log WHERE created_at >= v_start_ts
    GROUP BY error_kind, LEFT(message, 140)
    ORDER BY COUNT(*) DESC LIMIT 10
  ) q;

  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM analytics_events WHERE event = 'section_crash' AND created_at >= v_start_ts),
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'count', c) ORDER BY d), '[]'::jsonb)
              FROM (SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d, COUNT(*) AS c
                    FROM analytics_events WHERE event = 'section_crash' AND created_at >= v_start_ts GROUP BY 1) z),
    'top', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'count')::int DESC), '[]'::jsonb)
            FROM (SELECT jsonb_build_object(
                    'section', COALESCE(properties->>'section','؟'),
                    'page_path', regexp_replace(COALESCE(page_path,'؟'),
                      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ':id', 'g'),
                    'count', COUNT(*), 'users', COUNT(DISTINCT user_id)) AS t
                  FROM analytics_events WHERE event = 'section_crash' AND created_at >= v_start_ts
                  GROUP BY COALESCE(properties->>'section','؟'),
                    regexp_replace(COALESCE(page_path,'؟'), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ':id', 'g')
                  ORDER BY COUNT(*) DESC LIMIT 10) z)
  ) INTO v_crash;

  SELECT jsonb_build_object(
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'plays', plays, 'stalled', stalled, 'errors', errs) ORDER BY d), '[]'::jsonb)
              FROM (SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d,
                           COUNT(*) FILTER (WHERE event IN ('play_ok','word_pronounce')) AS plays,
                           COUNT(*) FILTER (WHERE event = 'stalled') AS stalled,
                           COUNT(*) FILTER (WHERE event = 'media_error') AS errs
                    FROM audio_event_log WHERE created_at >= v_start_ts GROUP BY 1) z),
    'error_rate', (SELECT ROUND(
                     (COUNT(*) FILTER (WHERE event IN ('stalled','media_error')))::numeric
                     / NULLIF(COUNT(*) FILTER (WHERE event IN ('play_ok','word_pronounce')), 0), 4)
                   FROM audio_event_log WHERE created_at >= v_start_ts)
  ) INTO v_audio;

  SELECT COUNT(*) INTO v_flags FROM curriculum_quality_flags WHERE status = 'open';

  SELECT jsonb_build_object(
    'total_sar', (SELECT ROUND(COALESCE(SUM(estimated_cost_sar),0),2) FROM ai_usage WHERE created_at >= v_start_ts),
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'sar', sar) ORDER BY d), '[]'::jsonb)
              FROM (SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d,
                           ROUND(COALESCE(SUM(estimated_cost_sar),0),2) AS sar
                    FROM ai_usage WHERE created_at >= v_start_ts GROUP BY 1) z),
    'by_type', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'sar')::numeric DESC), '[]'::jsonb)
                FROM (SELECT jsonb_build_object('type', type::text, 'calls', COUNT(*),
                              'sar', ROUND(COALESCE(SUM(estimated_cost_sar),0),2)) AS t
                      FROM ai_usage WHERE created_at >= v_start_ts GROUP BY type) z),
    'by_model', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'sar')::numeric DESC), '[]'::jsonb)
                 FROM (SELECT jsonb_build_object('model', COALESCE(model,'؟'), 'calls', COUNT(*),
                               'sar', ROUND(COALESCE(SUM(estimated_cost_sar),0),2)) AS t
                       FROM ai_usage WHERE created_at >= v_start_ts GROUP BY model) z),
    'by_student', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'sar')::numeric DESC), '[]'::jsonb)
                   FROM (SELECT jsonb_build_object('student_id', au.student_id,
                                 'name', COALESCE(pr.display_name, pr.full_name, 'النظام'),
                                 'calls', COUNT(*),
                                 'sar', ROUND(COALESCE(SUM(au.estimated_cost_sar),0),2)) AS t
                         FROM ai_usage au LEFT JOIN profiles pr ON pr.id = au.student_id
                         WHERE au.created_at >= v_start_ts
                         GROUP BY au.student_id, pr.display_name, pr.full_name
                         ORDER BY SUM(au.estimated_cost_sar) DESC NULLS LAST LIMIT 10) z)
  ) INTO v_ai;

  RETURN jsonb_build_object('days', v_days,
    'errors_daily', v_err_daily, 'top_errors', v_err_top,
    'crashes', v_crash, 'audio', v_audio,
    'quality_flags_open', COALESCE(v_flags,0), 'ai', v_ai);
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) admin_report_student_detail — gated admin wrapper around the existing
--    get_student_activity_report + admin extras (sessions, devices, errors,
--    AI cost, games, recordings)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_report_student_detail(p_student uuid, p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days  int  := LEAST(GREATEST(COALESCE(p_days, 30), 1), 3650);
  v_today date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_start date;
  v_start_ts timestamptz;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_start := v_today - (v_days - 1);
  v_start_ts := (v_start::timestamp) AT TIME ZONE 'Asia/Riyadh';

  RETURN jsonb_build_object(
    'base', public.get_student_activity_report(p_student, v_start, v_today),
    'sessions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'started_at', started_at, 'duration_seconds', duration_seconds,
               'device', device, 'browser', browser, 'pages_visited', pages_visited)
             ORDER BY started_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM user_sessions WHERE user_id = p_student ORDER BY started_at DESC LIMIT 20) q),
    'devices', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('device', d, 'browser', b, 'sessions', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT COALESCE(NULLIF(device,''),'؟') AS d, COALESCE(NULLIF(browser,''),'؟') AS b, COUNT(*) AS c
            FROM user_sessions WHERE user_id = p_student GROUP BY 1, 2 ORDER BY COUNT(*) DESC LIMIT 6) q),
    'errors', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'created_at', created_at, 'error_kind', error_kind,
               'message', LEFT(message, 200), 'url', url) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM client_error_log WHERE user_id = p_student AND created_at >= v_start_ts
            ORDER BY created_at DESC LIMIT 20) q),
    'ai', jsonb_build_object(
      'window_sar', (SELECT ROUND(COALESCE(SUM(estimated_cost_sar),0),2) FROM ai_usage
                     WHERE student_id = p_student AND created_at >= v_start_ts),
      'total_sar', (SELECT ROUND(COALESCE(SUM(estimated_cost_sar),0),2) FROM ai_usage WHERE student_id = p_student),
      'by_type', (SELECT COALESCE(jsonb_agg(jsonb_build_object('type', type::text, 'calls', c, 'sar', sar)
                          ORDER BY sar DESC), '[]'::jsonb)
                  FROM (SELECT type, COUNT(*) AS c, ROUND(COALESCE(SUM(estimated_cost_sar),0),2) AS sar
                        FROM ai_usage WHERE student_id = p_student AND created_at >= v_start_ts
                        GROUP BY type) z)),
    'games', (
      SELECT jsonb_build_object('count', COUNT(*),
               'avg_accuracy', ROUND(AVG(accuracy_percent),1), 'last_at', MAX(created_at))
      FROM game_sessions WHERE student_id = p_student AND created_at >= v_start_ts),
    'recordings', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'created_at', created_at, 'duration_seconds', audio_duration_seconds,
               'evaluation_status', evaluation_status, 'trainer_grade', trainer_grade,
               'ai_score', COALESCE(ai_evaluation->>'score', ai_evaluation->>'overall_score'))
             ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM speaking_recordings WHERE student_id = p_student
            ORDER BY created_at DESC LIMIT 10) q)
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) admin_report_refresh_today — materialize TODAY's partial rollup on demand
--    so 1-/3-day windows are honest (the nightly cron only covers yesterday).
--    VOLATILE (writes student_daily_activity via the existing driver).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_report_refresh_today()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM refresh_daily_activity(v_today);
  RETURN jsonb_build_object('ok', true, 'date', v_today);
END;
$$;

-- -----------------------------------------------------------------------------
-- Grants: gate is inside (is_staff), but never expose to anon
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_report_refresh_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_report_refresh_today() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_report_pulse(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_report_students(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_report_usage(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_report_learning(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_report_health(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_report_student_detail(uuid, int) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_report_pulse(int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_report_students(int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_report_usage(int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_report_learning(int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_report_health(int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_report_student_detail(uuid, int) TO authenticated, service_role;
