-- ════════════════════════════════════════════════════════════════
-- 136: IELTS V2 Foundation
-- Phase A probe confirmed:
--   - 'ielts' already in student_package enum (skip B.1)
--   - ielts_student_results exists (extend only)
--   - ielts_student_progress/error_bank/adaptive_plans/mock_attempts DON'T exist (create)
--   - ielts_test_variant enum doesn't exist (create)
-- ════════════════════════════════════════════════════════════════

-- ─── B.2: Create ielts_test_variant enum ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ielts_test_variant') THEN
    CREATE TYPE ielts_test_variant AS ENUM ('academic', 'general_training');
  END IF;
END $$;

-- ─── B.3: Add test_variant to ielts_reading_passages ─────────────────────────
ALTER TABLE ielts_reading_passages
  ADD COLUMN IF NOT EXISTS test_variant ielts_test_variant;

UPDATE ielts_reading_passages
SET test_variant = 'academic'
WHERE test_variant IS NULL;

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM ielts_reading_passages WHERE test_variant IS NOT NULL;
  IF v_count < 43 THEN
    RAISE EXCEPTION 'B.3 verification failed: expected >= 43 tagged rows, got %', v_count;
  END IF;
END $$;

ALTER TABLE ielts_reading_passages ALTER COLUMN test_variant SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ielts_reading_variant ON ielts_reading_passages(test_variant, difficulty_band);

-- ─── B.4: Add test_variant to ielts_writing_tasks ────────────────────────────
ALTER TABLE ielts_writing_tasks
  ADD COLUMN IF NOT EXISTS test_variant ielts_test_variant;

UPDATE ielts_writing_tasks
SET test_variant = 'academic'
WHERE task_type = 'task1' AND test_variant IS NULL;

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM ielts_writing_tasks WHERE task_type='task1' AND test_variant IS NOT NULL;
  IF v_count < 12 THEN
    RAISE EXCEPTION 'B.4 verification failed: expected >= 12 tagged Task 1 rows, got %', v_count;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ielts_writing_variant ON ielts_writing_tasks(task_type, test_variant);

-- ─── B.5: Fix difficulty_band typo '5-6' → 'band_5_6' ───────────────────────
DO $$
DECLARE v_count INT;
BEGIN
  UPDATE ielts_reading_passages
  SET difficulty_band = 'band_5_6'
  WHERE difficulty_band = '5-6';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'B.5 verification failed: expected 1 row updated, got %', v_count;
  END IF;
END $$;

-- ─── B.6: Extend ielts_student_results (add missing columns) ─────────────────
ALTER TABLE ielts_student_results
  ADD COLUMN IF NOT EXISTS test_variant ielts_test_variant;

CREATE INDEX IF NOT EXISTS idx_ielts_results_type ON ielts_student_results(result_type);

-- ─── B.7: Create ielts_student_progress ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ielts_student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL,
  question_type TEXT,
  attempts_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  estimated_band NUMERIC(3,1),
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ielts_progress_unique
  ON ielts_student_progress(student_id, skill_type, COALESCE(question_type, ''));

CREATE INDEX IF NOT EXISTS idx_ielts_progress_student ON ielts_student_progress(student_id);

-- ─── B.8: Create ielts_error_bank ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ielts_error_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL,
  question_type TEXT,
  source_table TEXT,
  source_id UUID,
  question_text TEXT,
  student_answer TEXT,
  correct_answer TEXT,
  explanation TEXT,
  times_seen INTEGER DEFAULT 1,
  times_correct INTEGER DEFAULT 0,
  mastered BOOLEAN DEFAULT false,
  next_review_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ielts_errors_student ON ielts_error_bank(student_id, mastered, next_review_at);
CREATE INDEX IF NOT EXISTS idx_ielts_errors_type ON ielts_error_bank(skill_type, question_type);

-- ─── B.9: Create ielts_adaptive_plans ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ielts_adaptive_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  test_variant ielts_test_variant NOT NULL DEFAULT 'academic',
  target_band NUMERIC(3,1) NOT NULL DEFAULT 6.5,
  target_exam_date DATE,
  current_band_estimate NUMERIC(3,1),
  weekly_schedule JSONB DEFAULT '{}',
  current_week INTEGER DEFAULT 1,
  weak_areas JSONB DEFAULT '[]',
  strong_areas JSONB DEFAULT '[]',
  next_recommended_action JSONB DEFAULT '{}',
  last_regenerated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ielts_plans_student ON ielts_adaptive_plans(student_id);

