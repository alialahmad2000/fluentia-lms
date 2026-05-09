-- Unit Mastery — attempt cap, post-pass retake window, lockout
-- Idempotent: safe to re-run

-- B.1 — Add columns to unit_mastery_assessments
ALTER TABLE unit_mastery_assessments
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS post_pass_retake_days INTEGER NOT NULL DEFAULT 7 CHECK (post_pass_retake_days BETWEEN 0 AND 90),
  ADD COLUMN IF NOT EXISTS pre_pass_lockout_hours INTEGER NOT NULL DEFAULT 24 CHECK (pre_pass_lockout_hours BETWEEN 0 AND 168);

-- B.2 — Backfill time_limit_seconds based on actual question count per variant × 90s
-- For empty shells, use level-based defaults (L0/L1/L2=15q, L3/L4/L5=20q)
WITH variant_q_counts AS (
  SELECT
    umv.assessment_id,
    umv.id AS variant_id,
    COUNT(umq.id) AS q_count
  FROM unit_mastery_variants umv
  LEFT JOIN unit_mastery_questions umq ON umq.variant_id = umv.id
  GROUP BY umv.assessment_id, umv.id
),
assessment_q AS (
  SELECT
    assessment_id,
    GREATEST(MAX(q_count), 0) AS q_count
  FROM variant_q_counts
  GROUP BY assessment_id
),
level_defaults AS (
  SELECT
    uma.id AS assessment_id,
    CASE cl.level_number
      WHEN 0 THEN 10
      WHEN 1 THEN 15
      WHEN 2 THEN 15
      WHEN 3 THEN 20
      WHEN 4 THEN 20
      WHEN 5 THEN 20
      ELSE 15
    END AS default_q_count
  FROM unit_mastery_assessments uma
  JOIN curriculum_units cu ON cu.id = uma.unit_id
  JOIN curriculum_levels cl ON cl.id = cu.level_id
)
UPDATE unit_mastery_assessments uma
SET
  time_limit_seconds = (
    CASE
      WHEN aq.q_count > 0 THEN aq.q_count
      ELSE ld.default_q_count
    END
  ) * 90
FROM assessment_q aq, level_defaults ld
WHERE uma.id = aq.assessment_id
  AND uma.id = ld.assessment_id;

-- B.3 — Fix L1 total_questions mismatch (variants seeded with 15 but config says 10)
UPDATE unit_mastery_assessments uma
SET total_questions = 15
FROM curriculum_units cu, curriculum_levels cl
WHERE uma.unit_id = cu.id
  AND cu.level_id = cl.id
  AND cl.level_number = 1
  AND uma.total_questions != 15;

-- B.4 — Sanity: every assessment now has time_limit_seconds set and >= 60
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM unit_mastery_assessments
  WHERE time_limit_seconds IS NULL OR time_limit_seconds < 60;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'time_limit_seconds NULL or < 60 in % assessments', bad_count;
  END IF;
END $$;
