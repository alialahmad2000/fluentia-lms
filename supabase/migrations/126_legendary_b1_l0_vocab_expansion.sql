-- LEGENDARY-B1: L0 Vocabulary Expansion — schema extensions
-- Adds tier system columns to curriculum_vocabulary (already applied via db query)

-- Tier columns
ALTER TABLE public.curriculum_vocabulary ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE public.curriculum_vocabulary ADD COLUMN IF NOT EXISTS cefr_level text;
ALTER TABLE public.curriculum_vocabulary ADD COLUMN IF NOT EXISTS source_list text;
ALTER TABLE public.curriculum_vocabulary ADD COLUMN IF NOT EXISTS appears_in_passage boolean NOT NULL DEFAULT false;
ALTER TABLE public.curriculum_vocabulary ADD COLUMN IF NOT EXISTS tier_order integer;
ALTER TABLE public.curriculum_vocabulary ADD COLUMN IF NOT EXISTS added_in_prompt text;

-- Backfill existing rows as core/passage words
UPDATE public.curriculum_vocabulary
SET appears_in_passage = true
WHERE added_in_prompt IS NULL AND appears_in_passage = false;

UPDATE public.curriculum_vocabulary
SET tier = COALESCE(tier, 'core'),
    cefr_level = COALESCE(cefr_level, 'A1')
WHERE tier IS NULL OR cefr_level IS NULL;

-- Unique index to prevent duplicate words per reading
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocab_reading_word
ON public.curriculum_vocabulary (reading_id, lower(word));
