-- ============================================
-- 048: Study Plan Overrides + Populate Class Schedule
-- ============================================

-- 1) study_plan_overrides — per-group unit scheduling
CREATE TABLE IF NOT EXISTS study_plan_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  scheduled_start date,
  scheduled_end date,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_id, unit_id)
);

ALTER TABLE study_plan_overrides ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "view_study_plan_overrides"
  ON study_plan_overrides FOR SELECT
  TO authenticated
  USING (true);

-- Admin/trainer can manage
CREATE POLICY "admin_manage_study_plan_overrides"
  ON study_plan_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- 2) Add preferred_day to student_planned_tasks if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_planned_tasks' AND column_name = 'preferred_day'
  ) THEN
    ALTER TABLE student_planned_tasks ADD COLUMN preferred_day integer CHECK (preferred_day >= 0 AND preferred_day <= 6);
  END IF;
END $$;

-- 3) Populate weekly_schedule_config with actual class times
-- Level 1 (Group 1A): Sunday 9PM + Wednesday 9PM
-- Level 2 (Group 2A): Sunday 10PM + Wednesday 10PM

-- Clear existing schedule for these groups to avoid duplicates
DELETE FROM weekly_schedule_config
WHERE group_id IN (
  '11111111-1111-1111-1111-111111111001',
  '11111111-1111-1111-1111-111111111002'
);

-- Level 1 - Sunday at 21:00
INSERT INTO weekly_schedule_config (group_id, day_of_week, start_time, end_time, class_type, is_active, notes)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  0, -- Sunday
  '21:00:00',
  '22:00:00',
  'general',
  true,
  'كلاس المستوى الأول - الأحد'
);

-- Level 1 - Wednesday at 21:00
INSERT INTO weekly_schedule_config (group_id, day_of_week, start_time, end_time, class_type, is_active, notes)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  3, -- Wednesday
  '21:00:00',
  '22:00:00',
  'general',
  true,
  'كلاس المستوى الأول - الأربعاء'
);

-- Level 2 - Sunday at 22:00
INSERT INTO weekly_schedule_config (group_id, day_of_week, start_time, end_time, class_type, is_active, notes)
VALUES (
  '11111111-1111-1111-1111-111111111002',
  0, -- Sunday
  '22:00:00',
  '23:00:00',
  'general',
  true,
  'كلاس المستوى الثاني - الأحد'
);

-- Level 2 - Wednesday at 22:00
INSERT INTO weekly_schedule_config (group_id, day_of_week, start_time, end_time, class_type, is_active, notes)
VALUES (
  '11111111-1111-1111-1111-111111111002',
  3, -- Wednesday
  '22:00:00',
  '23:00:00',
  'general',
  true,
  'كلاس المستوى الثاني - الأربعاء'
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_study_plan_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_study_plan_overrides_updated ON study_plan_overrides;
CREATE TRIGGER trg_study_plan_overrides_updated
  BEFORE UPDATE ON study_plan_overrides
  FOR EACH ROW EXECUTE FUNCTION update_study_plan_overrides_updated_at();
