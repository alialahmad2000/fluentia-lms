-- 138_ielts_trainer_rls.sql
-- PROMPT-IELTS-12: Trainer Portal IELTS visibility layer
--
-- AUDIT NOTE: All trainer SELECT policies and ielts_submissions UPDATE policy
-- were already added in 136_ielts_v2_foundation.sql. Trainer feedback columns
-- (trainer_feedback, trainer_overridden_band, trainer_reviewed_at, trainer_id)
-- were also added in that migration.
--
-- This migration is a verification-only no-op with IF NOT EXISTS guards.
-- It confirms the expected state without risk of mutation.

DO $$
BEGIN
  -- Confirm all required policies exist (these were created in migration 136)
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ielts_submissions' AND policyname = 'staff_read_submissions'
  ), 'Missing: staff_read_submissions on ielts_submissions';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ielts_submissions' AND policyname = 'staff_write_submissions'
  ), 'Missing: staff_write_submissions on ielts_submissions';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ielts_error_bank' AND policyname = 'staff_read_errors'
  ), 'Missing: staff_read_errors on ielts_error_bank';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ielts_adaptive_plans' AND policyname = 'staff_read_plans'
  ), 'Missing: staff_read_plans on ielts_adaptive_plans';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ielts_skill_sessions' AND policyname = 'staff_read_sessions'
  ), 'Missing: staff_read_sessions on ielts_skill_sessions';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ielts_student_progress' AND policyname = 'staff_read_progress'
  ), 'Missing: staff_read_progress on ielts_student_progress';

  RAISE NOTICE 'IELTS trainer RLS state verified: all required policies exist';
END $$;

-- Ensure the grading index exists for performance
CREATE INDEX IF NOT EXISTS idx_ielts_subs_unreviewed
  ON ielts_submissions (submitted_at)
  WHERE trainer_reviewed_at IS NULL;
