-- ════════════════════════════════════════════════════════════════════════════
-- SPELLING LAB — anti-repeat session selector + progression overview + two
-- reports (activity history, strength buckets) + a focused weak-words selector.
-- ────────────────────────────────────────────────────────────────────────────
-- All functions SECURITY DEFINER, search_path=public, derive the student from
-- auth.uid() (never trusted from a param). Additive only — NO schema changes;
-- everything reads the existing spelling_lab_words / _mastery / _attempts tables.
-- Idempotent (CREATE OR REPLACE / DROP IF EXISTS). Streak days use Asia/Riyadh
-- to match the academy's daily-activity rollup.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Session selection (UPGRADED): now accepts p_exclude so a fresh "new session"
--    can never re-serve the set the student just finished, and the absolute
--    fallback prefers the least-recently-seen words. Backward compatible: callers
--    that pass only {p_mode, p_size} use the empty default.
--    GOTCHA: a defaulted 3rd param would create a 2nd overload → PostgREST
--    PGRST203 ambiguity, so we DROP the old 2-arg signature first.
DROP FUNCTION IF EXISTS public.spelling_lab_select_session(text, int);
DROP FUNCTION IF EXISTS public.spelling_lab_select_session(text, int, uuid[]);
CREATE FUNCTION public.spelling_lab_select_session(
  p_mode text DEFAULT NULL, p_size int DEFAULT 10, p_exclude uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  id uuid, word_en text, audio_url text, ipa text,
  meaning_ar text, example_en text, difficulty smallint, category text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sid  uuid := auth.uid();
  v_lv   int;
  v_n    int    := GREATEST(1, COALESCE(p_size, 10));
  v_excl uuid[] := COALESCE(p_exclude, '{}');
  v_ids  uuid[] := '{}';
  v_need int;
BEGIN
  IF v_sid IS NULL THEN RETURN; END IF;
  v_lv := public.spelling_lab_level_of(v_sid);

  -- 1) due reviews (up to 60%) — never re-serve a just-finished word
  v_ids := ARRAY(
    SELECT m.word_id FROM public.spelling_lab_mastery m
    WHERE m.student_id = v_sid AND m.due_at IS NOT NULL AND m.due_at <= now()
      AND m.state IN ('learning','reviewing')
      AND NOT (m.word_id = ANY(v_excl))
    ORDER BY m.due_at ASC
    LIMIT CEIL(v_n * 0.6)::int
  );

  -- 2) new words at/under (level+1), fill toward 90%
  v_need := LEAST(ROUND(v_n * 0.9)::int, v_n) - cardinality(v_ids);
  IF v_need > 0 THEN
    v_ids := v_ids || ARRAY(
      SELECT w.id FROM public.spelling_lab_words w
      WHERE w.difficulty <= v_lv + 1
        AND NOT (w.id = ANY(v_ids)) AND NOT (w.id = ANY(v_excl))
        AND NOT EXISTS (SELECT 1 FROM public.spelling_lab_mastery m
                        WHERE m.student_id = v_sid AND m.word_id = w.id)
      ORDER BY random() LIMIT v_need
    );
  END IF;

  -- 3) slightly harder (level+2..level+3), fill toward 100%
  v_need := v_n - cardinality(v_ids);
  IF v_need > 0 THEN
    v_ids := v_ids || ARRAY(
      SELECT w.id FROM public.spelling_lab_words w
      WHERE w.difficulty BETWEEN v_lv + 2 AND v_lv + 3
        AND NOT (w.id = ANY(v_ids)) AND NOT (w.id = ANY(v_excl))
        AND NOT EXISTS (SELECT 1 FROM public.spelling_lab_mastery m
                        WHERE m.student_id = v_sid AND m.word_id = w.id)
      ORDER BY random() LIMIT v_need
    );
  END IF;

  -- 4) fallback: any unseen word regardless of difficulty
  v_need := v_n - cardinality(v_ids);
  IF v_need > 0 THEN
    v_ids := v_ids || ARRAY(
      SELECT w.id FROM public.spelling_lab_words w
      WHERE NOT (w.id = ANY(v_ids)) AND NOT (w.id = ANY(v_excl))
        AND NOT EXISTS (SELECT 1 FROM public.spelling_lab_mastery m
                        WHERE m.student_id = v_sid AND m.word_id = w.id)
      ORDER BY random() LIMIT v_need
    );
  END IF;

  -- 5) absolute fallback (everything else seen): re-surface the LEAST-recently-seen
  --    words first, still honoring the just-finished exclusion when possible.
  v_need := v_n - cardinality(v_ids);
  IF v_need > 0 THEN
    v_ids := v_ids || ARRAY(
      SELECT w.id FROM public.spelling_lab_words w
      LEFT JOIN public.spelling_lab_mastery m
        ON m.student_id = v_sid AND m.word_id = w.id
      WHERE NOT (w.id = ANY(v_ids)) AND NOT (w.id = ANY(v_excl))
      ORDER BY (m.last_seen_at IS NULL) DESC, m.last_seen_at ASC NULLS LAST, random()
      LIMIT v_need
    );
  END IF;

  -- 6) last resort: if the exclude list starved us (tiny word bank), allow excluded
  v_need := v_n - cardinality(v_ids);
  IF v_need > 0 THEN
    v_ids := v_ids || ARRAY(
      SELECT w.id FROM public.spelling_lab_words w
      WHERE NOT (w.id = ANY(v_ids))
      ORDER BY random() LIMIT v_need
    );
  END IF;

  RETURN QUERY
    SELECT w.id, w.word_en, w.audio_url, w.ipa, w.meaning_ar, w.example_en, w.difficulty, w.category
    FROM public.spelling_lab_words w
    WHERE w.id = ANY(v_ids)
    ORDER BY random();
