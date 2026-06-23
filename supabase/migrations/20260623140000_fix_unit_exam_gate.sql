-- FIX: students who finished a unit could not take the unit-mastery exam.
--
-- Root cause: the exam-unlock screen gates on fn_can_start_unit_assessment → fn_unit_activity_completion,
-- but that function put `pronunciation` in the DENOMINATOR and counted ANY completed section_type
-- (incl. vocabulary / recording) in the NUMERATOR — diverging from the edge function unit-mastery-start,
-- whose inline gate (fixed 2026-06-20) counts only the 5 graded sections. So a student who completed
-- 4/5 sections showed 66.7% (4÷6) on the UI and stayed locked below the 70% threshold, even though the
-- backend would have let them start. The 2026-06-20 fix lived in the wrong layer.
--
-- Fix: recompute fn_unit_activity_completion with the SAME 5-section logic as unit-mastery-start
-- (reading/grammar/writing/listening/speaking). Denominator = those sections that have content for the
-- unit; numerator = distinct completed among the same 5. pronunciation/recording/vocabulary/assessment
-- never gate the exam. Frontend gate now == backend gate (single source of truth).

CREATE OR REPLACE FUNCTION public.fn_unit_activity_completion(p_student_id uuid, p_unit_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_total INT := 0;
  v_done  INT := 0;
BEGIN
  -- Denominator: the 5 GRADED learning sections that actually have content for this unit.
  SELECT COUNT(*) INTO v_total FROM (
    (SELECT 1 FROM curriculum_readings  WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL (SELECT 1 FROM curriculum_grammar   WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL (SELECT 1 FROM curriculum_writing   WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL (SELECT 1 FROM curriculum_listening WHERE unit_id = p_unit_id LIMIT 1)
    UNION ALL (SELECT 1 FROM curriculum_speaking  WHERE unit_id = p_unit_id LIMIT 1)
  ) s;

  IF v_total = 0 THEN RETURN 0; END IF;

  -- Numerator: distinct completed sections among the SAME 5 (no pronunciation/recording/vocabulary/assessment).
  SELECT COUNT(DISTINCT section_type) INTO v_done
  FROM student_curriculum_progress
  WHERE student_id = p_student_id
    AND unit_id = p_unit_id
    AND completed_at IS NOT NULL
    AND section_type IN ('reading','grammar','writing','listening','speaking');

  RETURN ROUND((v_done::NUMERIC / v_total) * 100, 1);
END;
$function$;
