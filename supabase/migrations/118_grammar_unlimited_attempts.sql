-- Migration: Grammar Unlimited Attempts
-- Drops unique constraint on (student_id, grammar_id) to allow multiple attempt rows.
-- Adds is_latest and is_best flags for efficient querying.

BEGIN;

-- 1. Add is_latest and is_best columns (attempt_number already exists from migration 067)
ALTER TABLE public.student_curriculum_progress
  ADD COLUMN IF NOT EXISTS is_latest BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_best   BOOLEAN NOT NULL DEFAULT true;

-- 2. Backfill all existing rows as both latest and best
UPDATE public.student_curriculum_progress
  SET is_latest = true, is_best = true
  WHERE is_latest IS DISTINCT FROM true OR is_best IS DISTINCT FROM true;

-- 3. Drop UNIQUE(student_id, grammar_id) if present — this blocks retry inserts
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.student_curriculum_progress'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%student_id%grammar_id%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.student_curriculum_progress DROP CONSTRAINT %I', cname);
    RAISE NOTICE 'Dropped unique constraint: %', cname;
  END IF;
END $$;

-- 4. Also drop any index that enforced uniqueness on (student_id, grammar_id)
DO $$
DECLARE iname text;
BEGIN
  FOR iname IN
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'student_curriculum_progress'
      AND indexdef ILIKE '%student_id%grammar_id%'
      AND indexdef ILIKE '%unique%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', iname);
    RAISE NOTICE 'Dropped unique index: %', iname;
  END LOOP;
END $$;

-- 5. Create partial indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_scp_grammar_latest
  ON public.student_curriculum_progress(student_id, grammar_id)
  WHERE is_latest = true AND grammar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scp_grammar_best
  ON public.student_curriculum_progress(student_id, grammar_id)
  WHERE is_best = true AND grammar_id IS NOT NULL;

-- 6. Non-unique index for attempt history queries
CREATE INDEX IF NOT EXISTS idx_scp_grammar_attempts
  ON public.student_curriculum_progress(student_id, grammar_id, attempt_number)
  WHERE grammar_id IS NOT NULL;

-- 7. Verify backfill — all rows should have is_latest and is_best set
DO $$
DECLARE total_rows INT; backfilled INT;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM public.student_curriculum_progress;
  SELECT COUNT(*) INTO backfilled FROM public.student_curriculum_progress
    WHERE is_latest = true AND is_best = true;
  IF backfilled < total_rows THEN
    RAISE EXCEPTION 'Backfill mismatch: % rows total but only % have is_latest=true AND is_best=true', total_rows, backfilled;
  END IF;
  RAISE NOTICE 'Backfill OK: % rows verified', total_rows;
END $$;

COMMIT;
