-- =============================================================================
-- ADMIN — تحليل الطالب العميق (student deep analysis) — 2026-07-27
--
-- ONE staff-gated SECURITY DEFINER RPC that returns every FACT needed to judge
-- a single student end-to-end: identity + entitlements, engagement (sessions /
-- daily rollup / devices), per-skill production, and — the part the existing
-- reports hub does NOT cover — the *content readiness of their own course*
-- (per-unit inventory + gaps such as an unvoiced listening task), plus their
-- progress against it.
--
-- Interpretation (risk scoring, recommended actions) is deliberately NOT done
-- here — the page computes it from these facts so the rules stay reviewable.
--
-- Works for BOTH kinds of student:
--   * uses_custom_curriculum → their own units (curriculum_units.owner_student_id)
--   * everyone else          → the generic units of their academic level
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_student_deep_analysis(p_student uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today      date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_student    jsonb;
  v_engagement jsonb;
  v_skills     jsonb;
  v_units      jsonb;
  v_daily      jsonb;
  v_sessions   jsonb;
  v_devices    jsonb;
  v_timeline   jsonb;
  v_custom     boolean;
  v_level_id   uuid;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;

  -- ── identity + entitlements ────────────────────────────────────────────────
  SELECT to_jsonb(x) INTO v_student FROM (
    SELECT s.id,
           COALESCE(NULLIF(TRIM(p.display_name), ''), p.full_name) AS name,
           p.email,
           s.academic_level,
           s.gender,
           s.status::text            AS status,
           s.package::text           AS package,
           s.track::text             AS track,
           s.study_mode,
           s.enrollment_date,
           (v_today - s.enrollment_date)      AS days_enrolled,
           s.last_active_at,
           s.xp_total,
           s.current_streak,
           s.longest_streak,
           s.onboarding_completed,
           s.uses_custom_curriculum,
           s.uses_pro_desk,
           s.uses_biz_track,
           s.uses_tech_track,
           s.uses_env_track,
           s.uses_speaking_track,
           s.uses_ielts_home,
           s.extra_curriculum_levels,
           s.theme_key,
           s.custom_mission_ar,
           s.goals,
           s.access_expires_at,
           s.paused_at,
           tp.full_name              AS trainer_name,
           g.name                    AS group_name
    FROM students s
    JOIN profiles p ON p.id = s.id
    LEFT JOIN profiles tp ON tp.id = s.assigned_trainer_id
    LEFT JOIN groups   g  ON g.id  = s.group_id
    WHERE s.id = p_student AND s.deleted_at IS NULL
  ) x;

  IF v_student IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  v_custom := COALESCE((v_student->>'uses_custom_curriculum')::boolean, false);
  SELECT cl.id INTO v_level_id
  FROM curriculum_levels cl
  WHERE cl.level_number = (v_student->>'academic_level')::int
  LIMIT 1;

  -- ── engagement rollup ──────────────────────────────────────────────────────
  SELECT to_jsonb(e) INTO v_engagement FROM (
    SELECT
      (SELECT COUNT(*)              FROM user_sessions us WHERE us.user_id = p_student)             AS sessions_total,
      (SELECT MIN(us.started_at)    FROM user_sessions us WHERE us.user_id = p_student)             AS first_seen_at,
      (SELECT MAX(us.last_seen_at)  FROM user_sessions us WHERE us.user_id = p_student)             AS last_seen_at,
      (SELECT COUNT(*)              FROM student_daily_activity da WHERE da.student_id = p_student) AS active_days,
      (SELECT MAX(da.activity_date) FROM student_daily_activity da WHERE da.student_id = p_student) AS last_active_date,
      (SELECT ROUND(COALESCE(SUM(da.learning_seconds), 0) / 60.0)
         FROM student_daily_activity da WHERE da.student_id = p_student)                            AS learning_minutes,
      (SELECT COALESCE(SUM(da.sections_completed), 0)
         FROM student_daily_activity da WHERE da.student_id = p_student)                            AS sections_completed,
      (SELECT COALESCE(SUM(da.xp_earned), 0)
         FROM student_daily_activity da WHERE da.student_id = p_student)                            AS xp_earned,
      (SELECT COUNT(*) FROM speaking_recordings sr       WHERE sr.student_id = p_student)           AS speaking_recordings,
      (SELECT COUNT(*) FROM speaking_conversations sc    WHERE sc.student_id = p_student)           AS speaking_conversations,
      (SELECT COUNT(*) FROM student_saved_words sw       WHERE sw.student_id = p_student)           AS saved_words,
      (SELECT COUNT(*) FROM vocabulary_word_mastery vm   WHERE vm.student_id = p_student)           AS vocab_words_touched,
      (SELECT COUNT(*) FROM activity_attempts aa         WHERE aa.student_id = p_student)           AS activity_attempts,
      (SELECT COUNT(*) FROM client_error_log ce          WHERE ce.user_id    = p_student)           AS client_errors,
      (SELECT COUNT(*) FROM student_curriculum_progress scp
        WHERE scp.student_id = p_student AND scp.status = 'completed')                              AS sections_completed_rows
  ) e;

  -- ── per-skill production ───────────────────────────────────────────────────
  SELECT COALESCE(jsonb_agg(to_jsonb(k) ORDER BY k.completed DESC, k.section_type), '[]'::jsonb)
    INTO v_skills
  FROM (
    SELECT scp.section_type,
           COUNT(*) FILTER (WHERE scp.status = 'completed')                       AS completed,
           COUNT(*) FILTER (WHERE scp.status <> 'completed')                      AS in_progress,
           ROUND(AVG(scp.score) FILTER (WHERE scp.status = 'completed'
                                          AND scp.score IS NOT NULL))             AS avg_score,
           MAX(scp.completed_at)                                                  AS last_at,
           ROUND(COALESCE(SUM(scp.time_spent_seconds), 0) / 60.0)                 AS minutes
    FROM student_curriculum_progress scp
    WHERE scp.student_id = p_student
    GROUP BY scp.section_type
  ) k;

  -- ── their course: inventory, content gaps, progress ────────────────────────
  SELECT COALESCE(jsonb_agg(to_jsonb(u) ORDER BY u.ord), '[]'::jsonb)
    INTO v_units
  FROM (
    SELECT COALESCE(cu.custom_sort, cu.unit_number)      AS ord,
           cu.id,
           cu.unit_number,
           cu.theme_ar,
           cu.theme_en,
           cu.is_published,
           (cu.cover_image_url IS NOT NULL)              AS has_cover,
           COALESCE(up.percentage, 0)                    AS percentage,
           up.numerator,
           up.denominator,
           up.breakdown,
           (SELECT COUNT(*) FROM curriculum_readings r WHERE r.unit_id = cu.id)                          AS reading,
           (SELECT COUNT(*) FROM curriculum_readings r WHERE r.unit_id = cu.id
              AND r.passage_audio_url IS NULL)                                                           AS reading_no_audio,
           (SELECT COUNT(*) FROM curriculum_grammar g  WHERE g.unit_id = cu.id)                          AS grammar,
           (SELECT COUNT(*) FROM curriculum_grammar_exercises ge
              JOIN curriculum_grammar g ON g.id = ge.grammar_id
             WHERE g.unit_id = cu.id)                                                                    AS grammar_exercises,
           (SELECT COUNT(*) FROM curriculum_writing   w  WHERE w.unit_id  = cu.id)                       AS writing,
           (SELECT COUNT(*) FROM curriculum_listening l  WHERE l.unit_id  = cu.id)                       AS listening,
           (SELECT COUNT(*) FROM curriculum_listening l  WHERE l.unit_id  = cu.id
              AND COALESCE(l.audio_url, '') = '')                                                        AS listening_no_audio,
           (SELECT COUNT(*) FROM curriculum_speaking  sp WHERE sp.unit_id = cu.id)                       AS speaking,
           (SELECT COUNT(*) FROM curriculum_vocabulary v
              JOIN curriculum_readings r ON r.id = v.reading_id
             WHERE r.unit_id = cu.id)                                                                    AS vocabulary,
           (SELECT COUNT(*) FROM student_curriculum_progress scp
             WHERE scp.student_id = p_student AND scp.unit_id = cu.id
               AND scp.status = 'completed')                                                             AS sections_done,
           (SELECT MAX(scp.completed_at) FROM student_curriculum_progress scp
             WHERE scp.student_id = p_student AND scp.unit_id = cu.id)                                   AS last_touched
    FROM curriculum_units cu
    LEFT JOIN unit_progress up
           ON up.unit_id = cu.id AND up.student_id = p_student
    WHERE (v_custom     AND cu.owner_student_id = p_student)
       OR (NOT v_custom AND cu.owner_student_id IS NULL AND cu.level_id = v_level_id)
  ) u;

  -- ── daily series (last 60 Riyadh days) ─────────────────────────────────────
  SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.activity_date), '[]'::jsonb)
    INTO v_daily
  FROM (
    SELECT da.activity_date,
           ROUND(da.learning_seconds / 60.0) AS minutes,
           da.sections_completed,
           da.xp_earned,
           da.session_count,
           da.avg_score,
           da.skill_breakdown
    FROM student_daily_activity da
    WHERE da.student_id = p_student
      AND da.activity_date >= v_today - 59
  ) d;

  -- ── sessions + devices ─────────────────────────────────────────────────────
  SELECT COALESCE(jsonb_agg(to_jsonb(z) ORDER BY z.started_at DESC), '[]'::jsonb)
    INTO v_sessions
  FROM (
    SELECT us.started_at, us.last_seen_at, us.device, us.browser, us.pages_visited
    FROM user_sessions us
    WHERE us.user_id = p_student
    ORDER BY us.started_at DESC
    LIMIT 25
  ) z;

  SELECT COALESCE(jsonb_agg(to_jsonb(dv) ORDER BY dv.sessions DESC), '[]'::jsonb)
    INTO v_devices
  FROM (
    SELECT COALESCE(us.device, '—') AS device,
           COALESCE(us.browser, '—') AS browser,
           COUNT(*) AS sessions
    FROM user_sessions us
    WHERE us.user_id = p_student
    GROUP BY 1, 2
  ) dv;

  -- ── recent timeline ────────────────────────────────────────────────────────
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.happened_at DESC), '[]'::jsonb)
    INTO v_timeline
  FROM (
    SELECT 'section'::text        AS kind,
           scp.section_type       AS label,
           scp.score::numeric     AS score,
           scp.completed_at       AS happened_at,
           cu.theme_ar            AS unit
    FROM student_curriculum_progress scp
    LEFT JOIN curriculum_units cu ON cu.id = scp.unit_id
    WHERE scp.student_id = p_student AND scp.completed_at IS NOT NULL
    UNION ALL
    SELECT 'speaking', 'تسجيل تحدث', NULL::numeric, sr.created_at, NULL
    FROM speaking_recordings sr
    WHERE sr.student_id = p_student
    UNION ALL
    SELECT 'saved_word', 'كلمة محفوظة', NULL::numeric, sw.created_at, NULL
    FROM student_saved_words sw
    WHERE sw.student_id = p_student
    ORDER BY happened_at DESC
    LIMIT 40
  ) t;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'today',        v_today,
    'student',      v_student,
    'engagement',   v_engagement,
    'skills',       v_skills,
    'units',        v_units,
    'daily',        v_daily,
    'sessions',     v_sessions,
    'devices',      v_devices,
    'timeline',     v_timeline
  );
END;
$$;

REVOKE ALL   ON FUNCTION public.admin_student_deep_analysis(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_student_deep_analysis(uuid) TO authenticated, service_role;
