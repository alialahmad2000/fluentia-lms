-- Migration 023: Class Recordings + Schedule Config + Student Planned Tasks
-- Features: Google Drive embedded recordings, weekly schedule config, student planner

-- ═══════════════════════════════════════════════════════
-- 1. Class Recordings
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS class_recordings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  class_type text NOT NULL DEFAULT 'general',
  level integer NOT NULL,
  track text NOT NULL DEFAULT 'foundation',
  google_drive_url text NOT NULL,
  google_drive_file_id text NOT NULL,
  recorded_date date NOT NULL,
  duration_minutes integer,
  uploaded_by uuid REFERENCES profiles(id),
  group_id uuid REFERENCES groups(id),
  is_visible boolean DEFAULT true,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_recordings_level ON class_recordings(level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recordings_date ON class_recordings(recorded_date DESC) WHERE deleted_at IS NULL;

ALTER TABLE class_recordings ENABLE ROW LEVEL SECURITY;

-- Students view recordings for their level or group
CREATE POLICY "students_view_recordings" ON class_recordings FOR SELECT TO authenticated
  USING (
    is_visible = true AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = auth.uid()
      AND (s.academic_level = class_recordings.level OR s.group_id = class_recordings.group_id)
    )
  );

-- Staff view all recordings
CREATE POLICY "staff_view_recordings" ON class_recordings FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- Staff insert recordings
CREATE POLICY "staff_insert_recordings" ON class_recordings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- Admin update any recording
CREATE POLICY "admin_update_recordings" ON class_recordings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trainers update own recordings
CREATE POLICY "trainer_update_own_recordings" ON class_recordings FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer')
  );

-- ═══════════════════════════════════════════════════════
-- 2. Weekly Schedule Config
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS weekly_schedule_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES groups(id),
  day_of_week integer NOT NULL, -- 0=Sunday...6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  class_type text DEFAULT 'general',
  google_meet_link text,
  is_active boolean DEFAULT true,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE weekly_schedule_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_schedule" ON weekly_schedule_config FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "admin_manage_schedule" ON weekly_schedule_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "trainer_manage_own_schedule" ON weekly_schedule_config FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN groups g ON g.trainer_id = p.id
      WHERE p.id = auth.uid() AND p.role = 'trainer' AND g.id = weekly_schedule_config.group_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN groups g ON g.trainer_id = p.id
      WHERE p.id = auth.uid() AND p.role = 'trainer' AND g.id = weekly_schedule_config.group_id
    )
  );

-- ═══════════════════════════════════════════════════════
-- 3. Student Planned Tasks (Planner)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS student_planned_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id),
  task_type text NOT NULL, -- 'weekly_task', 'assignment', 'homework', 'custom'
  task_reference_id uuid,
  title text NOT NULL,
  planned_day integer NOT NULL, -- 0=Sunday...6=Saturday
  planned_slot text NOT NULL, -- 'morning', 'afternoon', 'evening'
  week_start date NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_planned_tasks_student_week ON student_planned_tasks(student_id, week_start) WHERE deleted_at IS NULL;

ALTER TABLE student_planned_tasks ENABLE ROW LEVEL SECURITY;

-- Students manage own tasks
CREATE POLICY "own_planned_tasks" ON student_planned_tasks FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Staff view all
CREATE POLICY "staff_view_planned_tasks" ON student_planned_tasks FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- ═══════════════════════════════════════════════════════
-- 4. Helper Functions
-- ═══════════════════════════════════════════════════════

-- Atomically increment recording view count
CREATE OR REPLACE FUNCTION increment_view_count(recording_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE class_recordings
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = recording_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
