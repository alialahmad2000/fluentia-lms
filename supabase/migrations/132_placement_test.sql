-- ═══════════════════════════════════════════════════════
-- PLACEMENT TEST — schema
-- ═══════════════════════════════════════════════════════

-- 1.1 Question bank (large pool; each test samples a subset)
CREATE TABLE IF NOT EXISTS placement_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cefr_level TEXT NOT NULL CHECK (cefr_level IN ('pre_a1','a1','a2','b1','b2','c1')),
  skill TEXT NOT NULL CHECK (skill IN ('grammar','vocabulary','reading','context')),
  difficulty NUMERIC(3,2) NOT NULL CHECK (difficulty BETWEEN 0.0 AND 3.0),
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq')) DEFAULT 'mcq',
  question_text TEXT NOT NULL,
  question_context TEXT,
  options JSONB NOT NULL,
  correct_option_id TEXT NOT NULL,
  explanation_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (question_text)
);

CREATE INDEX idx_placement_bank_level_skill
  ON placement_question_bank(cefr_level, skill) WHERE is_active = true;
CREATE INDEX idx_placement_bank_difficulty
  ON placement_question_bank(difficulty) WHERE is_active = true;

-- 1.2 Sessions (one per attempt)
CREATE TABLE IF NOT EXISTS placement_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','abandoned')),
  current_theta NUMERIC(4,2) DEFAULT 1.0,
  question_count INT DEFAULT 0,
  target_question_count INT DEFAULT 14,
  final_cefr TEXT,
  final_level INT,
  alternate_level INT,
  skill_breakdown JSONB,
  session_seed INT NOT NULL
);

CREATE INDEX idx_placement_sessions_student_status
  ON placement_sessions(student_id, status, started_at DESC);

-- 1.3 Per-question responses
CREATE TABLE IF NOT EXISTS placement_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES placement_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES placement_question_bank(id),
  question_order INT NOT NULL,
  selected_option_id TEXT,
  is_correct BOOLEAN,
  theta_before NUMERIC(4,2),
  theta_after NUMERIC(4,2),
  response_time_ms INT,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

-- 1.4 Final results (denormalized for fast dashboard reads + admin queue)
CREATE TABLE IF NOT EXISTS placement_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE NOT NULL REFERENCES placement_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommended_level INT NOT NULL,
  alternate_level INT NOT NULL,
  recommended_group_id UUID REFERENCES groups(id),
  alternate_group_id UUID REFERENCES groups(id),
  skill_breakdown JSONB NOT NULL,
  strengths TEXT[],
  weaknesses TEXT[],
  admin_reviewed BOOLEAN DEFAULT false,
  admin_action TEXT CHECK (admin_action IN ('assigned','dismissed','pending')) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_placement_results_admin_queue
  ON placement_results(admin_action, created_at DESC) WHERE admin_action = 'pending';
CREATE INDEX idx_placement_results_student
  ON placement_results(student_id, created_at DESC);

-- ═══════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════

ALTER TABLE placement_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_results ENABLE ROW LEVEL SECURITY;

-- Question bank: authenticated users read active questions
CREATE POLICY "q_bank_read_active" ON placement_question_bank
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);
CREATE POLICY "q_bank_admin_all" ON placement_question_bank
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sessions: student sees own, admin sees all
CREATE POLICY "sessions_self_read" ON placement_sessions
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "sessions_self_insert" ON placement_sessions
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "sessions_self_update" ON placement_sessions
  FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "sessions_admin_all" ON placement_sessions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Responses: follow session ownership
CREATE POLICY "responses_self_read" ON placement_responses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM placement_sessions WHERE id = session_id AND student_id = auth.uid()
  ));
CREATE POLICY "responses_self_insert" ON placement_responses
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM placement_sessions WHERE id = session_id AND student_id = auth.uid()
  ));
CREATE POLICY "responses_admin_all" ON placement_responses
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Results: student sees own, admin sees all + can update
CREATE POLICY "results_self_read" ON placement_results
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "results_admin_all" ON placement_results
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
