-- ============================================
-- 049: Student Progress Tracking + Activity Analytics
-- ============================================

-- 1) User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  device text,
  browser text,
  pages_visited integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, started_at DESC);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_insert_own_sessions"
  ON user_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "students_update_own_sessions"
  ON user_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "students_read_own_sessions"
  ON user_sessions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')
    )
  );

-- 2) Page Visits
CREATE TABLE IF NOT EXISTS page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES user_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  page_path text NOT NULL,
  page_title text,
  entered_at timestamptz DEFAULT now(),
  left_at timestamptz,
  duration_seconds integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_visits_user ON page_visits(user_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_session ON page_visits(session_id);

ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_insert_own_visits"
  ON page_visits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "students_update_own_visits"
  ON page_visits FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "read_visits"
  ON page_visits FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')
    )
  );

-- 3) Activity Events
CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_user ON activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events(event_type, created_at DESC);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_insert_own_events"
  ON activity_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "read_events"
  ON activity_events FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')
    )
  );

-- 4) Extend notification_type enum for new event types
-- Add new types if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'task_completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'task_completed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student_inactive' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'student_inactive';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'unit_completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'unit_completed';
  END IF;
END $$;

-- 5) Trigger: notify trainer on assignment submission
CREATE OR REPLACE FUNCTION notify_trainer_on_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name text;
  v_trainer_id uuid;
  v_assignment_title text;
BEGIN
  -- Get student name
  SELECT display_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;

  -- Get trainer for the student's group
  SELECT t.id INTO v_trainer_id
  FROM students s
  JOIN groups g ON g.id = s.group_id
  JOIN trainers t ON t.id = g.trainer_id
  WHERE s.id = NEW.student_id;

  -- Get assignment title
  SELECT title INTO v_assignment_title FROM assignments WHERE id = NEW.assignment_id;

  -- Notify trainer
  IF v_trainer_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_trainer_id,
      'assignment_new',
      v_student_name || ' سلّم واجب',
      'سلّم ' || COALESCE(v_student_name, 'طالب') || ' واجب: ' || COALESCE(v_assignment_title, ''),
      jsonb_build_object('student_id', NEW.student_id, 'submission_id', NEW.id)
    );
  END IF;

  -- Also notify admins
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT p.id, 'assignment_new',
    v_student_name || ' سلّم واجب',
    'سلّم ' || COALESCE(v_student_name, 'طالب') || ' واجب: ' || COALESCE(v_assignment_title, ''),
    jsonb_build_object('student_id', NEW.student_id, 'submission_id', NEW.id)
  FROM profiles p WHERE p.role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_submission ON submissions;
CREATE TRIGGER trg_notify_submission
  AFTER INSERT ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_trainer_on_submission();

-- 6) Auto-cleanup: delete page_visits older than 90 days (run manually or via cron)
CREATE OR REPLACE FUNCTION cleanup_old_page_visits()
RETURNS void AS $$
BEGIN
  DELETE FROM page_visits WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
