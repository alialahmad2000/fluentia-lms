-- ════════════════════════════════════════════════════════════════
-- 093: XP System Fix — Make XP reliable and automatic
-- ════════════════════════════════════════════════════════════════

-- 1. Allow students to insert their OWN XP transactions (fix RLS)
DROP POLICY IF EXISTS "xp_transactions_insert" ON public.xp_transactions;
CREATE POLICY "xp_transactions_insert"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    OR is_trainer()
    OR is_admin()
  );

-- 2. Server-side award_curriculum_xp function (SECURITY DEFINER bypasses RLS)
--    Called from frontend after curriculum activity completion.
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
  v_reason xp_reason := 'assignment_on_time';
  v_desc text;
  v_existing_id uuid;
BEGIN
  -- Prevent double-awarding for same section in same unit
  IF p_unit_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM xp_transactions
    WHERE student_id = p_student_id
      AND reason = 'assignment_on_time'
      AND related_id = p_unit_id
      AND description LIKE '%' || p_section_type || '%'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN 0; -- Already awarded
    END IF;
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

  -- Insert XP transaction (trigger auto-updates students.xp_total)
  INSERT INTO xp_transactions (student_id, amount, reason, description, related_id)
  VALUES (p_student_id, v_xp, v_reason, v_desc || ' — ' || p_section_type, p_unit_id);

  RETURN v_xp;
END;
$$;

-- 3. Backfill XP for ALL past completed curriculum activities that never got XP
DO $$
DECLARE
  rec RECORD;
  v_xp integer;
BEGIN
  FOR rec IN
    SELECT
      cp.student_id,
      cp.unit_id,
      cp.section_type,
      cp.score,
      cp.completed_at
    FROM student_curriculum_progress cp
    JOIN students s ON s.id = cp.student_id
    WHERE cp.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM xp_transactions xt
        WHERE xt.student_id = cp.student_id
          AND xt.reason = 'assignment_on_time'
          AND xt.related_id = cp.unit_id
          AND xt.description LIKE '%' || cp.section_type || '%'
      )
    ORDER BY cp.completed_at ASC
  LOOP
    v_xp := CASE rec.section_type
      WHEN 'reading' THEN
        CASE WHEN rec.score >= 90 THEN 20 WHEN rec.score >= 70 THEN 15 ELSE 10 END
      WHEN 'writing' THEN 15
      WHEN 'speaking' THEN 15
      WHEN 'listening' THEN
        CASE WHEN rec.score >= 90 THEN 20 WHEN rec.score >= 70 THEN 15 ELSE 10 END
      WHEN 'grammar' THEN
        CASE WHEN rec.score >= 90 THEN 20 WHEN rec.score >= 70 THEN 15 ELSE 10 END
      WHEN 'vocabulary' THEN 10
      WHEN 'vocabulary_exercise' THEN
        CASE WHEN rec.score >= 90 THEN 20 WHEN rec.score >= 70 THEN 15 ELSE 10 END
      WHEN 'pronunciation' THEN 10
      WHEN 'assessment' THEN
        CASE WHEN rec.score >= 90 THEN 30 WHEN rec.score >= 70 THEN 25 ELSE 20 END
      ELSE 5
    END;

    INSERT INTO xp_transactions (student_id, amount, reason, description, related_id, created_at)
    VALUES (
      rec.student_id,
      v_xp,
      'assignment_on_time',
      'تعويض XP — ' || rec.section_type,
      rec.unit_id,
      COALESCE(rec.completed_at, now())
    );
  END LOOP;
END;
$$;

-- 4. Recalculate xp_total from transactions for ALL students (fix any drift)
UPDATE students s
SET xp_total = COALESCE(sub.total, 0)
FROM (
  SELECT student_id, SUM(amount) AS total
  FROM xp_transactions
  GROUP BY student_id
) sub
WHERE s.id = sub.student_id
  AND s.xp_total IS DISTINCT FROM COALESCE(sub.total, 0);

-- 5. Recalculate gamification_level for all students
UPDATE students
SET gamification_level = calculate_gamification_level(COALESCE(xp_total, 0))
WHERE gamification_level IS DISTINCT FROM calculate_gamification_level(COALESCE(xp_total, 0));
