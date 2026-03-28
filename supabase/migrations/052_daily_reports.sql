-- Daily Reports System
-- Stores aggregated daily snapshots of platform activity

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,

  -- Platform-wide metrics
  total_students INT DEFAULT 0,
  active_students INT DEFAULT 0,          -- students who logged in / had activity
  new_students INT DEFAULT 0,             -- students created today

  -- Engagement metrics
  total_sessions INT DEFAULT 0,
  total_page_views INT DEFAULT 0,
  avg_session_minutes NUMERIC(6,1) DEFAULT 0,

  -- Learning metrics
  xp_earned INT DEFAULT 0,
  submissions_count INT DEFAULT 0,
  submissions_graded INT DEFAULT 0,
  attendance_count INT DEFAULT 0,
  classes_held INT DEFAULT 0,

  -- Curriculum progress
  readings_completed INT DEFAULT 0,
  units_completed INT DEFAULT 0,
  vocab_practiced INT DEFAULT 0,

  -- Financial
  payments_received INT DEFAULT 0,
  revenue_amount NUMERIC(10,2) DEFAULT 0,
  payments_overdue INT DEFAULT 0,

  -- Streak & gamification
  students_with_streak INT DEFAULT 0,
  achievements_earned INT DEFAULT 0,

  -- Detailed breakdown (JSONB for flexibility)
  student_details JSONB DEFAULT '[]',     -- per-student activity summary
  group_details JSONB DEFAULT '[]',       -- per-group summary
  hourly_activity JSONB DEFAULT '[]',     -- activity by hour of day

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT now(),
  generation_ms INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date DESC);

-- RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and trainers can view daily reports"
  ON daily_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'trainer')
    )
  );

CREATE POLICY "Service role can insert/update daily reports"
  ON daily_reports FOR ALL
  USING (true)
  WITH CHECK (true);
