-- ════════════════════════════════════════════════════════════════════════════
-- SPELLING LAB RPCs (prompt 09, Surface 3) — all SECURITY DEFINER, search_path=public.
-- Student identity is derived from auth.uid() inside each function (never trusted
-- from a parameter), so an authenticated student can only ever act on their own
-- mastery/attempts. Namespaced spelling_lab_* to avoid colliding with the legacy
-- spelling trainer. Idempotent (CREATE OR REPLACE / DROP IF EXISTS).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Spelling level: 1 per 5 mastered words, capped 1..50 (pure derivation) ──
CREATE OR REPLACE FUNCTION public.spelling_lab_level_of(p_student_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(1, LEAST(50,
    1 + (SELECT count(*) FROM public.spelling_lab_mastery
         WHERE student_id = p_student_id AND state = 'mastered')::int / 5
  ));
$$;

CREATE OR REPLACE FUNCTION public.spelling_lab_student_level()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.spelling_lab_level_of(auth.uid());
$$;

-- ── Session selection: 60% due reviews / 30% new at level / 10% slightly harder,
--    with graceful fallback fill. Always returns up to p_size rows. ───────────
DROP FUNCTION IF EXISTS public.spelling_lab_select_session(text, int);
CREATE FUNCTION public.spelling_lab_select_session(p_mode text DEFAULT NULL, p_size int DEFAULT 10)
RETURNS TABLE (
  id uuid, word_en text, audio_url text, ipa text,
  meaning_ar text, example_en text, difficulty smallint, category text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sid  uuid := auth.uid();
  v_lv   int;
  v_n    int  := GREATEST(1, COALESCE(p_size, 10));
  v_ids  uuid[] := '{}';
  v_need int;
BEGIN
  IF v_sid IS NULL THEN RETURN; END IF;
  v_lv := public.spelling_lab_level_of(v_sid);

  -- 1) due reviews (up to 60%)
  v_ids := ARRAY(
    SELECT m.word_id FROM public.spelling_lab_mastery m
    WHERE m.student_id = v_sid AND m.due_at IS NOT NULL AND m.due_at <= now()
      AND m.state IN ('learning','reviewing')
    ORDER BY m.due_at ASC
    LIMIT CEIL(v_n * 0.6)::int
  );

  -- 2) new words at/under (level+1), fill toward 90%
  v_need := LEAST(ROUND(v_n * 0.9)::int, v_n) - cardinality(v_ids);
  IF v_need > 0 THEN
    v_ids := v_ids || ARRAY(
      SELECT w.id FROM public.spelling_lab_words w
      WHERE w.difficulty <= v_lv + 1
        AND NOT (w.id = ANY(v_ids))
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
        AND NOT (w.id = ANY(v_ids))
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
      WHERE NOT (w.id = ANY(v_ids))
        AND NOT EXISTS (SELECT 1 FROM public.spelling_lab_mastery m
                        WHERE m.student_id = v_sid AND m.word_id = w.id)
      ORDER BY random() LIMIT v_need
    );
  END IF;

  -- 5) absolute fallback (everything already seen): re-surface any word
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

-- ── Record one attempt: logs it, computes correctness, upserts Anki-lite state.
--    Returns { is_correct, correct_spelling, mastery }. ───────────────────────
DROP FUNCTION IF EXISTS public.spelling_lab_record_attempt(uuid, text, text, int);
CREATE FUNCTION public.spelling_lab_record_attempt(
  p_word_id uuid, p_mode text, p_attempt_text text, p_ms_to_submit int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sid     uuid := auth.uid();
  v_word_en text;
  v_correct boolean;
  v_mastery jsonb;
BEGIN
  IF v_sid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_mode NOT IN ('listen_type','see_retype') THEN RAISE EXCEPTION 'invalid mode %', p_mode; END IF;

  SELECT word_en INTO v_word_en FROM public.spelling_lab_words WHERE id = p_word_id;
  IF v_word_en IS NULL THEN RAISE EXCEPTION 'word not found'; END IF;

  v_correct := lower(trim(COALESCE(p_attempt_text, ''))) = lower(v_word_en);

  INSERT INTO public.spelling_lab_attempts (student_id, word_id, mode, attempt_text, is_correct, ms_to_submit)
  VALUES (v_sid, p_word_id, p_mode, COALESCE(p_attempt_text, ''), v_correct, p_ms_to_submit);

  INSERT INTO public.spelling_lab_mastery (
    student_id, word_id, attempts_total, attempts_correct, current_streak, best_streak,
    state, due_at, last_seen_at, last_correct_at, updated_at
  )
  VALUES (
    v_sid, p_word_id, 1,
    CASE WHEN v_correct THEN 1 ELSE 0 END,
    CASE WHEN v_correct THEN 1 ELSE 0 END,
    CASE WHEN v_correct THEN 1 ELSE 0 END,
    CASE WHEN v_correct THEN 'learning' ELSE 'reviewing' END,
    CASE WHEN v_correct THEN now() + interval '1 day' ELSE now() + interval '10 minutes' END,
    now(),
    CASE WHEN v_correct THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (student_id, word_id) DO UPDATE SET
    attempts_total   = public.spelling_lab_mastery.attempts_total + 1,
    attempts_correct = public.spelling_lab_mastery.attempts_correct + (CASE WHEN v_correct THEN 1 ELSE 0 END),
    current_streak   = CASE WHEN v_correct THEN public.spelling_lab_mastery.current_streak + 1 ELSE 0 END,
    best_streak      = GREATEST(public.spelling_lab_mastery.best_streak,
                                CASE WHEN v_correct THEN public.spelling_lab_mastery.current_streak + 1 ELSE 0 END),
    state = CASE
              WHEN v_correct AND public.spelling_lab_mastery.current_streak + 1 >= 3 THEN 'mastered'
              ELSE 'reviewing'
            END,
    due_at = CASE
              WHEN v_correct AND public.spelling_lab_mastery.current_streak + 1 >= 3 THEN NULL      -- mastered → leave queue
              WHEN v_correct THEN now() + interval '1 day'                                          -- spaced review
              ELSE now() + interval '10 minutes'                                                    -- short retry window
            END,
    last_seen_at    = now(),
    last_correct_at = CASE WHEN v_correct THEN now() ELSE public.spelling_lab_mastery.last_correct_at END,
    updated_at      = now();

  SELECT to_jsonb(m) INTO v_mastery FROM public.spelling_lab_mastery m
   WHERE m.student_id = v_sid AND m.word_id = p_word_id;

  RETURN jsonb_build_object('is_correct', v_correct, 'correct_spelling', v_word_en, 'mastery', v_mastery);
END;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.spelling_lab_level_of(uuid)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.spelling_lab_student_level()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.spelling_lab_select_session(text, int)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.spelling_lab_record_attempt(uuid, text, text, int) TO authenticated;
