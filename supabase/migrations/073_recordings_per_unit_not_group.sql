-- Recordings are shared across all groups in the same level.
-- Change unique constraint from (group_id, unit_id, part) to (unit_id, part).

-- Drop old unique constraint that includes group_id
DROP INDEX IF EXISTS idx_recordings_unique_group_unit_part;

-- Create new unique constraint: one recording per unit + part (regardless of group)
CREATE UNIQUE INDEX idx_recordings_unique_unit_part
  ON class_recordings(unit_id, part)
  WHERE is_archive = false AND deleted_at IS NULL AND unit_id IS NOT NULL;
