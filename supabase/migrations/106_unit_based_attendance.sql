-- ============================================================================
-- 106: Unify attendance to unit-based model (unit_id + class_number)
-- ============================================================================

-- Step 1: Add unit-based columns to existing attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES curriculum_units(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_number smallint CHECK (class_number IN (1, 2));
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES profiles(id);

-- Step 2: Make class_id nullable (new unit-based records don't use it)
ALTER TABLE attendance ALTER COLUMN class_id DROP NOT NULL;

-- Step 3: Add partial unique index for unit-based attendance
-- Only enforced when unit_id IS NOT NULL (new model)
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unit_student_class
  ON attendance (student_id, unit_id, class_number)
  WHERE unit_id IS NOT NULL;

-- Step 4: Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_attendance_unit_id ON attendance (unit_id);
CREATE INDEX IF NOT EXISTS idx_attendance_group_id ON attendance (group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_unit_group ON attendance (unit_id, group_id, class_number);

-- Step 5: Update RLS policies to support both legacy (class_id) and new (unit-based) access

DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT
USING (
  student_id = auth.uid()
  OR (is_trainer() AND (
    class_id IN (SELECT c.id FROM classes c WHERE c.group_id = ANY(get_trainer_group_ids()))
    OR group_id = ANY(get_trainer_group_ids())
  ))
  OR is_admin()
);

DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT
WITH CHECK (
  (is_trainer() AND (
    class_id IN (SELECT c.id FROM classes c WHERE c.group_id = ANY(get_trainer_group_ids()))
    OR group_id = ANY(get_trainer_group_ids())
  ))
  OR is_admin()
);

DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_update" ON attendance FOR UPDATE
USING (
  (is_trainer() AND (
    class_id IN (SELECT c.id FROM classes c WHERE c.group_id = ANY(get_trainer_group_ids()))
    OR group_id = ANY(get_trainer_group_ids())
  ))
  OR is_admin()
)
WITH CHECK (
  (is_trainer() AND (
    class_id IN (SELECT c.id FROM classes c WHERE c.group_id = ANY(get_trainer_group_ids()))
    OR group_id = ANY(get_trainer_group_ids())
  ))
  OR is_admin()
);

-- attendance_delete_admin policy remains unchanged (admin only)
