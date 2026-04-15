-- ═══════════════════════════════════════════════════════
-- UNIT MASTERY ASSESSMENT — schema
-- ═══════════════════════════════════════════════════════

-- 1.1 Assessment shell per unit
CREATE TABLE IF NOT EXISTS unit_mastery_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID UNIQUE NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  pass_score_percent INT NOT NULL DEFAULT 70 CHECK (pass_score_percent BETWEEN 50 AND 100),
  unlock_threshold_percent INT NOT NULL DEFAULT 70 CHECK (unlock_threshold_percent BETWEEN 0 AND 100),
  total_questions INT NOT NULL,
  retake_cooldown_minutes INT NOT NULL DEFAULT 60,
  xp_on_pass INT NOT NULL DEFAULT 50,
  xp_on_attempt INT NOT NULL DEFAULT 10,
  time_limit_seconds INT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Three variants per assessment
CREATE TABLE IF NOT EXISTS unit_mastery_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES unit_mastery_assessments(id) ON DELETE CASCADE,
  variant_code TEXT NOT NULL CHECK (variant_code IN ('A','B','C')),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (assessment_id, variant_code)
);

-- 1.3 Questions
CREATE TABLE IF NOT EXISTS unit_mastery_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES unit_mastery_variants(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq','true_false','fill_blank','matching')),
  skill_tag TEXT NOT NULL CHECK (skill_tag IN ('vocabulary','grammar','reading','listening')),
  question_text TEXT NOT NULL,
  question_context TEXT,
  options JSONB,
  correct_answer JSONB NOT NULL,
  accepted_answers JSONB,
  points INT NOT NULL DEFAULT 1,
  explanation_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (variant_id, order_index)
);

-- 1.4 Attempts
CREATE TABLE IF NOT EXISTS unit_mastery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES unit_mastery_assessments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES unit_mastery_variants(id),
  attempt_number INT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INT DEFAULT 0,
  total_possible INT NOT NULL,
  percentage NUMERIC(5,2),
  passed BOOLEAN,
  skill_breakdown JSONB,
  xp_awarded INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','timed_out','abandoned')),
  time_spent_seconds INT,
  UNIQUE (student_id, assessment_id, attempt_number)
);

CREATE INDEX idx_uma_attempts_student
  ON unit_mastery_attempts(student_id, assessment_id, completed_at DESC);

-- 1.5 Answers
CREATE TABLE IF NOT EXISTS unit_mastery_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES unit_mastery_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES unit_mastery_questions(id),
  student_answer JSONB,
  is_correct BOOLEAN,
  points_earned INT DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);

-- ═══════════════════════════════════════════════════════
-- GATING HELPER FUNCTIONS
-- Adapted: no curriculum_activities table exists.
-- Activity completion tracked via student_curriculum_progress.section_type
-- ═══════════════════════════════════════════════════════

