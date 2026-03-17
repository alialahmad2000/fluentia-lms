-- ═══════════════════════════════════════════════════════════
-- Enhanced Adaptive Question Bank with IRT Parameters
-- Separate from test_questions — this is for the adaptive engine
-- ═══════════════════════════════════════════════════════════

-- Adaptive question bank with IRT parameters
CREATE TABLE IF NOT EXISTS adaptive_question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill text NOT NULL CHECK (skill IN ('grammar','vocabulary','reading','listening','writing','speaking')),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  difficulty float NOT NULL DEFAULT 0.5,
  discrimination float NOT NULL DEFAULT 1.0,
  question_type text NOT NULL,
  question text NOT NULL,
  question_ar text,
  options jsonb,
  correct_answer integer,
  correct_text text,
  explanation text,
  explanation_ar text,
  context text,
  tags jsonb DEFAULT '[]',
  times_asked integer DEFAULT 0,
  times_correct integer DEFAULT 0,
  avg_response_time_seconds float,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_aq_skill_level ON adaptive_question_bank(skill, level, difficulty);
CREATE INDEX idx_aq_active ON adaptive_question_bank(is_active, skill);

-- RLS
ALTER TABLE adaptive_question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_aq" ON adaptive_question_bank FOR SELECT USING (true);
CREATE POLICY "admin_write_aq" ON adaptive_question_bank FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_aq" ON adaptive_question_bank FOR ALL USING (auth.role() = 'service_role');
