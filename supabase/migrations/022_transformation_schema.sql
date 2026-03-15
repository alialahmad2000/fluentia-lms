-- Migration 022: Full LMS Transformation Schema
-- Adds: force password change, AI student profiles, data reset log

-- 1. Add must_change_password and first_login_at to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz;

-- 2. Add temp_password to students (cleared after first password change)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS temp_password text;

-- 3. Create ai_student_profiles table
CREATE TABLE IF NOT EXISTS ai_student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skills jsonb DEFAULT '{}',
  strengths text[] DEFAULT '{}',
  weaknesses text[] DEFAULT '{}',
  tips text[] DEFAULT '{}',
  summary_ar text,
  summary_en text,
  raw_analysis jsonb DEFAULT '{}',
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

-- 4. Create data_reset_log table
CREATE TABLE IF NOT EXISTS data_reset_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id),
  reset_type text NOT NULL DEFAULT 'full',
  tables_reset text[] DEFAULT '{}',
  student_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. RLS policies for ai_student_profiles
ALTER TABLE ai_student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own AI profile"
  ON ai_student_profiles FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Trainers can view AI profiles of their students"
  ON ai_student_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Service role can manage AI profiles"
  ON ai_student_profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. RLS policies for data_reset_log
ALTER TABLE data_reset_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reset logs"
  ON data_reset_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert reset logs"
  ON data_reset_log FOR INSERT
  WITH CHECK (true);

-- 7. Index for fast AI profile lookups
CREATE INDEX IF NOT EXISTS idx_ai_student_profiles_student_id ON ai_student_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_data_reset_log_created_at ON data_reset_log(created_at DESC);
