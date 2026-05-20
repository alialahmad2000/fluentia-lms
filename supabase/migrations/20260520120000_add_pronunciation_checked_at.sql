-- VOCAB-PREMIUM Prompt 02 (Enrichment Fill)
-- Adds pronunciation_checked_at to give pronunciation_alert idempotency on
-- "checked, NULL by design" rows (so they aren't re-processed on restart).
-- Backfills the new column from the existing pronunciation_generated_at where set,
-- so the 399 already-checked rows keep their checked state.

ALTER TABLE public.curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS pronunciation_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_curriculum_vocabulary_pronunciation_checked
  ON public.curriculum_vocabulary (pronunciation_checked_at)
  WHERE pronunciation_checked_at IS NULL;

UPDATE public.curriculum_vocabulary
SET pronunciation_checked_at = pronunciation_generated_at
WHERE pronunciation_generated_at IS NOT NULL
  AND pronunciation_checked_at IS NULL;
