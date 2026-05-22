-- =============================================================
-- MOCK EXAM RPCs (SECURITY DEFINER)
-- 4 RPCs: start, save_answer, save_writing, submit
-- Idempotent via CREATE OR REPLACE
-- =============================================================

-- mock_exam_start(p_exam_code text) → jsonb
CREATE OR REPLACE FUNCTION public.mock_exam_start(p_exam_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id  uuid := auth.uid();
  v_profile     public.profiles%ROWTYPE;
  v_student     public.students%ROWTYPE;
  v_exam        public.mock_exams%ROWTYPE;
  v_attempt     public.mock_exam_attempts%ROWTYPE;
  v_now         timestamptz := now();
  v_expires     timestamptz;
  v_questions   jsonb;
  v_exam_level_number int;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_student_id;
  IF v_profile.role <> 'student' AND v_profile.role <> 'admin' AND v_profile.role <> 'trainer' THEN
    RAISE EXCEPTION 'not_a_student';
  END IF;

  SELECT * INTO v_exam FROM public.mock_exams WHERE code = p_exam_code AND is_active = true;
  IF v_exam.id IS NULL THEN
    RAISE EXCEPTION 'exam_not_found_or_inactive';
  END IF;

  -- Visibility gate: in 'preview' mode, only admins + test accounts proceed
  IF v_exam.visibility = 'preview'
     AND v_profile.role <> 'admin'
     AND COALESCE(v_profile.is_test_account, false) = false THEN
    RAISE EXCEPTION 'exam_in_preview_mode';
  END IF;

  -- Eligibility: resolve student level via students.academic_level → curriculum_levels.level_number.
  -- Admins + trainers bypass level check (so they can take the exam to verify it).
  IF v_profile.role = 'student' THEN
    SELECT * INTO v_student FROM public.students WHERE id = v_student_id;
    SELECT cl.level_number INTO v_exam_level_number
      FROM public.curriculum_levels cl WHERE cl.id = v_exam.level_id;
    IF v_student.id IS NULL OR v_student.academic_level <> v_exam_level_number THEN
      RAISE EXCEPTION 'student_level_mismatch';
    END IF;
  END IF;

  -- Window check
  IF v_now < v_exam.open_at THEN
    RAISE EXCEPTION 'exam_not_open_yet';
  END IF;
  IF v_now > v_exam.close_at THEN
    RAISE EXCEPTION 'exam_closed';
  END IF;

  -- Existing attempt?
  SELECT * INTO v_attempt
    FROM public.mock_exam_attempts
    WHERE exam_id = v_exam.id AND student_id = v_student_id;

  IF v_attempt.id IS NOT NULL THEN
    IF v_attempt.is_submitted THEN
      RAISE EXCEPTION 'already_submitted';
    END IF;
    v_expires := v_attempt.expires_at;
  ELSE
    v_expires := v_now + (v_exam.duration_minutes || ' minutes')::interval;
    IF v_expires > v_exam.close_at THEN
      v_expires := v_exam.close_at;
    END IF;

    INSERT INTO public.mock_exam_attempts(
      exam_id, student_id, started_at, expires_at, user_agent
    ) VALUES (
      v_exam.id, v_student_id, v_now, v_expires,
      COALESCE(current_setting('request.headers', true)::jsonb->>'user-agent', NULL)
    )
    RETURNING * INTO v_attempt;

    INSERT INTO public.mock_exam_audit_log(attempt_id, student_id, event, details)
    VALUES (v_attempt.id, v_student_id, 'start', jsonb_build_object('exam_code', p_exam_code));
  END IF;

  -- Fetch questions (no correct answers leaked)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',                 q.id,
      'section',            q.section,
      'order_index',        q.order_index,
      'question_type',      q.question_type,
      'passage_group',      q.passage_group,
      'passage_text',       q.passage_text,
      'passage_title',      q.passage_title,
      'stem',               q.stem,
      'options',            q.options,
      'writing_min_words',  q.writing_min_words,
      'points',             q.points
    )
    ORDER BY
      CASE q.section
        WHEN 'reading' THEN 1
        WHEN 'vocabulary' THEN 2
        WHEN 'grammar' THEN 3
        WHEN 'spelling' THEN 4
        WHEN 'writing' THEN 5
      END,
      q.order_index
  )
  INTO v_questions
  FROM public.mock_exam_questions q
  WHERE q.exam_id = v_exam.id;

  RETURN jsonb_build_object(
    'attempt_id',         v_attempt.id,
    'started_at',         v_attempt.started_at,
    'expires_at',         v_attempt.expires_at,
    'exam', jsonb_build_object(
      'code',             v_exam.code,
      'title_ar',         v_exam.title_ar,
      'subtitle_ar',      v_exam.subtitle_ar,
      'duration_minutes', v_exam.duration_minutes,
      'pass_threshold',   v_exam.pass_threshold,
      'total_points',     v_exam.total_points,
      'min_writing_words',v_exam.min_writing_words
    ),
    'questions',          COALESCE(v_questions, '[]'::jsonb),
    'saved_answers',      (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'question_id', a.question_id,
        'selected_index', a.selected_index,
        'text_answer', a.text_answer
      )), '[]'::jsonb)
      FROM public.mock_exam_answers a
      WHERE a.attempt_id = v_attempt.id
    ),
    'writing_response',   v_attempt.writing_response,
    'server_now',         v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_start(text) TO authenticated;

