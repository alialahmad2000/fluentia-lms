-- ============================================================
-- Compute unit progress: DB-side single source of truth
--
-- Schema reality (differs from prompt spec):
--   - All section completions live in student_curriculum_progress (unified table)
--     with section_type column — NOT separate per-section tables.
--   - curriculum_vocabulary has NO unit_id; must join via curriculum_readings.
--   - vocabulary_word_mastery tracks per-word mastery (mastery_level + exercise flags).
--   - Assessments tracked in activity_attempts.score.
-- ============================================================

-- ── 1. compute_unit_progress function ────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_unit_progress(p_student_id uuid, p_unit_id uuid)
RETURNS TABLE(numerator int, denominator int, percentage int, breakdown jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_inventory jsonb := '{}'::jsonb;
  v_completion jsonb := '{}'::jsonb;
  v_num int := 0;
  v_den int := 0;
  v_count int;
BEGIN
  -- ─── Build the unit's activity inventory dynamically ─────────────────────

  -- Reading passages (A and B are distinct, each worth 1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_readings WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('reading', v_count);
    v_den := v_den + v_count;
  END IF;

  -- Grammar lesson (0 or 1 per unit)
  SELECT COUNT(*) INTO v_count FROM curriculum_grammar WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('grammar', 1);
    v_den := v_den + 1;
  END IF;

  -- Listening (1 slot regardless of how many items)
  SELECT COUNT(*) INTO v_count FROM curriculum_listening WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('listening', v_count);
    v_den := v_den + 1;
  END IF;

  -- Speaking (1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_speaking WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('speaking', 1);
    v_den := v_den + 1;
  END IF;

  -- Writing (1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_writing WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('writing', 1);
    v_den := v_den + 1;
  END IF;

  -- Vocabulary (1 slot; curriculum_vocabulary has no unit_id, must join via readings)
  SELECT COUNT(*) INTO v_count
  FROM curriculum_vocabulary cv
  JOIN curriculum_readings cr ON cr.id = cv.reading_id
  WHERE cr.unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('vocabulary_total', v_count);
    v_den := v_den + 1;
  END IF;

  -- Pronunciation (1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_pronunciation WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('pronunciation', 1);
    v_den := v_den + 1;
  END IF;

  -- Unit assessment (1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_assessments WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('assessment', 1);
    v_den := v_den + 1;
  END IF;

  -- ─── Tally completions ───────────────────────────────────────────────────

  -- Reading: count distinct completed readings (is_best=true prevents counting retries twice)
  SELECT COUNT(DISTINCT reading_id) INTO v_count
  FROM student_curriculum_progress
  WHERE student_id = p_student_id
    AND unit_id    = p_unit_id
    AND section_type = 'reading'
    AND status       = 'completed'
    AND is_best      = true
    AND reading_id IS NOT NULL;
  v_num := v_num + LEAST(v_count, COALESCE((v_inventory->>'reading')::int, 0));
  v_completion := v_completion || jsonb_build_object('reading_done', v_count);

  -- Grammar
  IF v_inventory ? 'grammar' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'grammar'
      AND status       = 'completed'
      AND is_best      = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('grammar_done', LEAST(v_count, 1));
  END IF;

  -- Listening
  IF v_inventory ? 'listening' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'listening'
      AND status       = 'completed'
      AND is_best      = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('listening_done', LEAST(v_count, 1));
  END IF;

  -- Speaking: check student_curriculum_progress first, fall back to speaking_recordings
  IF v_inventory ? 'speaking' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'speaking'
      AND status       = 'completed';
    IF v_count = 0 THEN
      -- Fallback: actual recording exists → credit as complete
      SELECT COUNT(*) INTO v_count
      FROM speaking_recordings
      WHERE student_id = p_student_id AND unit_id = p_unit_id;
    END IF;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('speaking_done', LEAST(v_count, 1));
  END IF;

  -- Writing
  IF v_inventory ? 'writing' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'writing'
      AND status       = 'completed'
      AND is_best      = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('writing_done', LEAST(v_count, 1));
  END IF;

  -- Vocabulary: 80% of words must have at least one exercise passed
  IF v_inventory ? 'vocabulary_total' THEN
    SELECT COUNT(*) INTO v_count
    FROM vocabulary_word_mastery vwm
    JOIN curriculum_vocabulary cv ON cv.id = vwm.vocabulary_id
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    WHERE vwm.student_id = p_student_id
      AND cr.unit_id     = p_unit_id
      AND (vwm.meaning_exercise_passed = true
           OR vwm.sentence_exercise_passed = true
           OR vwm.listening_exercise_passed = true
           OR vwm.mastery_level IN ('learning', 'mastered'));
    IF v_count >= CEIL((v_inventory->>'vocabulary_total')::numeric * 0.8) THEN
      v_num := v_num + 1;
    END IF;
    v_completion := v_completion || jsonb_build_object('vocabulary_engaged', v_count,
                                                        'vocabulary_needed', CEIL((v_inventory->>'vocabulary_total')::numeric * 0.8));
  END IF;

  -- Pronunciation
  IF v_inventory ? 'pronunciation' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'pronunciation'
      AND status       = 'completed'
      AND is_best      = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('pronunciation_done', LEAST(v_count, 1));
  END IF;

  -- Assessment: passed (score >= 70) via activity_attempts
  IF v_inventory ? 'assessment' THEN
    SELECT COUNT(*) INTO v_count
    FROM activity_attempts aa
    JOIN curriculum_assessments ca ON ca.id = aa.activity_id
    WHERE aa.student_id = p_student_id
      AND ca.unit_id    = p_unit_id
      AND aa.status     = 'submitted'
      AND aa.score      >= 70;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('assessment_passed', LEAST(v_count, 1));
  END IF;

  -- ─── Return ───────────────────────────────────────────────────────────────
  RETURN QUERY SELECT
    v_num,
    v_den,
    CASE WHEN v_den = 0 THEN 0
         ELSE ROUND((v_num::numeric / v_den::numeric) * 100)::int
    END,
    jsonb_build_object('inventory', v_inventory, 'completion', v_completion);
END;
$$;

-- ── 2. unit_progress materialized table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS unit_progress (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES profiles(id)        ON DELETE CASCADE,
  unit_id     uuid        NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  numerator   int         NOT NULL DEFAULT 0,
  denominator int         NOT NULL DEFAULT 0,
  percentage  int         NOT NULL DEFAULT 0,
  breakdown   jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_progress_student ON unit_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_unit_progress_unit    ON unit_progress(unit_id);

-- Enable Realtime so the frontend progress bars update live
ALTER PUBLICATION supabase_realtime ADD TABLE unit_progress;

-- ── 3. RLS on unit_progress ───────────────────────────────────────────────────

ALTER TABLE unit_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_read_own_unit_progress"  ON unit_progress;
DROP POLICY IF EXISTS "staff_read_unit_progress"         ON unit_progress;
DROP POLICY IF EXISTS "service_unit_progress"            ON unit_progress;

CREATE POLICY "students_read_own_unit_progress" ON unit_progress
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "staff_read_unit_progress" ON unit_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
  );

CREATE POLICY "service_unit_progress" ON unit_progress
  FOR ALL USING (auth.role() = 'service_role');

-- ── 4. Recompute helper (called by triggers) ──────────────────────────────────

CREATE OR REPLACE FUNCTION recompute_unit_progress_for(p_student_id uuid, p_unit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_num int; v_den int; v_pct int; v_breakdown jsonb;
BEGIN
  IF p_student_id IS NULL OR p_unit_id IS NULL THEN RETURN; END IF;

  SELECT numerator, denominator, percentage, breakdown
    INTO v_num, v_den, v_pct, v_breakdown
  FROM compute_unit_progress(p_student_id, p_unit_id);

  INSERT INTO unit_progress (student_id, unit_id, numerator, denominator, percentage, breakdown, updated_at)
  VALUES (p_student_id, p_unit_id, v_num, v_den, v_pct, v_breakdown, now())
  ON CONFLICT (student_id, unit_id) DO UPDATE SET
    numerator   = EXCLUDED.numerator,
    denominator = EXCLUDED.denominator,
    percentage  = EXCLUDED.percentage,
    breakdown   = EXCLUDED.breakdown,
    updated_at  = now();
END;
$$;

-- ── 5. Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_recompute_unit_progress()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  v_unit_id    uuid;
BEGIN
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  v_unit_id    := COALESCE(NEW.unit_id, OLD.unit_id);

  -- vocabulary_word_mastery has no unit_id — look up via vocabulary_id → curriculum_vocabulary → curriculum_readings
  IF v_unit_id IS NULL AND TG_TABLE_NAME = 'vocabulary_word_mastery' THEN
    SELECT cr.unit_id INTO v_unit_id
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    WHERE cv.id = COALESCE(NEW.vocabulary_id, OLD.vocabulary_id)
    LIMIT 1;
  END IF;

  PERFORM recompute_unit_progress_for(v_student_id, v_unit_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 6. Attach triggers (idempotent) ──────────────────────────────────────────

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'student_curriculum_progress',
    'speaking_recordings',
    'vocabulary_word_mastery',
    'activity_attempts'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS recompute_unit_progress_%I ON %I',
        t, t
      );
      EXECUTE format(
        'CREATE TRIGGER recompute_unit_progress_%I
         AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION trg_recompute_unit_progress()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
