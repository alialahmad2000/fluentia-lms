-- =============================================================
-- MOCK EXAM — AI-powered writing grading + smart fallback
-- 6 new columns on mock_exam_attempts, 1 new log table, 1 new RPC,
-- and surgical CREATE OR REPLACE on mock_exam_submit + mock_exam_get_result.
-- Idempotent: safe to re-run.
-- =============================================================

ALTER TABLE public.mock_exam_attempts
  ADD COLUMN IF NOT EXISTS ai_writing_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS ai_writing_justification_ar text,
  ADD COLUMN IF NOT EXISTS ai_writing_strengths_ar jsonb,
  ADD COLUMN IF NOT EXISTS ai_writing_improvements_ar jsonb,
  ADD COLUMN IF NOT EXISTS ai_writing_graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_writing_status text NOT NULL DEFAULT 'pending'
    CHECK (ai_writing_status IN ('pending','graded','fallback','manual','failed'));

CREATE INDEX IF NOT EXISTS idx_mock_exam_attempts_ai_writing_status
  ON public.mock_exam_attempts(ai_writing_status)
  WHERE is_submitted = true;

-- ── Audit log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mock_exam_ai_writing_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id    uuid REFERENCES public.mock_exam_attempts(id) ON DELETE CASCADE,
  status        text NOT NULL CHECK (status IN ('success','retry','fallback','error')),
  layer         text NOT NULL CHECK (layer IN ('primary','retry','fallback')),
  score         numeric(5,2),
  ai_model      text,
  prompt_tokens int,
  output_tokens int,
  error_message text,
  raw_response  text,
  duration_ms   int,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_exam_ai_writing_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS me_ai_log_staff ON public.mock_exam_ai_writing_log;
CREATE POLICY me_ai_log_staff ON public.mock_exam_ai_writing_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

CREATE INDEX IF NOT EXISTS idx_mock_exam_ai_writing_log_attempt
  ON public.mock_exam_ai_writing_log(attempt_id, created_at);

