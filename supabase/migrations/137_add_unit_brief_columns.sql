-- Migration 137: Unit Brief columns (Journey V3 — Part A)
-- Adds AI-generated brief content columns to curriculum_units

ALTER TABLE public.curriculum_units
  ADD COLUMN IF NOT EXISTS why_matters TEXT,
  ADD COLUMN IF NOT EXISTS outcomes TEXT[],
  ADD COLUMN IF NOT EXISTS brief_questions JSONB,
  ADD COLUMN IF NOT EXISTS brief_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS brief_locale TEXT DEFAULT 'ar';

COMMENT ON COLUMN public.curriculum_units.why_matters IS 'Emotional hook paragraph (2-3 sentences, Arabic). Shown in Unit Brief "ليش هذي الوحدة مهمة؟" section.';
COMMENT ON COLUMN public.curriculum_units.outcomes IS 'Array of 3-5 concrete "you can now..." statements (Arabic). Shown in Unit Brief promise section.';
COMMENT ON COLUMN public.curriculum_units.brief_questions IS 'JSONB array of 2-3 pre-thinking questions (Arabic) to prime the student before diving in.';
COMMENT ON COLUMN public.curriculum_units.brief_generated_at IS 'When Claude API generated the brief. NULL = not yet generated. Idempotency key.';

CREATE INDEX IF NOT EXISTS idx_curriculum_units_brief_pending
  ON public.curriculum_units (id) WHERE brief_generated_at IS NULL;
