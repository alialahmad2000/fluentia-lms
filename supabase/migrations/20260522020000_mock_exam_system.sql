-- =============================================================
-- MOCK EXAM SYSTEM — cumulative mid-term mock for A1 + B1
-- 5 tables + profiles.is_test_account + 4 SECURITY DEFINER RPCs
-- Idempotent: safe to re-run
-- =============================================================

CREATE TABLE IF NOT EXISTS public.mock_exams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  title_ar        text NOT NULL,
  subtitle_ar     text,
  level_id        uuid NOT NULL REFERENCES public.curriculum_levels(id),
  duration_minutes int  NOT NULL CHECK (duration_minutes > 0),
  pass_threshold   int  NOT NULL DEFAULT 60,
  total_points     int  NOT NULL DEFAULT 100,
  open_at          timestamptz NOT NULL,
  close_at         timestamptz NOT NULL,
  min_writing_words int NOT NULL DEFAULT 50,
  visibility       text NOT NULL DEFAULT 'preview'
                   CHECK (visibility IN ('preview','live')),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.mock_exam_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         uuid NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  section         text NOT NULL CHECK (section IN ('grammar','reading','vocabulary','spelling','writing')),
  order_index     int  NOT NULL,
  question_type   text NOT NULL CHECK (question_type IN ('mcq','fill_blank','error_detection','true_false','true_false_ng','writing_prompt')),
  passage_group   int,
  passage_text    text,
  passage_title   text,
  stem            text NOT NULL,
  options         jsonb,
  correct_index   int,
  acceptable_answers jsonb,
  writing_min_words int,
  points          numeric(4,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, section, order_index)
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_exam_section
  ON public.mock_exam_questions(exam_id, section, order_index);

CREATE TABLE IF NOT EXISTS public.mock_exam_attempts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id             uuid NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  student_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL,
  submitted_at        timestamptz,
  is_submitted        boolean NOT NULL DEFAULT false,
  is_auto_submitted   boolean NOT NULL DEFAULT false,
  score_total         numeric(5,2),
  score_grammar       numeric(5,2),
  score_reading       numeric(5,2),
  score_vocabulary    numeric(5,2),
  score_spelling      numeric(5,2),
  score_writing       numeric(5,2),
  passed              boolean,
  writing_response    text,
  writing_word_count  int,
  manual_writing_score numeric(5,2),
  user_agent          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_attempts_student
  ON public.mock_exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_attempts_exam_submitted
  ON public.mock_exam_attempts(exam_id, is_submitted);

CREATE TABLE IF NOT EXISTS public.mock_exam_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      uuid NOT NULL REFERENCES public.mock_exam_attempts(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL REFERENCES public.mock_exam_questions(id) ON DELETE CASCADE,
  selected_index  int,
  text_answer     text,
  is_correct      boolean,
  points_awarded  numeric(4,2),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_answers_attempt
  ON public.mock_exam_answers(attempt_id);

CREATE TABLE IF NOT EXISTS public.mock_exam_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id    uuid REFERENCES public.mock_exam_attempts(id) ON DELETE SET NULL,
  student_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event         text NOT NULL,
  details       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mock_exam_audit_log_attempt
  ON public.mock_exam_audit_log(attempt_id, created_at);

ALTER TABLE public.mock_exams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_attempts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_answers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_audit_log     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS me_exams_read ON public.mock_exams;
CREATE POLICY me_exams_read ON public.mock_exams FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS me_exams_admin_write ON public.mock_exams;
CREATE POLICY me_exams_admin_write ON public.mock_exams FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS me_questions_staff_read ON public.mock_exam_questions;
CREATE POLICY me_questions_staff_read ON public.mock_exam_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

DROP POLICY IF EXISTS me_questions_admin_write ON public.mock_exam_questions;
CREATE POLICY me_questions_admin_write ON public.mock_exam_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS me_attempts_student_select ON public.mock_exam_attempts;
CREATE POLICY me_attempts_student_select ON public.mock_exam_attempts FOR SELECT
  USING (student_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

DROP POLICY IF EXISTS me_attempts_admin_write ON public.mock_exam_attempts;
CREATE POLICY me_attempts_admin_write ON public.mock_exam_attempts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS me_answers_student_select ON public.mock_exam_answers;
CREATE POLICY me_answers_student_select ON public.mock_exam_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mock_exam_attempts a
      WHERE a.id = mock_exam_answers.attempt_id
        AND (a.student_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')))
    )
  );

DROP POLICY IF EXISTS me_audit_staff_select ON public.mock_exam_audit_log;
CREATE POLICY me_audit_staff_select ON public.mock_exam_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mock_exams_updated_at ON public.mock_exams;
CREATE TRIGGER trg_mock_exams_updated_at BEFORE UPDATE ON public.mock_exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mock_exam_attempts_updated_at ON public.mock_exam_attempts;
CREATE TRIGGER trg_mock_exam_attempts_updated_at BEFORE UPDATE ON public.mock_exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mock_exam_answers_updated_at ON public.mock_exam_answers;
CREATE TRIGGER trg_mock_exam_answers_updated_at BEFORE UPDATE ON public.mock_exam_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
