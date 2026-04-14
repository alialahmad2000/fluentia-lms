-- LEGENDARY-C1: SRS Engine (SM-2) — extend student_saved_words
-- Adds spaced repetition columns to existing personal vocabulary table
-- Algorithm: SM-2 (Anki base), 4-button grading, invisible to student

-- ══════════════════════════════════════════════════════════
-- PHASE 1: Extend student_saved_words with SRS columns
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.student_saved_words
  ADD COLUMN IF NOT EXISTS ease_factor numeric NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetition integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mastered_at timestamptz,
  ADD COLUMN IF NOT EXISTS curriculum_vocabulary_id uuid REFERENCES public.curriculum_vocabulary(id) ON DELETE SET NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ssw_due
  ON public.student_saved_words (student_id, next_review_at)
  WHERE mastered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ssw_student_added
  ON public.student_saved_words (student_id, created_at DESC);

-- Backfill existing rows: make them due immediately for first review
UPDATE public.student_saved_words
SET next_review_at = COALESCE(next_review_at, now()),
    source = COALESCE(source, 'manual')
WHERE ease_factor = 2.5 AND repetition = 0 AND interval_days = 0;

-- Try to backfill curriculum_vocabulary_id from word match
UPDATE public.student_saved_words ssw
SET curriculum_vocabulary_id = cv.id
FROM public.curriculum_vocabulary cv
WHERE LOWER(ssw.word) = LOWER(cv.word)
  AND ssw.curriculum_vocabulary_id IS NULL;


