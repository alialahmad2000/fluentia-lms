-- Add pronunciation_id FK + unique constraint to student_curriculum_progress
-- Enables upsert for pronunciation activity completion tracking

ALTER TABLE student_curriculum_progress
  ADD COLUMN IF NOT EXISTS pronunciation_id uuid REFERENCES curriculum_pronunciation(id);

-- Unique constraint: one pronunciation progress per student per pronunciation record
CREATE UNIQUE INDEX IF NOT EXISTS scp_unique_pronunciation
  ON student_curriculum_progress (student_id, pronunciation_id);

-- Also add a unique constraint on (student_id, unit_id, section_type)
-- for pronunciation rows that use unit_id instead of pronunciation_id
CREATE UNIQUE INDEX IF NOT EXISTS scp_unique_unit_section
  ON student_curriculum_progress (student_id, unit_id, section_type)
  WHERE section_type = 'pronunciation';

-- RLS policy already covers this table via student_id = auth.uid()