-- ─── B.10: Create ielts_mock_attempts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ielts_mock_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mock_test_id UUID REFERENCES ielts_mock_tests(id),
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_section TEXT,
  section_started_at TIMESTAMPTZ,
  time_remaining_seconds INTEGER,
  section_time_remaining JSONB DEFAULT '{}',
  answers JSONB DEFAULT '{}',
  writing_task1_submission TEXT,
  writing_task2_submission TEXT,
  speaking_submissions JSONB DEFAULT '{}',
  result_id UUID REFERENCES ielts_student_results(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  auto_saved_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ielts_attempts_student ON ielts_mock_attempts(student_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ielts_attempts_mock ON ielts_mock_attempts(mock_test_id);

-- ─── B.11: Create ielts_skill_sessions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ielts_skill_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL,
  question_type TEXT,
  source_id UUID,
  test_variant ielts_test_variant,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  band_score NUMERIC(3,1),
  session_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ielts_sessions_student ON ielts_skill_sessions(student_id, skill_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ielts_sessions_source ON ielts_skill_sessions(source_id);

-- ─── B.12: Create ielts_submissions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ielts_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL,
  test_variant ielts_test_variant,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  text_content TEXT,
  audio_url TEXT,
  transcript TEXT,
  word_count INTEGER,
  duration_seconds INTEGER,
  band_score NUMERIC(3,1),
  ai_feedback JSONB DEFAULT '{}',
  trainer_feedback TEXT,
  trainer_overridden_band NUMERIC(3,1),
  trainer_reviewed_at TIMESTAMPTZ,
  trainer_id UUID REFERENCES profiles(id),
  mock_attempt_id UUID REFERENCES ielts_mock_attempts(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  evaluated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ielts_subs_student ON ielts_submissions(student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ielts_subs_trainer ON ielts_submissions(trainer_id, trainer_reviewed_at);
CREATE INDEX IF NOT EXISTS idx_ielts_subs_type ON ielts_submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_ielts_subs_mock ON ielts_submissions(mock_attempt_id);

-- ─── B.13: updated_at triggers ───────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    BEGIN
      CREATE TRIGGER trg_set_updated_at_ielts_progress
        BEFORE UPDATE ON ielts_student_progress
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      CREATE TRIGGER trg_set_updated_at_ielts_plans
        BEFORE UPDATE ON ielts_adaptive_plans
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ─── B.14: Enable RLS ────────────────────────────────────────────────────────
-- ielts_student_results already has RLS, skip to avoid error
ALTER TABLE ielts_student_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_error_bank        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_adaptive_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_mock_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_skill_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_submissions       ENABLE ROW LEVEL SECURITY;

-- ─── B.15: RLS Policies (new tables only; student_results already has policies)
-- student_progress
DROP POLICY IF EXISTS students_own_progress ON ielts_student_progress;
CREATE POLICY students_own_progress ON ielts_student_progress
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS staff_read_progress ON ielts_student_progress;
CREATE POLICY staff_read_progress ON ielts_student_progress
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));
DROP POLICY IF EXISTS staff_write_progress ON ielts_student_progress;
CREATE POLICY staff_write_progress ON ielts_student_progress
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- error_bank
DROP POLICY IF EXISTS students_own_errors ON ielts_error_bank;
CREATE POLICY students_own_errors ON ielts_error_bank
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS staff_read_errors ON ielts_error_bank;
CREATE POLICY staff_read_errors ON ielts_error_bank
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- adaptive_plans
DROP POLICY IF EXISTS students_own_plans ON ielts_adaptive_plans;
CREATE POLICY students_own_plans ON ielts_adaptive_plans
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS staff_read_plans ON ielts_adaptive_plans;
CREATE POLICY staff_read_plans ON ielts_adaptive_plans
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));
DROP POLICY IF EXISTS staff_write_plans ON ielts_adaptive_plans;
CREATE POLICY staff_write_plans ON ielts_adaptive_plans
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- mock_attempts
DROP POLICY IF EXISTS students_own_attempts ON ielts_mock_attempts;
CREATE POLICY students_own_attempts ON ielts_mock_attempts
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS staff_read_attempts ON ielts_mock_attempts;
CREATE POLICY staff_read_attempts ON ielts_mock_attempts
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));
DROP POLICY IF EXISTS staff_write_attempts ON ielts_mock_attempts;
CREATE POLICY staff_write_attempts ON ielts_mock_attempts
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- skill_sessions
DROP POLICY IF EXISTS students_own_sessions ON ielts_skill_sessions;
CREATE POLICY students_own_sessions ON ielts_skill_sessions
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS staff_read_sessions ON ielts_skill_sessions;
CREATE POLICY staff_read_sessions ON ielts_skill_sessions
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- submissions
DROP POLICY IF EXISTS students_own_submissions ON ielts_submissions;
CREATE POLICY students_own_submissions ON ielts_submissions
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS staff_read_submissions ON ielts_submissions;
CREATE POLICY staff_read_submissions ON ielts_submissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));
DROP POLICY IF EXISTS staff_write_submissions ON ielts_submissions;
CREATE POLICY staff_write_submissions ON ielts_submissions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));