-- mock_exam_save_answer
CREATE OR REPLACE FUNCTION public.mock_exam_save_answer(
  p_attempt_id    uuid,
  p_question_id   uuid,
  p_selected_index int,
  p_text_answer   text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.mock_exam_attempts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL OR v_attempt.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'attempt_not_yours';
  END IF;
  IF v_attempt.is_submitted THEN
    RAISE EXCEPTION 'already_submitted';
  END IF;
  IF now() > v_attempt.expires_at THEN
    RAISE EXCEPTION 'time_expired';
  END IF;

  INSERT INTO public.mock_exam_answers (attempt_id, question_id, selected_index, text_answer)
  VALUES (p_attempt_id, p_question_id, p_selected_index, p_text_answer)
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET selected_index = EXCLUDED.selected_index,
                text_answer    = EXCLUDED.text_answer,
                updated_at     = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_save_answer(uuid, uuid, int, text) TO authenticated;

-- mock_exam_save_writing
CREATE OR REPLACE FUNCTION public.mock_exam_save_writing(
  p_attempt_id  uuid,
  p_writing_text text
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.mock_exam_attempts%ROWTYPE;
  v_words   int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL OR v_attempt.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'attempt_not_yours';
  END IF;
  IF v_attempt.is_submitted THEN RAISE EXCEPTION 'already_submitted'; END IF;
  IF now() > v_attempt.expires_at THEN RAISE EXCEPTION 'time_expired'; END IF;

  IF length(trim(coalesce(p_writing_text,''))) = 0 THEN
    v_words := 0;
  ELSE
    v_words := COALESCE(array_length(regexp_split_to_array(trim(p_writing_text), '\s+'), 1), 0);
  END IF;

  UPDATE public.mock_exam_attempts
  SET writing_response = p_writing_text,
      writing_word_count = v_words,
      updated_at = now()
  WHERE id = p_attempt_id;

  RETURN v_words;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_save_writing(uuid, text) TO authenticated;

-- mock_exam_submit
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
  v_writing_points numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  IF v_attempt.student_id <> auth.uid() THEN RAISE EXCEPTION 'attempt_not_yours'; END IF;

  IF v_attempt.is_submitted THEN
    RETURN jsonb_build_object(
      'attempt_id', v_attempt.id,
      'score_total', v_attempt.score_total,
      'score_grammar', v_attempt.score_grammar,
      'score_reading', v_attempt.score_reading,
      'score_vocabulary', v_attempt.score_vocabulary,
      'score_spelling', v_attempt.score_spelling,
      'score_writing', v_attempt.score_writing,
      'passed', v_attempt.passed,
      'pass_threshold', (SELECT pass_threshold FROM public.mock_exams WHERE id = v_attempt.exam_id),
      'idempotent', true
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

  SELECT points INTO v_writing_points
  FROM public.mock_exam_questions
  WHERE exam_id = v_exam.id AND section='writing'
  LIMIT 1;

  IF v_attempt.writing_word_count IS NOT NULL
     AND v_attempt.writing_word_count >= v_exam.min_writing_words THEN
    v_writing := v_writing_points;
  ELSE
    v_writing := 0;
  END IF;

  IF v_attempt.manual_writing_score IS NOT NULL THEN
    v_writing := v_attempt.manual_writing_score;
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

  INSERT INTO public.mock_exam_audit_log(attempt_id, student_id, event, details)
  VALUES (p_attempt_id, auth.uid(), CASE WHEN p_auto THEN 'auto_submit' ELSE 'submit' END,
          jsonb_build_object('score_total', v_total, 'passed', v_passed));

  RETURN jsonb_build_object(
    'attempt_id', p_attempt_id,
    'score_total', v_total,
    'score_grammar', v_grammar,
    'score_reading', v_reading,
    'score_vocabulary', v_vocab,
    'score_spelling', v_spelling,
    'score_writing', v_writing,
    'passed', v_passed,
    'pass_threshold', v_exam.pass_threshold,
    'idempotent', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_submit(uuid, boolean) TO authenticated;
