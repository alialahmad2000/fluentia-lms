-- Progress Reports table for AI-generated student progress reports
CREATE TABLE IF NOT EXISTS progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'biweekly', 'monthly')),
  report_data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  language TEXT NOT NULL DEFAULT 'both' CHECK (language IN ('ar', 'en', 'both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_progress_reports_student ON progress_reports(student_id);
CREATE INDEX idx_progress_reports_trainer ON progress_reports(trainer_id);
CREATE INDEX idx_progress_reports_generated ON progress_reports(generated_at DESC);

-- RLS
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;

-- Admins and trainers can read all reports
CREATE POLICY "Admins read all reports" ON progress_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
  );

-- Students can read their own reports
CREATE POLICY "Students read own reports" ON progress_reports
  FOR SELECT USING (student_id = auth.uid());

-- Admins and trainers can insert reports
CREATE POLICY "Staff insert reports" ON progress_reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
  );

-- Service role bypass for edge functions
CREATE POLICY "Service role full access" ON progress_reports
  FOR ALL USING (auth.role() = 'service_role');