-- ══════════════════════════════════════════════════════════
-- PHASE 2: SRS Core Function (SM-2 algorithm)
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.srs_review_word(
  p_word_id uuid,
  p_quality int  -- 0-5
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row        record;
  v_ef         numeric;
  v_interval   int;
  v_rep        int;
  v_quality    int := GREATEST(0, LEAST(5, p_quality));
  v_next_at    timestamptz;
  v_mastered   timestamptz;
  v_student    uuid;
BEGIN
  SELECT * INTO v_row FROM public.student_saved_words
  WHERE id = p_word_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Word not found: %', p_word_id;
  END IF;

  IF v_row.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_student := v_row.student_id;
  v_ef := v_row.ease_factor;
  v_rep := v_row.repetition;
  v_interval := v_row.interval_days;

  IF v_quality < 3 THEN
    v_rep := 0;
    v_interval := 1;
    v_ef := GREATEST(1.3, v_ef - 0.2);
  ELSE
    IF v_rep = 0 THEN v_interval := 1;
    ELSIF v_rep = 1 THEN v_interval := 6;
    ELSE v_interval := GREATEST(1, ROUND(v_interval * v_ef))::int;
    END IF;
    v_rep := v_rep + 1;
    v_ef := GREATEST(1.3,
              v_ef + (0.1 - (5 - v_quality) * (0.08 + (5 - v_quality) * 0.02)));
  END IF;

  v_next_at := now() + (v_interval || ' days')::interval;

  v_mastered := CASE
    WHEN v_rep >= 5 AND v_interval >= 21 THEN now()
    ELSE NULL
  END;

  UPDATE public.student_saved_words SET
    ease_factor = v_ef,
    interval_days = v_interval,
    repetition = v_rep,
    next_review_at = v_next_at,
    last_reviewed_at = now(),
    review_count = review_count + 1,
    success_count = success_count + CASE WHEN v_quality >= 3 THEN 1 ELSE 0 END,
    failure_count = failure_count + CASE WHEN v_quality < 3 THEN 1 ELSE 0 END,
    mastered_at = COALESCE(mastered_at, v_mastered)
  WHERE id = p_word_id;

  -- Log activity (skill radar + XP)
  PERFORM public.log_activity(
    v_student,
    CASE WHEN v_mastered IS NOT NULL AND v_row.mastered_at IS NULL
         THEN 'vocab_mastered' ELSE 'vocab_reviewed' END,
    NULL,
    'student_saved_words',
    p_word_id,
    CASE
      WHEN v_mastered IS NOT NULL AND v_row.mastered_at IS NULL THEN 15
      WHEN v_quality >= 3 THEN 3
      ELSE 1
    END,
    jsonb_build_object('vocabulary', CASE WHEN v_quality >= 3 THEN 1 ELSE 0 END),
    jsonb_build_object(
      'quality', v_quality,
      'interval_days', v_interval,
      'ease_factor', v_ef,
      'repetition', v_rep
    )
  );

  RETURN jsonb_build_object(
    'ease_factor', v_ef,
    'interval_days', v_interval,
    'repetition', v_rep,
    'next_review_at', v_next_at,
    'mastered', v_mastered IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.srs_review_word(uuid, int) TO authenticated;


-- ══════════════════════════════════════════════════════════
-- PHASE 3: Helper RPCs
-- ══════════════════════════════════════════════════════════

-- 3.1 Get due words
CREATE OR REPLACE FUNCTION public.srs_get_due(
  p_student_id uuid DEFAULT NULL,
  p_limit      int  DEFAULT 20
) RETURNS TABLE(
  id uuid, word text, meaning text, context_sentence text,
  curriculum_vocabulary_id uuid,
  audio_url text, example_sentence text, definition_ar text,
  repetition int, ease_factor numeric, interval_days int,
  next_review_at timestamptz, source text, review_count int
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student uuid := COALESCE(p_student_id, auth.uid());
BEGIN
  RETURN QUERY
  SELECT ssw.id, ssw.word, ssw.meaning, ssw.context_sentence,
         ssw.curriculum_vocabulary_id,
         cv.audio_url, cv.example_sentence, cv.definition_ar,
         ssw.repetition, ssw.ease_factor, ssw.interval_days,
         ssw.next_review_at, ssw.source, ssw.review_count
  FROM public.student_saved_words ssw
  LEFT JOIN public.curriculum_vocabulary cv ON cv.id = ssw.curriculum_vocabulary_id
  WHERE ssw.student_id = v_student
    AND ssw.mastered_at IS NULL
    AND ssw.next_review_at <= now()
  ORDER BY ssw.next_review_at ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.srs_get_due(uuid, int) TO authenticated;

-- 3.2 Counts for widget
CREATE OR REPLACE FUNCTION public.srs_get_counts(
  p_student_id uuid DEFAULT NULL
) RETURNS TABLE(
  due_today int,
  learning int,
  mastered int,
  new_last_7d int,
  reviewed_today int
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (SELECT COALESCE($1, auth.uid()) AS sid),
  riyadh_today AS (SELECT (now() AT TIME ZONE 'Asia/Riyadh')::date AS d)
  SELECT
    (SELECT COUNT(*) FROM public.student_saved_words ssw, s
     WHERE ssw.student_id = s.sid AND ssw.mastered_at IS NULL AND ssw.next_review_at <= now())::int,
    (SELECT COUNT(*) FROM public.student_saved_words ssw, s
     WHERE ssw.student_id = s.sid AND ssw.mastered_at IS NULL)::int,
    (SELECT COUNT(*) FROM public.student_saved_words ssw, s
     WHERE ssw.student_id = s.sid AND ssw.mastered_at IS NOT NULL)::int,
    (SELECT COUNT(*) FROM public.student_saved_words ssw, s
     WHERE ssw.student_id = s.sid AND ssw.created_at >= now() - interval '7 days')::int,
    (SELECT COUNT(*) FROM public.student_saved_words ssw, s, riyadh_today
     WHERE ssw.student_id = s.sid
       AND (ssw.last_reviewed_at AT TIME ZONE 'Asia/Riyadh')::date = riyadh_today.d)::int
  ;
$$;

GRANT EXECUTE ON FUNCTION public.srs_get_counts(uuid) TO authenticated;


-- ══════════════════════════════════════════════════════════
-- PHASE 6: RLS updates (additive — existing policies stay)
-- ══════════════════════════════════════════════════════════

-- Trainer reads their group students' vocab
DROP POLICY IF EXISTS "Trainer reads group saved words" ON public.student_saved_words;
CREATE POLICY "Trainer reads group saved words" ON public.student_saved_words
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students st
    JOIN public.groups g ON g.id = st.group_id
    WHERE st.id = student_saved_words.student_id AND g.trainer_id = auth.uid()
  ));