-- 1.6 Unit activity completion %
-- Counts available content sections per unit across curriculum tables,
-- then checks how many the student has completed in student_curriculum_progress.
CREATE OR REPLACE FUNCTION fn_unit_activity_completion(
  p_student_id UUID,
  p_unit_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_total INT := 0;
  v_done INT := 0;
BEGIN
  -- Count available sections for this unit from curriculum content tables
  SELECT COUNT(*) INTO v_total FROM (
    (SELECT 'reading' AS section_type FROM curriculum_readings WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL
    (SELECT 'grammar' FROM curriculum_grammar WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL
    (SELECT 'writing' FROM curriculum_writing WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL
    (SELECT 'listening' FROM curriculum_listening WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL
    (SELECT 'speaking' FROM curriculum_speaking WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL
    (SELECT 'pronunciation' FROM curriculum_pronunciation WHERE unit_id = p_unit_id LIMIT 1)
  ) available_sections;

  IF v_total = 0 THEN RETURN 0; END IF;

  -- Count completed sections for this student/unit
  SELECT COUNT(DISTINCT section_type) INTO v_done
  FROM student_curriculum_progress
  WHERE student_id = p_student_id
    AND unit_id = p_unit_id
    AND completed_at IS NOT NULL
    AND section_type NOT IN ('assessment');

  RETURN ROUND((v_done::NUMERIC / v_total) * 100, 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- 1.7 Can student start the assessment?
CREATE OR REPLACE FUNCTION fn_can_start_unit_assessment(
  p_student_id UUID,
  p_assessment_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_unit_id UUID;
  v_threshold INT;
  v_cooldown_min INT;
  v_activity_pct NUMERIC;
  v_last_failed TIMESTAMPTZ;
  v_cooldown_ends TIMESTAMPTZ;
  v_already_passed BOOLEAN;
BEGIN
  SELECT unit_id, unlock_threshold_percent, retake_cooldown_minutes
  INTO v_unit_id, v_threshold, v_cooldown_min
  FROM unit_mastery_assessments WHERE id = p_assessment_id;

  SELECT EXISTS (
    SELECT 1 FROM unit_mastery_attempts
    WHERE student_id = p_student_id AND assessment_id = p_assessment_id AND passed = true
  ) INTO v_already_passed;

  IF v_already_passed THEN
    RETURN jsonb_build_object('can_start', false, 'reason', 'already_passed');
  END IF;

  v_activity_pct := fn_unit_activity_completion(p_student_id, v_unit_id);
  IF v_activity_pct < v_threshold THEN
    RETURN jsonb_build_object(
      'can_start', false, 'reason', 'activities_incomplete',
      'current_pct', v_activity_pct, 'required_pct', v_threshold
    );
  END IF;

  SELECT completed_at INTO v_last_failed
  FROM unit_mastery_attempts
  WHERE student_id = p_student_id AND assessment_id = p_assessment_id AND passed = false
  ORDER BY completed_at DESC LIMIT 1;

  IF v_last_failed IS NOT NULL THEN
    v_cooldown_ends := v_last_failed + (v_cooldown_min || ' minutes')::INTERVAL;
    IF NOW() < v_cooldown_ends THEN
      RETURN jsonb_build_object('can_start', false, 'reason', 'cooldown', 'cooldown_ends_at', v_cooldown_ends);
    END IF;
  END IF;

  RETURN jsonb_build_object('can_start', true);
END;
$$ LANGUAGE plpgsql STABLE;

-- 1.8 Can student access a unit? (previous unit assessment must be passed)
CREATE OR REPLACE FUNCTION fn_can_access_unit(
  p_student_id UUID,
  p_unit_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_level_id UUID;
  v_unit_number INT;
  v_prev_unit_id UUID;
  v_prev_assessment_id UUID;
  v_prev_passed BOOLEAN;
BEGIN
  SELECT level_id, unit_number INTO v_level_id, v_unit_number
  FROM curriculum_units WHERE id = p_unit_id;

  IF v_unit_number = 1 THEN RETURN true; END IF;

  SELECT id INTO v_prev_unit_id
  FROM curriculum_units WHERE level_id = v_level_id AND unit_number = v_unit_number - 1;

  IF v_prev_unit_id IS NULL THEN RETURN true; END IF;

  SELECT id INTO v_prev_assessment_id
  FROM unit_mastery_assessments WHERE unit_id = v_prev_unit_id AND is_published = true;

  IF v_prev_assessment_id IS NULL THEN RETURN true; END IF;

  SELECT EXISTS (
    SELECT 1 FROM unit_mastery_attempts
    WHERE student_id = p_student_id AND assessment_id = v_prev_assessment_id AND passed = true
  ) INTO v_prev_passed;

  RETURN COALESCE(v_prev_passed, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════

ALTER TABLE unit_mastery_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_mastery_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_mastery_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_mastery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_mastery_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uma_read_published" ON unit_mastery_assessments
  FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);
CREATE POLICY "uma_admin_all" ON unit_mastery_assessments
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "umv_read" ON unit_mastery_variants
  FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);
CREATE POLICY "umv_admin" ON unit_mastery_variants
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Questions: admin only (students get via edge function with service role)
CREATE POLICY "umq_admin" ON unit_mastery_questions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "uma_attempts_self_read" ON unit_mastery_attempts
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "uma_attempts_self_insert" ON unit_mastery_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "uma_attempts_admin" ON unit_mastery_attempts
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "uma_attempts_trainer_read" ON unit_mastery_attempts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM active_students ast
    JOIN groups g ON g.id = ast.group_id
    WHERE g.trainer_id = auth.uid() AND ast.id = unit_mastery_attempts.student_id
  ));

CREATE POLICY "umans_self" ON unit_mastery_answers
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM unit_mastery_attempts WHERE id = attempt_id AND student_id = auth.uid()
  ));
CREATE POLICY "umans_admin" ON unit_mastery_answers
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
