-- T8-G: Fix curriculum progress upsert — replace partial unique indexes
--
-- Problem: Partial unique indexes (WHERE col IS NOT NULL) cannot be used by
-- PostgreSQL's ON CONFLICT clause without an explicit WHERE predicate.
-- Supabase JS .upsert({ onConflict: 'student_id,reading_id' }) generates
-- INSERT ... ON CONFLICT (student_id, reading_id) DO UPDATE ... which won't
-- match a partial unique index, causing the upsert to silently fail.
--
-- Fix: Replace partial unique indexes with proper unique constraints.
-- NULLs are treated as distinct in unique constraints, so multiple rows
-- with NULL FK values for the same student are allowed (correct behavior).

-- Step 1: Drop the partial unique indexes
DROP INDEX IF EXISTS idx_progress_student_reading;
DROP INDEX IF EXISTS idx_progress_student_grammar;
DROP INDEX IF EXISTS idx_progress_student_listening;
DROP INDEX IF EXISTS idx_progress_student_writing;
DROP INDEX IF EXISTS idx_progress_student_speaking;

-- Step 2: Create proper unique constraints (non-partial, usable by ON CONFLICT)
-- Reading tab: onConflict: 'student_id,reading_id'
ALTER TABLE student_curriculum_progress
  ADD CONSTRAINT scp_unique_reading UNIQUE (student_id, reading_id);

-- Grammar tab: onConflict: 'student_id,grammar_id'
ALTER TABLE student_curriculum_progress
  ADD CONSTRAINT scp_unique_grammar UNIQUE (student_id, grammar_id);

-- Listening tab: onConflict: 'student_id,listening_id'
ALTER TABLE student_curriculum_progress
  ADD CONSTRAINT scp_unique_listening UNIQUE (student_id, listening_id);

-- Writing tab: onConflict: 'student_id,writing_id'
ALTER TABLE student_curriculum_progress
  ADD CONSTRAINT scp_unique_writing UNIQUE (student_id, writing_id);

-- Speaking tab: onConflict: 'student_id,speaking_id'
ALTER TABLE student_curriculum_progress
  ADD CONSTRAINT scp_unique_speaking UNIQUE (student_id, speaking_id);

-- Vocabulary tab: uses manual INSERT/UPDATE by (student_id, unit_id, section_type)
-- Add unique constraint as safety net for this pattern
ALTER TABLE student_curriculum_progress
  ADD CONSTRAINT scp_unique_vocab UNIQUE (student_id, unit_id, section_type);
