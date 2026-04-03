-- T2-A: Add unique indexes for student_curriculum_progress upsert support
-- Each section type uses its own FK column, so we create partial unique indexes

-- Reading progress: one row per student per reading
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_student_reading
ON student_curriculum_progress (student_id, reading_id)
WHERE reading_id IS NOT NULL;

-- Grammar progress: one row per student per grammar topic
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_student_grammar
ON student_curriculum_progress (student_id, grammar_id)
WHERE grammar_id IS NOT NULL;

-- Listening progress: one row per student per listening section
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_student_listening
ON student_curriculum_progress (student_id, listening_id)
WHERE listening_id IS NOT NULL;

-- Writing progress: one row per student per writing task
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_student_writing
ON student_curriculum_progress (student_id, writing_id)
WHERE writing_id IS NOT NULL;

-- Speaking progress: one row per student per speaking topic
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_student_speaking
ON student_curriculum_progress (student_id, speaking_id)
WHERE speaking_id IS NOT NULL;
