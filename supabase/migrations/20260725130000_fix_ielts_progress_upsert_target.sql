-- Fix: reading progress + reading error bank were never being written.
--
-- ielts_student_progress had uniqueness only via an EXPRESSION index
--   CREATE UNIQUE INDEX ... (student_id, skill_type, COALESCE(question_type,''))
-- PostgREST's `on_conflict=student_id,skill_type,question_type` cannot target an
-- expression index, so every upsert from useSubmitReadingTest / useSubmitReadingSession
-- returned HTTP 400. That error was thrown, which meant the error-bank insert that
-- ran AFTER it never executed either.
--
-- Observed before this fix: 1 reading progress row and 0 reading error-bank rows
-- across the entire platform, despite completed reading sessions.
--
-- PG15+ NULLS NOT DISTINCT gives the same guarantee as the COALESCE trick while
-- being a plain column constraint the client can name. The old expression index is
-- intentionally left in place.
ALTER TABLE public.ielts_student_progress
  ADD CONSTRAINT ielts_student_progress_uniq
  UNIQUE NULLS NOT DISTINCT (student_id, skill_type, question_type);
