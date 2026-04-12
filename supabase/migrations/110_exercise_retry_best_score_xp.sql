-- ════════════════════════════════════════════════════════════════
-- 110: Exercise retry — best-score XP policy
-- On retry: if new score is higher, revoke old XP and award new.
-- If new score is lower, no XP change (old best stands).
-- Assessments remain single-attempt.
-- ════════════════════════════════════════════════════════════════

-- Replace award_curriculum_xp to support best-score-wins on retry
CREATE OR REPLACE FUNCTION public.award_curriculum_xp(
  p_student_id uuid,
  p_section_type text,
  p_score integer DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp integer := 0;
  v_old_xp integer := 0;
  v_reason xp_reason := 'assignment_on_time';
  v_desc text;
  v_existing record;
BEGIN
  -- Find existing XP award for same section in same unit
  IF p_unit_id IS NOT NULL THEN
    SELECT id, amount INTO v_existing
    FROM xp_transactions
    WHERE student_id = p_student_id
      AND reason = 'assignment_on_time'
      AND related_id = p_unit_id
      AND description LIKE '%' || p_section_type || '%'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Calculate XP based on section type and score
  CASE p_section_type
    WHEN 'reading' THEN
      v_xp := 10;
      IF p_score IS NOT NULL THEN
        IF p_score >= 90 THEN v_xp := 20;
        ELSIF p_score >= 70 THEN v_xp := 15;
        END IF;
      END IF;
      v_desc := COALESCE(p_description, 'إكمال نشاط القراءة');

    WHEN 'writing' THEN
      v_xp := 15;
      v_desc := COALESCE(p_description, 'إكمال نشاط الكتابة');

    WHEN 'speaking' THEN
      v_xp := 15;
      v_desc := COALESCE(p_description, 'إكمال نشاط التحدث');

    WHEN 'listening' THEN
      v_xp := 10;
      IF p_score IS NOT NULL THEN
        IF p_score >= 90 THEN v_xp := 20;
        ELSIF p_score >= 70 THEN v_xp := 15;
        END IF;
      END IF;
      v_desc := COALESCE(p_description, 'إكمال نشاط الاستماع');

    WHEN 'grammar' THEN
      v_xp := 10;
      IF p_score IS NOT NULL THEN
        IF p_score >= 90 THEN v_xp := 20;
        ELSIF p_score >= 70 THEN v_xp := 15;
        END IF;
      END IF;
      v_desc := COALESCE(p_description, 'إكمال نشاط القواعد');

    WHEN 'vocabulary' THEN
      v_xp := 10;
      v_desc := COALESCE(p_description, 'إكمال مراجعة المفردات');

    WHEN 'vocabulary_exercise' THEN
      v_xp := 10;
      IF p_score IS NOT NULL THEN
        IF p_score >= 90 THEN v_xp := 20;
        ELSIF p_score >= 70 THEN v_xp := 15;
        END IF;
      END IF;
      v_desc := COALESCE(p_description, 'إكمال تمارين المفردات');

    WHEN 'pronunciation' THEN
      v_xp := 10;
      v_desc := COALESCE(p_description, 'إكمال نشاط النطق');

    WHEN 'assessment' THEN
      v_xp := 20;
      IF p_score IS NOT NULL THEN
        IF p_score >= 90 THEN v_xp := 30;
        ELSIF p_score >= 70 THEN v_xp := 25;
        END IF;
      END IF;
      v_desc := COALESCE(p_description, 'إكمال التقييم');

    ELSE
      v_xp := 5;
      v_desc := COALESCE(p_description, 'نشاط منهج');
  END CASE;

  IF v_existing.id IS NOT NULL THEN
    v_old_xp := v_existing.amount;
    -- Already awarded: only update if new XP is higher (best score wins)
    IF v_xp > v_old_xp THEN
      -- Revoke old amount, insert new
      UPDATE xp_transactions SET amount = v_xp, description = v_desc || ' — ' || p_section_type || ' (تحسين)'
      WHERE id = v_existing.id;
      -- Update xp_total
      UPDATE students SET xp_total = COALESCE(xp_total, 0) + (v_xp - v_old_xp)
      WHERE id = p_student_id;
      RETURN v_xp - v_old_xp; -- net gain
    ELSE
      RETURN 0; -- No improvement
    END IF;
  END IF;

  -- First attempt: insert new XP
  INSERT INTO xp_transactions (student_id, amount, reason, description, related_id)
  VALUES (p_student_id, v_xp, v_reason, v_desc || ' — ' || p_section_type, p_unit_id);

  RETURN v_xp;
END;
$$;
