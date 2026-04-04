-- 070: Fix reading multi-passage saving
--
-- Bug: scp_unique_vocab constraint on (student_id, unit_id, section_type) prevents
-- saving multiple reading passages per unit. When Section A saves with section_type='reading',
-- Section B's insert violates this constraint because it has the same (student_id, unit_id, 'reading').
-- The onConflict targets scp_unique_reading (student_id, reading_id), so PostgreSQL can't
-- resolve the conflict on scp_unique_vocab — the upsert fails silently.
--
-- Fix: Drop scp_unique_vocab entirely. Each tab already has its own FK-based unique constraint:
--   - reading:   scp_unique_reading   (student_id, reading_id)
--   - grammar:   scp_unique_grammar   (student_id, grammar_id)
--   - listening:  scp_unique_listening  (student_id, listening_id)
--   - writing:   scp_unique_writing   (student_id, writing_id)
--   - speaking:  scp_unique_speaking  (student_id, speaking_id)
--   - vocabulary: uses manual INSERT/UPDATE by row ID (no upsert, no onConflict needed)

ALTER TABLE student_curriculum_progress
  DROP CONSTRAINT IF EXISTS scp_unique_vocab;