END;
$$;

-- ── Focused "practice my weak words" selector — weakest attempted words first
--    (low accuracy, not yet mastered). Same column shape as select_session so the
--    session UI is reused unchanged. May return fewer than p_size (that's fine —
--    a short, targeted drill).
DROP FUNCTION IF EXISTS public.spelling_lab_select_weak(int);
CREATE FUNCTION public.spelling_lab_select_weak(p_size int DEFAULT 10)
RETURNS TABLE (
  id uuid, word_en text, audio_url text, ipa text,
  meaning_ar text, example_en text, difficulty smallint, category text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sid uuid := auth.uid();
  v_n   int  := GREATEST(1, COALESCE(p_size, 10));
BEGIN
  IF v_sid IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT w.id, w.word_en, w.audio_url, w.ipa, w.meaning_ar, w.example_en, w.difficulty, w.category
    FROM public.spelling_lab_mastery m
    JOIN public.spelling_lab_words w ON w.id = m.word_id
    WHERE m.student_id = v_sid
      AND m.state <> 'mastered'
      AND m.attempts_total > 0
      AND (m.attempts_correct::numeric / m.attempts_total) < 0.85
    ORDER BY (m.attempts_correct::numeric / m.attempts_total) ASC,
             m.attempts_total DESC,
             m.last_seen_at ASC NULLS FIRST
    LIMIT v_n;
END;
$$;

-- ── Progression overview — surfaces the (already-existing) leveling so the home
--    can show "where am I / what's next" instead of a bare random drill.
DROP FUNCTION IF EXISTS public.spelling_lab_overview();
CREATE FUNCTION public.spelling_lab_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sid       uuid := auth.uid();
  v_lv        int;
  v_mastered  int;
  v_learning  int;
  v_due       int;
  v_total_lv  int;
  v_seen_lv   int;
  v_streak    int := 0;
BEGIN
  IF v_sid IS NULL THEN RETURN NULL; END IF;
  v_lv := public.spelling_lab_level_of(v_sid);

  SELECT count(*) FILTER (WHERE state = 'mastered'),
         count(*) FILTER (WHERE state IN ('learning','reviewing'))
    INTO v_mastered, v_learning
  FROM public.spelling_lab_mastery WHERE student_id = v_sid;

  SELECT count(*) INTO v_due
  FROM public.spelling_lab_mastery
  WHERE student_id = v_sid AND due_at IS NOT NULL AND due_at <= now()
    AND state IN ('learning','reviewing');

  SELECT count(*) INTO v_total_lv
  FROM public.spelling_lab_words WHERE difficulty <= v_lv + 1;

  SELECT count(*) INTO v_seen_lv
  FROM public.spelling_lab_mastery m
  JOIN public.spelling_lab_words w ON w.id = m.word_id
  WHERE m.student_id = v_sid AND w.difficulty <= v_lv + 1;

  -- current streak in days (consecutive Riyadh days ending today or yesterday)
  WITH days AS (
    SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d
    FROM public.spelling_lab_attempts WHERE student_id = v_sid
  ), ranked AS (
    SELECT d, row_number() OVER (ORDER BY d DESC) AS rn FROM days
  ), run AS (
    SELECT count(*) AS len, max(d) AS latest
    FROM ranked, (SELECT max(d) AS md FROM days) mx
    WHERE d = mx.md - (rn - 1)::int
  )
  SELECT CASE WHEN latest >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 1
              THEN len ELSE 0 END
    INTO v_streak FROM run;

  RETURN jsonb_build_object(
    'level',              v_lv,
    'next_level',         v_lv + 1,
    'mastered',           COALESCE(v_mastered, 0),
    'in_progress',        COALESCE(v_learning, 0),
    'due',                COALESCE(v_due, 0),
    'to_next_level',      5 - (COALESCE(v_mastered, 0) % 5),  -- words until +1 level
    'level_progress',     COALESCE(v_mastered, 0) % 5,        -- 0..5 within this level
    'total_at_level',     COALESCE(v_total_lv, 0),
    'seen_at_level',      COALESCE(v_seen_lv, 0),
    'remaining_at_level', GREATEST(0, COALESCE(v_total_lv, 0) - COALESCE(v_seen_lv, 0)),
    'current_streak_days', COALESCE(v_streak, 0)
  );
END;
$$;

-- ── Activity report — "what have I done since the beginning": lifetime totals,
--    a 30-day daily series (for the chart), and the recently-practiced words.
DROP FUNCTION IF EXISTS public.spelling_lab_activity_report();
CREATE FUNCTION public.spelling_lab_activity_report()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sid     uuid := auth.uid();
  v_life    jsonb;
  v_daily   jsonb;
  v_recent  jsonb;
  v_best    int := 0;
  v_streak  int := 0;
BEGIN
  IF v_sid IS NULL THEN RETURN NULL; END IF;

  -- lifetime aggregates
  SELECT jsonb_build_object(
    'words_practiced',  count(DISTINCT word_id),
    'total_attempts',   count(*),
    'correct_attempts', count(*) FILTER (WHERE is_correct),
    'accuracy_pct',     CASE WHEN count(*) > 0
                             THEN round(100.0 * count(*) FILTER (WHERE is_correct) / count(*))
                             ELSE 0 END,
    'total_minutes',    round(COALESCE(sum(ms_to_submit), 0) / 60000.0)
  ) INTO v_life
  FROM public.spelling_lab_attempts WHERE student_id = v_sid;

  -- 30-day daily series (zero-filled so the chart is continuous)
  SELECT jsonb_agg(jsonb_build_object(
           'day',          to_char(g.day, 'YYYY-MM-DD'),
           'practiced',    COALESCE(a.practiced, 0),
           'attempts',     COALESCE(a.attempts, 0),
           'correct',      COALESCE(a.correct, 0),
           'accuracy_pct', CASE WHEN COALESCE(a.attempts, 0) > 0
                                THEN round(100.0 * a.correct / a.attempts) ELSE 0 END
         ) ORDER BY g.day)
    INTO v_daily
  FROM generate_series(
         ((now() AT TIME ZONE 'Asia/Riyadh')::date - 29),
         ((now() AT TIME ZONE 'Asia/Riyadh')::date),
         interval '1 day') AS g(day)
  LEFT JOIN (
    SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d,
           count(DISTINCT word_id) AS practiced,
           count(*) AS attempts,
           count(*) FILTER (WHERE is_correct) AS correct
    FROM public.spelling_lab_attempts WHERE student_id = v_sid
    GROUP BY 1
  ) a ON a.d = g.day::date;

  -- recently practiced words (last 8 distinct)
  SELECT jsonb_agg(r ORDER BY r.last_at DESC)
    INTO v_recent
  FROM (
    SELECT w.word_en, w.meaning_ar, m.state,
           max(at.created_at) AS last_at,
           bool_or(at.is_correct) FILTER (WHERE at.created_at = mx.last_at) AS last_correct
    FROM public.spelling_lab_attempts at
    JOIN public.spelling_lab_words w ON w.id = at.word_id
    LEFT JOIN public.spelling_lab_mastery m ON m.student_id = v_sid AND m.word_id = at.word_id
    JOIN LATERAL (SELECT max(created_at) AS last_at FROM public.spelling_lab_attempts
                  WHERE student_id = v_sid AND word_id = at.word_id) mx ON true
    WHERE at.student_id = v_sid
    GROUP BY w.word_en, w.meaning_ar, m.state, mx.last_at
    ORDER BY max(at.created_at) DESC
    LIMIT 8
  ) r;

  -- current + best streak (Riyadh days)
  WITH days AS (
    SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d
    FROM public.spelling_lab_attempts WHERE student_id = v_sid
  ), ranked AS (
    SELECT d, row_number() OVER (ORDER BY d DESC) AS rn FROM days
  ), run AS (
    SELECT count(*) AS len, max(d) AS latest
    FROM ranked, (SELECT max(d) AS md FROM days) mx
    WHERE d = mx.md - (rn - 1)::int
  )
  SELECT CASE WHEN latest >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 1
              THEN len ELSE 0 END INTO v_streak FROM run;

  WITH days AS (
    SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS d
    FROM public.spelling_lab_attempts WHERE student_id = v_sid
  ), grp AS (
    SELECT d, d - (row_number() OVER (ORDER BY d))::int AS island FROM days
  )
  SELECT COALESCE(max(cnt), 0) INTO v_best
  FROM (SELECT island, count(*) AS cnt FROM grp GROUP BY island) s;

  RETURN jsonb_build_object(
    'lifetime', COALESCE(v_life, '{}'::jsonb)
                || jsonb_build_object('current_streak_days', v_streak,
                                      'best_streak_days', v_best,
                                      'mastered', (SELECT count(*) FROM public.spelling_lab_mastery
                                                   WHERE student_id = v_sid AND state = 'mastered')),
    'daily',    COALESCE(v_daily, '[]'::jsonb),
    'recent',   COALESCE(v_recent, '[]'::jsonb)
  );
END;
$$;

-- ── Strength report — bucket every attempted word into weakest / middle /
--    strongest by accuracy (mastered always counts as strongest).
DROP FUNCTION IF EXISTS public.spelling_lab_strength_report();
CREATE FUNCTION public.spelling_lab_strength_report()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sid uuid := auth.uid();
  v_out jsonb;
BEGIN
  IF v_sid IS NULL THEN RETURN NULL; END IF;

  WITH scored AS (
    SELECT w.word_en, w.meaning_ar, m.state, m.attempts_total, m.attempts_correct,
           m.current_streak,
           CASE WHEN m.attempts_total > 0
                THEN round(100.0 * m.attempts_correct / m.attempts_total)
                ELSE 0 END AS accuracy_pct,
           CASE
             WHEN m.state = 'mastered' THEN 'strongest'
             WHEN m.attempts_total > 0
                  AND (m.attempts_correct::numeric / m.attempts_total) >= 0.85 THEN 'strongest'
             WHEN m.attempts_total > 0
                  AND (m.attempts_correct::numeric / m.attempts_total) >= 0.50 THEN 'middle'
             ELSE 'weakest'
           END AS bucket
    FROM public.spelling_lab_mastery m
    JOIN public.spelling_lab_words w ON w.id = m.word_id
    WHERE m.student_id = v_sid AND m.attempts_total > 0
  ),
  ranked AS (
    SELECT *,
           CASE bucket
             -- weakest: most-broken first; strongest: best first; middle: by accuracy
             WHEN 'weakest' THEN row_number() OVER (PARTITION BY bucket
                                  ORDER BY accuracy_pct ASC, attempts_total DESC)
             WHEN 'strongest' THEN row_number() OVER (PARTITION BY bucket
                                  ORDER BY accuracy_pct DESC, attempts_total DESC)
             ELSE row_number() OVER (PARTITION BY bucket
                                  ORDER BY accuracy_pct ASC, attempts_total DESC)
           END AS rn
    FROM scored
  )
  SELECT jsonb_build_object(
    'counts', jsonb_build_object(
      'weakest',   count(*) FILTER (WHERE bucket = 'weakest'),
      'middle',    count(*) FILTER (WHERE bucket = 'middle'),
      'strongest', count(*) FILTER (WHERE bucket = 'strongest'),
      'total',     count(*)
    ),
    'weakest',   COALESCE(jsonb_agg(jsonb_build_object(
                   'word_en', word_en, 'meaning_ar', meaning_ar,
                   'accuracy_pct', accuracy_pct, 'attempts', attempts_total)
                   ORDER BY accuracy_pct ASC, attempts_total DESC)
                   FILTER (WHERE bucket = 'weakest' AND rn <= 30), '[]'::jsonb),
    'middle',    COALESCE(jsonb_agg(jsonb_build_object(
                   'word_en', word_en, 'meaning_ar', meaning_ar,
                   'accuracy_pct', accuracy_pct, 'attempts', attempts_total)
                   ORDER BY accuracy_pct ASC, attempts_total DESC)
                   FILTER (WHERE bucket = 'middle' AND rn <= 30), '[]'::jsonb),
    'strongest', COALESCE(jsonb_agg(jsonb_build_object(
                   'word_en', word_en, 'meaning_ar', meaning_ar,
                   'accuracy_pct', accuracy_pct, 'attempts', attempts_total)
                   ORDER BY accuracy_pct DESC, attempts_total DESC)
                   FILTER (WHERE bucket = 'strongest' AND rn <= 30), '[]'::jsonb)
  ) INTO v_out
  FROM ranked;

  RETURN COALESCE(v_out, jsonb_build_object(
    'counts', jsonb_build_object('weakest',0,'middle',0,'strongest',0,'total',0),
    'weakest','[]'::jsonb,'middle','[]'::jsonb,'strongest','[]'::jsonb));
END;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.spelling_lab_select_session(text, int, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spelling_lab_select_weak(int)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.spelling_lab_overview()                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.spelling_lab_activity_report()                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.spelling_lab_strength_report()                  TO authenticated;
