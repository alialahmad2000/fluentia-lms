-- Progress Reports table for AI-generated student progress reports
CREATE TABLE IF NOT EXISTS progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'monthly',
  report_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns that may be missing
ALTER TABLE progress_reports ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES profiles(id);
ALTER TABLE progress_reports ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE progress_reports ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'both';

CREATE INDEX IF NOT EXISTS idx_progress_reports_student ON progress_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_generated ON progress_reports(generated_at DESC);

-- RLS
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins read all reports" ON progress_reports;
  DROP POLICY IF EXISTS "Students read own reports" ON progress_reports;
  DROP POLICY IF EXISTS "Staff insert reports" ON progress_reports;
  DROP POLICY IF EXISTS "Service role full access" ON progress_reports;
END $$;

CREATE POLICY "Admins read all reports" ON progress_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
  );

CREATE POLICY "Students read own reports" ON progress_reports
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Staff insert reports" ON progress_reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
  );

CREATE POLICY "Service role full access" ON progress_reports
  FOR ALL USING (auth.role() = 'service_role');
