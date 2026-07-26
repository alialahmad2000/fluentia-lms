-- Curriculum-quality detector: fix the grammar stats view (2026-07-27)
--
-- Two bugs made every grammar verdict unreliable:
--
-- 1. BLIND DETECTOR. The lateral join looked for the answered item inside the
--    exercise's `items` array: `(it.item ->> 'id') = p.item_id`. No item object
--    in curriculum_grammar_exercises has an `id` key (0 of 2036), because the id
--    lives on the EXERCISE ROW and every row holds exactly one item. So `item`
--    was NULL for all 389 measured rows, the AI never saw the question text,
--    options or explanation, and it "explained" the missing data by concluding
--    the question was absent from the student's screen.
--
-- 2. PHANTOM ATTEMPTS. ExerciseSection.buildResults() persists a row for EVERY
--    exercise on every autosave, including ones the student never answered
--    (studentAnswer null, isCorrect false). Those counted as attempts AND as
--    wrong, inflating wrong_pct (236 of 2245 rows = 10.5%) and pushing clean
--    items over the >= 60% candidate threshold.
--
-- Fixes: join on the exercise id and read items->0; count only real answers.

CREATE OR REPLACE VIEW public.v_cq_grammar_exercise_stats AS
WITH raw AS (
  SELECT
    scp.student_id,
    scp.grammar_id,
    scp.unit_id,
    e.value ->> 'id'                       AS item_id,
    (e.value ->> 'isCorrect')::boolean     AS is_correct,
    e.value ->> 'studentAnswer'            AS student_answer,
    e.value ->> 'correctAnswer'            AS correct_answer,
    e.value ->> 'type'                     AS exercise_type
  FROM student_curriculum_progress scp,
       LATERAL jsonb_array_elements(scp.answers -> 'exercises') e(value)
  WHERE scp.section_type = 'grammar'
    AND jsonb_typeof(scp.answers -> 'exercises') = 'array'
    AND e.value ? 'id'
    -- only rows the student actually answered; unanswered placeholders are not
    -- evidence about the question's quality
    AND NULLIF(btrim(COALESCE(e.value ->> 'studentAnswer', '')), '') IS NOT NULL
), per_q AS (
  SELECT
    raw.item_id,
    min(raw.unit_id::text)::uuid    AS unit_id,
    min(raw.grammar_id::text)::uuid AS grammar_id,
    min(raw.correct_answer)         AS correct_answer,
    min(raw.exercise_type)          AS exercise_type,
    count(*)                        AS attempts,
    count(DISTINCT raw.student_id)  AS students,
    count(*) FILTER (WHERE NOT raw.is_correct) AS wrong_n
  FROM raw
  GROUP BY raw.item_id
), dist AS (
  SELECT
    s.item_id,
    jsonb_object_agg(s.student_answer, s.n) AS wrong_distribution,
    max(s.n) AS top_wrong_n
  FROM (
    SELECT raw.item_id, raw.student_answer, count(*) AS n
    FROM raw
    WHERE NOT raw.is_correct AND raw.student_answer IS NOT NULL
    GROUP BY raw.item_id, raw.student_answer
  ) s
  GROUP BY s.item_id
)
SELECT
  p.item_id,
  p.unit_id,
  p.grammar_id,
  p.correct_answer,
  p.exercise_type,
  gi.item,
  p.attempts,
  p.students,
  p.wrong_n,
  round(100.0 * p.wrong_n::numeric / NULLIF(p.attempts, 0)::numeric, 1) AS wrong_pct,
  d.wrong_distribution,
  COALESCE(d.top_wrong_n, 0::bigint) AS top_wrong_n
FROM per_q p
LEFT JOIN dist d ON d.item_id = p.item_id
LEFT JOIN LATERAL (
  -- The answered item id IS the curriculum_grammar_exercises row id; each row
  -- carries exactly one item. Fall back to an in-array id match so a future
  -- multi-item schema keeps working.
  SELECT COALESCE(
           (SELECT it.item
              FROM jsonb_array_elements(ge.items) it(item)
             WHERE (it.item ->> 'id') = p.item_id
             LIMIT 1),
           ge.items -> 0
         ) AS item
    FROM curriculum_grammar_exercises ge
   WHERE ge.id::text = p.item_id
   LIMIT 1
) gi ON true;

REVOKE ALL ON public.v_cq_grammar_exercise_stats FROM anon, authenticated;
