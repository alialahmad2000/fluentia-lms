-- ============================================
-- 075: Speaking Recordings table + RLS + notification types
-- Stores voice recordings for speaking exercises
-- ============================================

-- ─── 1. Create updated_at trigger function (if not exists) ───
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. speaking_recordings table ───
CREATE TABLE IF NOT EXISTS speaking_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  question_index integer NOT NULL DEFAULT 0,
  -- Audio file
  audio_url text NOT NULL,
  audio_duration_seconds integer,
  audio_format text,
  audio_size_bytes integer,
  -- AI Evaluation (filled async after upload)
  ai_evaluation jsonb,
  ai_evaluated_at timestamptz,
  ai_model text,
  -- Trainer review
  trainer_reviewed boolean DEFAULT false,
  trainer_feedback text,
  trainer_grade text,
  trainer_reviewed_at timestamptz,
  trainer_id uuid REFERENCES profiles(id),
  -- XP
  xp_awarded integer DEFAULT 0,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_speaking_recordings_student ON speaking_recordings(student_id);
CREATE INDEX IF NOT EXISTS idx_speaking_recordings_unit ON speaking_recordings(unit_id);
CREATE INDEX IF NOT EXISTS idx_speaking_recordings_student_unit ON speaking_recordings(student_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_speaking_recordings_latest ON speaking_recordings(student_id, unit_id, question_index, created_at DESC);

-- Updated_at trigger
CREATE TRIGGER set_speaking_recordings_updated_at
  BEFORE UPDATE ON speaking_recordings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ─── 3. RLS Policies ───
ALTER TABLE speaking_recordings ENABLE ROW LEVEL SECURITY;

-- Students: select own
CREATE POLICY "students_select_own_recordings" ON speaking_recordings
  FOR SELECT USING (student_id = auth.uid());

-- Students: insert own
CREATE POLICY "students_insert_own_recordings" ON speaking_recordings
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Students: update own
CREATE POLICY "students_update_own_recordings" ON speaking_recordings
  FOR UPDATE USING (student_id = auth.uid());

-- Trainers: select recordings of students in their groups
CREATE POLICY "trainers_select_group_recordings" ON speaking_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      WHERE s.id = speaking_recordings.student_id
      AND g.trainer_id = auth.uid()
    )
  );

-- Trainers: update (feedback/grade) recordings of their students
CREATE POLICY "trainers_update_group_recordings" ON speaking_recordings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      WHERE s.id = speaking_recordings.student_id
      AND g.trainer_id = auth.uid()
    )
  );

-- Admin: full access
CREATE POLICY "admin_all_recordings" ON speaking_recordings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 4. Notification types for speaking recordings ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'speaking_recorded' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'speaking_recorded';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'speaking_evaluated' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'speaking_evaluated';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'speaking_reviewed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'speaking_reviewed';
  END IF;
END $$;
