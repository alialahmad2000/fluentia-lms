-- =============================================================
-- MOCK EXAM — Trainer-controlled reveal + manual writing score
-- 3 new columns on mock_exam_attempts, 3 new RPCs (SECURITY DEFINER)
-- Idempotent: safe to re-run.
-- =============================================================

ALTER TABLE public.mock_exam_attempts
  ADD COLUMN IF NOT EXISTS is_revealed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS revealed_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_attempts_exam_revealed
  ON public.mock_exam_attempts(exam_id, is_revealed)
  WHERE is_submitted = true;

-- =============================================================
-- RPC: mock_exam_reveal(attempt_id OR exam_code, reveal)
-- Trainer/admin only. Single or batch.
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_reveal(
  p_attempt_id uuid DEFAULT NULL,
  p_exam_code  text DEFAULT NULL,
  p_reveal     boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role    text;
  v_count   int := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role NOT IN ('admin','trainer') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_attempt_id IS NOT NULL THEN
    UPDATE public.mock_exam_attempts
       SET is_revealed = p_reveal,
           revealed_at = CASE WHEN p_reveal THEN now() ELSE NULL END,
           revealed_by = CASE WHEN p_reveal THEN v_user_id ELSE NULL END,
           updated_at  = now()
     WHERE id = p_attempt_id
       AND is_submitted = true;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF p_exam_code IS NOT NULL THEN
    UPDATE public.mock_exam_attempts a
       SET is_revealed = p_reveal,
           revealed_at = CASE WHEN p_reveal THEN now() ELSE NULL END,
           revealed_by = CASE WHEN p_reveal THEN v_user_id ELSE NULL END,
           updated_at  = now()
      FROM public.mock_exams e
     WHERE a.exam_id = e.id
       AND e.code    = p_exam_code
       AND a.is_submitted = true;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'missing_parameters: provide p_attempt_id or p_exam_code';
  END IF;

  RETURN jsonb_build_object('count', v_count, 'revealed', p_reveal);
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_reveal(uuid, text, boolean) TO authenticated;

-- =============================================================
-- RPC: mock_exam_get_result(attempt_id)
-- Returns full per-question detail. Gates students by is_revealed.
-- Always returns full detail for admin/trainer.
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_get_result(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_attempt  public.mock_exam_attempts%ROWTYPE;
  v_exam     public.mock_exams%ROWTYPE;
  v_role     text;
  v_is_staff boolean;
  v_questions jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  v_is_staff := v_role IN ('admin','trainer');

  IF NOT v_is_staff AND v_attempt.student_id <> v_user_id THEN
    RAISE EXCEPTION 'not_your_attempt';
  END IF;

  SELECT * INTO v_exam FROM public.mock_exams WHERE id = v_attempt.exam_id;

  -- Student + not revealed → pending screen
  IF NOT v_is_staff AND NOT v_attempt.is_revealed THEN
    RETURN jsonb_build_object(
      'attempt_id',   v_attempt.id,
      'exam_code',    v_exam.code,
      'exam_title',   v_exam.title_ar,
      'is_submitted', v_attempt.is_submitted,
      'submitted_at', v_attempt.submitted_at,
      'is_revealed',  false,
      'pending_review', true
    );
  END IF;

  -- Full detail
  SELECT jsonb_agg(
    jsonb_build_object(
      'question_id',            q.id,
      'section',                q.section,
      'order_index',            q.order_index,
      'question_type',          q.question_type,
      'stem',                   q.stem,
      'options',                q.options,
      'passage_text',           q.passage_text,
      'passage_title',          q.passage_title,
      'passage_group',          q.passage_group,
      'correct_index',          q.correct_index,
      'acceptable_answers',     q.acceptable_answers,
      'points',                 q.points,
      'writing_min_words',      q.writing_min_words,
      'student_selected_index', ans.selected_index,
      'student_text_answer',    ans.text_answer,
      'is_correct',             ans.is_correct,
      'points_awarded',         ans.points_awarded
    )
    ORDER BY
      CASE q.section
        WHEN 'reading'    THEN 1
        WHEN 'vocabulary' THEN 2
        WHEN 'spelling'   THEN 3
        WHEN 'grammar'    THEN 4
        WHEN 'writing'    THEN 5
      END,
      q.order_index
  ) INTO v_questions
  FROM public.mock_exam_questions q
  LEFT JOIN public.mock_exam_answers ans
    ON ans.question_id = q.id AND ans.attempt_id = p_attempt_id
  WHERE q.exam_id = v_attempt.exam_id;

  RETURN jsonb_build_object(
    'attempt_id',          v_attempt.id,
    'exam_code',           v_exam.code,
    'exam_title',          v_exam.title_ar,
    'is_submitted',        v_attempt.is_submitted,
    'is_revealed',         v_attempt.is_revealed,
    'revealed_at',         v_attempt.revealed_at,
    'submitted_at',        v_attempt.submitted_at,
    'score_total',         v_attempt.score_total,
    'score_grammar',       v_attempt.score_grammar,
    'score_reading',       v_attempt.score_reading,
    'score_vocabulary',    v_attempt.score_vocabulary,
    'score_spelling',      v_attempt.score_spelling,
    'score_writing',       v_attempt.score_writing,
    'passed',              v_attempt.passed,
    'pass_threshold',      v_exam.pass_threshold,
    'writing_response',    v_attempt.writing_response,
    'writing_word_count',  v_attempt.writing_word_count,
    'manual_writing_score', v_attempt.manual_writing_score,
    'min_writing_words',   v_exam.min_writing_words,
    'questions',           v_questions,
    'pending_review',      false,
    'viewer_is_staff',     v_is_staff
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_get_result(uuid) TO authenticated;

-- =============================================================
-- RPC: mock_exam_set_manual_writing_score(attempt_id, score)
-- Trainer/admin only. Recomputes score_total + passed.
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_set_manual_writing_score(
  p_attempt_id uuid,
  p_score      numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_role         text;
  v_attempt      public.mock_exam_attempts%ROWTYPE;
  v_exam         public.mock_exams%ROWTYPE;
  v_max_writing  numeric;
  v_new_total    numeric;
  v_new_passed   boolean;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role NOT IN ('admin','trainer') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  IF NOT v_attempt.is_submitted THEN RAISE EXCEPTION 'not_submitted'; END IF;

  SELECT * INTO v_exam FROM public.mock_exams WHERE id = v_attempt.exam_id;
  SELECT points INTO v_max_writing
    FROM public.mock_exam_questions
   WHERE exam_id = v_attempt.exam_id AND section = 'writing'
   LIMIT 1;

  IF p_score < 0 OR p_score > v_max_writing THEN
    RAISE EXCEPTION 'score_out_of_range (0..%)', v_max_writing;
  END IF;

  v_new_total :=
      COALESCE(v_attempt.score_grammar,    0)
    + COALESCE(v_attempt.score_reading,    0)
    + COALESCE(v_attempt.score_vocabulary, 0)
    + COALESCE(v_attempt.score_spelling,   0)
    + p_score;
  v_new_passed := v_new_total >= v_exam.pass_threshold;

  UPDATE public.mock_exam_attempts
     SET manual_writing_score = p_score,
         score_writing        = p_score,
         score_total          = ROUND(v_new_total, 2),
         passed               = v_new_passed,
         updated_at           = now()
   WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id',    p_attempt_id,
    'score_writing', p_score,
    'score_total',   ROUND(v_new_total, 2),
    'passed',        v_new_passed
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_set_manual_writing_score(uuid, numeric) TO authenticated;