-- ── RPC: apply AI writing score (called by edge function via service_role) ──
CREATE OR REPLACE FUNCTION public.mock_exam_apply_ai_writing_score(
  p_attempt_id    uuid,
  p_score         numeric,
  p_justification text,
  p_strengths     jsonb,
  p_improvements  jsonb,
  p_status        text DEFAULT 'graded'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt       public.mock_exam_attempts%ROWTYPE;
  v_exam          public.mock_exams%ROWTYPE;
  v_max_writing   numeric;
  v_writing_final numeric;
  v_new_total     numeric;
  v_new_passed    boolean;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role IN ('admin','trainer')
    ) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  IF p_status NOT IN ('graded','fallback','failed') THEN
    RAISE EXCEPTION 'invalid_status: %', p_status;
  END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  IF NOT v_attempt.is_submitted THEN RAISE EXCEPTION 'not_submitted'; END IF;

  SELECT * INTO v_exam FROM public.mock_exams WHERE id = v_attempt.exam_id;
  SELECT points INTO v_max_writing
    FROM public.mock_exam_questions
   WHERE exam_id = v_attempt.exam_id AND section = 'writing'
   LIMIT 1;

  IF p_score IS NULL OR p_score < 0 THEN p_score := 0; END IF;
  IF p_score > v_max_writing THEN p_score := v_max_writing; END IF;

  -- Manual override always wins (the trainer's call is authoritative).
  -- AI fields still update for reference; final writing_score reflects manual.
  IF v_attempt.manual_writing_score IS NOT NULL THEN
    v_writing_final := v_attempt.manual_writing_score;
  ELSE
    v_writing_final := p_score;
  END IF;

  v_new_total :=
      COALESCE(v_attempt.score_grammar,    0)
    + COALESCE(v_attempt.score_reading,    0)
    + COALESCE(v_attempt.score_vocabulary, 0)
    + COALESCE(v_attempt.score_spelling,   0)
    + v_writing_final;
  v_new_passed := v_new_total >= v_exam.pass_threshold;

  UPDATE public.mock_exam_attempts
     SET ai_writing_score          = p_score,
         ai_writing_justification_ar = p_justification,
         ai_writing_strengths_ar   = p_strengths,
         ai_writing_improvements_ar = p_improvements,
         ai_writing_status         = p_status,
         ai_writing_graded_at      = now(),
         score_writing             = v_writing_final,
         score_total               = ROUND(v_new_total, 2),
         passed                    = v_new_passed,
         updated_at                = now()
   WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id',          p_attempt_id,
    'ai_writing_score',    p_score,
    'final_writing_score', v_writing_final,
    'score_total',         ROUND(v_new_total, 2),
    'passed',              v_new_passed,
    'status',              p_status,
    'overridden_by_manual',(v_attempt.manual_writing_score IS NOT NULL)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_apply_ai_writing_score(uuid, numeric, text, jsonb, jsonb, text)
  TO authenticated, service_role;

-- ── Surgical replacement: mock_exam_submit ──────────────────
-- ONLY the writing-score block changes:
--   OLD: full marks if writing_word_count >= min; else 0; manual override wins
--   NEW: initial writing score is 0; manual override wins; AI grader fills in async
-- Plus a final UPDATE that ensures ai_writing_status='pending' on first submit
-- (idempotent — won't reset 'graded'/'fallback'/'manual'/'failed').
CREATE OR REPLACE FUNCTION public.mock_exam_submit(p_attempt_id uuid, p_auto boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt   public.mock_exam_attempts%ROWTYPE;
  v_exam      public.mock_exams%ROWTYPE;
  v_grammar   numeric := 0;
  v_reading   numeric := 0;
  v_vocab     numeric := 0;
  v_spelling  numeric := 0;
  v_writing   numeric := 0;
  v_total     numeric := 0;
  v_passed    boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  IF v_attempt.student_id <> auth.uid() THEN RAISE EXCEPTION 'attempt_not_yours'; END IF;

  -- Idempotent re-call: return existing scores
  IF v_attempt.is_submitted THEN
    RETURN jsonb_build_object(
      'attempt_id',     v_attempt.id,
      'score_total',    v_attempt.score_total,
      'score_grammar',  v_attempt.score_grammar,
      'score_reading',  v_attempt.score_reading,
      'score_vocabulary', v_attempt.score_vocabulary,
      'score_spelling', v_attempt.score_spelling,
      'score_writing',  v_attempt.score_writing,
      'passed',         v_attempt.passed,
      'pass_threshold', (SELECT pass_threshold FROM public.mock_exams WHERE id = v_attempt.exam_id),
      'idempotent',     true
    );
  END IF;

  SELECT * INTO v_exam FROM public.mock_exams WHERE id = v_attempt.exam_id;

  UPDATE public.mock_exam_answers a
  SET
    is_correct = CASE
      WHEN q.question_type IN ('mcq','true_false','true_false_ng','error_detection')
        THEN a.selected_index IS NOT NULL AND a.selected_index = q.correct_index
      WHEN q.question_type = 'fill_blank'
        THEN a.text_answer IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(q.acceptable_answers) AS aa(val)
               WHERE lower(trim(aa.val)) = lower(trim(a.text_answer))
             )
      ELSE NULL
    END,
    points_awarded = CASE
      WHEN q.question_type IN ('mcq','true_false','true_false_ng','error_detection')
        THEN CASE WHEN a.selected_index = q.correct_index THEN q.points ELSE 0 END
      WHEN q.question_type = 'fill_blank'
        THEN CASE WHEN EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(q.acceptable_answers) AS aa(val)
               WHERE lower(trim(aa.val)) = lower(trim(coalesce(a.text_answer,'')))
             ) THEN q.points ELSE 0 END
      ELSE 0
    END
  FROM public.mock_exam_questions q
  WHERE q.id = a.question_id
    AND a.attempt_id = p_attempt_id;

  SELECT
    COALESCE(SUM(CASE WHEN q.section='grammar'    THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='reading'    THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='vocabulary' THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='spelling'   THEN a.points_awarded END), 0)
  INTO v_grammar, v_reading, v_vocab, v_spelling
  FROM public.mock_exam_answers a
  JOIN public.mock_exam_questions q ON q.id = a.question_id
  WHERE a.attempt_id = p_attempt_id;

  -- Writing: starts at 0 (AI grader will update async via mock_exam_apply_ai_writing_score).
  -- Manual override still wins if it was set pre-submit (rare edge case).
  IF v_attempt.manual_writing_score IS NOT NULL THEN
    v_writing := v_attempt.manual_writing_score;
  ELSE
    v_writing := 0;
  END IF;

  v_total  := ROUND(v_grammar + v_reading + v_vocab + v_spelling + v_writing, 2);
  v_passed := v_total >= v_exam.pass_threshold;

  UPDATE public.mock_exam_attempts
  SET is_submitted = true,
      is_auto_submitted = p_auto,
      submitted_at = now(),
      score_grammar    = v_grammar,
      score_reading    = v_reading,
      score_vocabulary = v_vocab,
      score_spelling   = v_spelling,
      score_writing    = v_writing,
      score_total      = v_total,
      passed           = v_passed,
      updated_at       = now()
  WHERE id = p_attempt_id;

  -- Ensure ai_writing_status='pending' on first submit (idempotent — won't reset terminal states).
  UPDATE public.mock_exam_attempts
     SET ai_writing_status = 'pending'
   WHERE id = p_attempt_id
     AND (ai_writing_status IS NULL OR ai_writing_status NOT IN ('graded','fallback','manual','failed'));

  INSERT INTO public.mock_exam_audit_log(attempt_id, student_id, event, details)
  VALUES (p_attempt_id, auth.uid(), CASE WHEN p_auto THEN 'auto_submit' ELSE 'submit' END,
          jsonb_build_object('score_total', v_total, 'passed', v_passed));

  RETURN jsonb_build_object(
    'attempt_id',     p_attempt_id,
    'score_total',    v_total,
    'score_grammar',  v_grammar,
    'score_reading',  v_reading,
    'score_vocabulary', v_vocab,
    'score_spelling', v_spelling,
    'score_writing',  v_writing,
    'passed',         v_passed,
    'pass_threshold', v_exam.pass_threshold,
    'idempotent',     false
  );
END;
$$;

-- ── Surgical replacement: mock_exam_get_result ──────────────
-- Adds the 5 AI fields to the revealed-detail JSON. Pending branch unchanged.
CREATE OR REPLACE FUNCTION public.mock_exam_get_result(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_attempt   public.mock_exam_attempts%ROWTYPE;
  v_exam      public.mock_exams%ROWTYPE;
  v_role      text;
  v_is_staff  boolean;
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

  -- Student + not revealed → minimal pending response
  IF NOT v_is_staff AND NOT v_attempt.is_revealed THEN
    RETURN jsonb_build_object(
      'attempt_id',     v_attempt.id,
      'exam_code',      v_exam.code,
      'exam_title',     v_exam.title_ar,
      'is_submitted',   v_attempt.is_submitted,
      'submitted_at',   v_attempt.submitted_at,
      'is_revealed',    false,
      'pending_review', true
    );
  END IF;

  -- Full detail (revealed student or any staff)
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
    'attempt_id',            v_attempt.id,
    'exam_code',             v_exam.code,
    'exam_title',            v_exam.title_ar,
    'is_submitted',          v_attempt.is_submitted,
    'is_revealed',           v_attempt.is_revealed,
    'revealed_at',           v_attempt.revealed_at,
    'submitted_at',          v_attempt.submitted_at,
    'score_total',           v_attempt.score_total,
    'score_grammar',         v_attempt.score_grammar,
    'score_reading',         v_attempt.score_reading,
    'score_vocabulary',      v_attempt.score_vocabulary,
    'score_spelling',        v_attempt.score_spelling,
    'score_writing',         v_attempt.score_writing,
    'passed',                v_attempt.passed,
    'pass_threshold',        v_exam.pass_threshold,
    'writing_response',      v_attempt.writing_response,
    'writing_word_count',    v_attempt.writing_word_count,
    'manual_writing_score',  v_attempt.manual_writing_score,
    'min_writing_words',     v_exam.min_writing_words,
    -- AI writing fields (new in FIX-3)
    'ai_writing_score',          v_attempt.ai_writing_score,
    'ai_writing_status',         v_attempt.ai_writing_status,
    'ai_writing_justification_ar', v_attempt.ai_writing_justification_ar,
    'ai_writing_strengths_ar',   v_attempt.ai_writing_strengths_ar,
    'ai_writing_improvements_ar', v_attempt.ai_writing_improvements_ar,
    'ai_writing_graded_at',      v_attempt.ai_writing_graded_at,
    'questions',                 v_questions,
    'pending_review',            false,
    'viewer_is_staff',           v_is_staff
  );
END;
$$;

-- ── RPC: reset AI status (trainer/admin) — needed by retry button ──
CREATE OR REPLACE FUNCTION public.mock_exam_reset_ai_status(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role    text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role NOT IN ('admin','trainer') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.mock_exam_attempts
     SET ai_writing_status = 'pending',
         updated_at        = now()
   WHERE id = p_attempt_id
     AND is_submitted = true;

  RETURN jsonb_build_object('attempt_id', p_attempt_id, 'reset', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_reset_ai_status(uuid) TO authenticated;
