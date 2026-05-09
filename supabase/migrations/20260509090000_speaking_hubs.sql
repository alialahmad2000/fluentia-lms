-- ============================================================
-- SPEAKING HUB — Phase 1 MVP
-- Recurring listening task + scheduled discussion session
-- ============================================================

-- ============================================================
-- speaking_hubs: the hub definition
-- ============================================================
CREATE TABLE speaking_hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title text NOT NULL,
  title_en text,
  description text,
  description_en text,

  video_url text NOT NULL,
  video_title text,
  video_channel text,
  video_thumbnail_url text,
  video_duration_minutes int,

  note_prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
  vocab_focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  discussion_questions jsonb NOT NULL DEFAULT '[]'::jsonb,

  hub_session_at timestamptz,
  hub_session_link text,
  hub_session_duration_minutes int DEFAULT 60,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'live', 'completed', 'archived')),

  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_speaking_hubs_status ON speaking_hubs(status);
CREATE INDEX idx_speaking_hubs_session_date ON speaking_hubs(hub_session_at);
CREATE INDEX idx_speaking_hubs_created_by ON speaking_hubs(created_by);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp') THEN
    EXECUTE 'CREATE TRIGGER set_timestamp_speaking_hubs
      BEFORE UPDATE ON speaking_hubs
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()';
  ELSE
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $f$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;
    EXECUTE 'CREATE TRIGGER set_timestamp_speaking_hubs
      BEFORE UPDATE ON speaking_hubs
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()';
  END IF;
END $$;

-- ============================================================
-- speaking_hub_assignments: who gets which hub
-- ============================================================
CREATE TABLE speaking_hub_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid NOT NULL REFERENCES speaking_hubs(id) ON DELETE CASCADE,

  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,

  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT exactly_one_target CHECK (
    (student_id IS NOT NULL AND group_id IS NULL) OR
    (student_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_assignment_hub_student
  ON speaking_hub_assignments(hub_id, student_id)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX uq_assignment_hub_group
  ON speaking_hub_assignments(hub_id, group_id)
  WHERE group_id IS NOT NULL;

CREATE INDEX idx_assignments_hub ON speaking_hub_assignments(hub_id);
CREATE INDEX idx_assignments_student ON speaking_hub_assignments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_assignments_group ON speaking_hub_assignments(group_id) WHERE group_id IS NOT NULL;

-- ============================================================
-- speaking_hub_student_progress: per-student state
-- ============================================================
CREATE TABLE speaking_hub_student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid NOT NULL REFERENCES speaking_hubs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  video_started_at timestamptz,
  video_completed_at timestamptz,
  watch_progress_seconds int NOT NULL DEFAULT 0,

  notes text NOT NULL DEFAULT '',
  notes_word_count int NOT NULL DEFAULT 0,
  notes_updated_at timestamptz,

  attended boolean,
  trainer_feedback text,
  trainer_feedback_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_progress_hub_student UNIQUE (hub_id, student_id)
);

CREATE INDEX idx_hub_progress_student ON speaking_hub_student_progress(student_id);
CREATE INDEX idx_hub_progress_hub ON speaking_hub_student_progress(hub_id);

CREATE TRIGGER set_timestamp_progress
  BEFORE UPDATE ON speaking_hub_student_progress
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE speaking_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaking_hub_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaking_hub_student_progress ENABLE ROW LEVEL SECURITY;

-- speaking_hubs
CREATE POLICY "hubs_admin_all" ON speaking_hubs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "hubs_trainer_read" ON speaking_hubs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer'));

CREATE POLICY "hubs_student_read_assigned" ON speaking_hubs
  FOR SELECT TO authenticated
  USING (
    status IN ('published', 'live', 'completed') AND
    EXISTS (
      SELECT 1 FROM speaking_hub_assignments a
      WHERE a.hub_id = speaking_hubs.id
        AND (
          a.student_id = auth.uid()
          OR a.group_id IN (SELECT group_id FROM students WHERE id = auth.uid())
        )
    )
  );

-- speaking_hub_assignments
CREATE POLICY "assignments_admin_all" ON speaking_hub_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "assignments_trainer_read" ON speaking_hub_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer'));

CREATE POLICY "assignments_student_read_own" ON speaking_hub_assignments
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR group_id IN (SELECT group_id FROM students WHERE id = auth.uid())
  );

-- speaking_hub_student_progress
CREATE POLICY "progress_admin_all" ON speaking_hub_student_progress
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "progress_trainer_read" ON speaking_hub_student_progress
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer'));

CREATE POLICY "progress_trainer_update_feedback" ON speaking_hub_student_progress
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer'));

CREATE POLICY "progress_student_own_all" ON speaking_hub_student_progress
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
