-- Add curriculum-related columns to existing class_recordings table
ALTER TABLE class_recordings
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES curriculum_units(id),
  ADD COLUMN IF NOT EXISTS part TEXT CHECK (part IN ('a', 'b')),
  ADD COLUMN IF NOT EXISTS is_archive BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make title nullable (curriculum recordings auto-generate title)
ALTER TABLE class_recordings ALTER COLUMN title DROP NOT NULL;

-- Make level nullable (curriculum recordings use unit_id instead)
ALTER TABLE class_recordings ALTER COLUMN level DROP NOT NULL;

-- Make google_drive_file_id nullable (not always available from a pasted link)
ALTER TABLE class_recordings ALTER COLUMN google_drive_file_id DROP NOT NULL;

-- Make recorded_date nullable (optional for curriculum recordings)
ALTER TABLE class_recordings ALTER COLUMN recorded_date DROP NOT NULL;

-- Make track have a default
ALTER TABLE class_recordings ALTER COLUMN track SET DEFAULT 'foundation';

-- Index for unit-based lookups
CREATE INDEX IF NOT EXISTS idx_recordings_group_unit ON class_recordings(group_id, unit_id);

-- Unique constraint: one recording per group + unit + part (non-archive only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_recordings_unique_group_unit_part
  ON class_recordings(group_id, unit_id, part)
  WHERE is_archive = false AND unit_id IS NOT NULL;

-- Mark all existing recordings as archive
UPDATE class_recordings SET is_archive = true WHERE unit_id IS NULL;
