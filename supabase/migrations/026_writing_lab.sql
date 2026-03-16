-- ═══════════════════════════════════════════════════════════
-- Writing Lab: writing_history table + custom_access field
-- ═══════════════════════════════════════════════════════════

-- Add custom_access jsonb column to students (for IELTS access grants)
ALTER TABLE students ADD COLUMN IF NOT EXISTS custom_access jsonb DEFAULT NULL;
COMMENT ON COLUMN students.custom_access IS 'Array of granted features, e.g. ["ielts_writing"]';

-- Writing history table — stores all writing lab submissions
CREATE TABLE IF NOT EXISTS writing_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN ('sentence_building', 'ielts_task1', 'ielts_task2')),
  original_text text NOT NULL,
  feedback jsonb,
  band_score numeric(3,1),
  fluency_score integer,
  xp_earned integer DEFAULT 0,
  prompt_used text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast student lookups
CREATE INDEX IF NOT EXISTS idx_writing_history_student ON writing_history(student_id, task_type, created_at DESC);

-- RLS
ALTER TABLE writing_history ENABLE ROW LEVEL SECURITY;

-- Students can read their own history
CREATE POLICY "Students read own writing history"
  ON writing_history FOR SELECT
  USING (student_id = auth.uid());

-- Service role (edge functions) can insert
CREATE POLICY "Service role inserts writing history"
  ON writing_history FOR INSERT
  WITH CHECK (true);

-- Trainers/admins can read all (via service role or profiles check)
CREATE POLICY "Trainers read all writing history"
  ON writing_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

-- add_xp RPC (if not exists) — called by evaluate-writing edge function
CREATE OR REPLACE FUNCTION add_xp(p_student_id uuid, p_amount integer, p_reason text DEFAULT 'writing')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update xp_total
  UPDATE students SET xp_total = COALESCE(xp_total, 0) + p_amount WHERE id = p_student_id;

  -- Insert xp_transaction record
  INSERT INTO xp_transactions (student_id, amount, reason, description)
  VALUES (p_student_id, p_amount, p_reason, 'Writing Lab XP');
END;
$$;
