-- Saudi Dialect Engine v1 — Grammar layer
-- One dialect explanation per grammar lesson
-- Audio columns reserved for future voice-clone prompt (#3)

CREATE TABLE IF NOT EXISTS public.dialect_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to the grammar lesson this explanation belongs to.
  grammar_lesson_id UUID NOT NULL
    REFERENCES public.curriculum_grammar(id) ON DELETE CASCADE,

  -- Content
  concept_title TEXT NOT NULL,                  -- Short title shown in the modal header (Arabic)
  explanation_najdi TEXT NOT NULL,              -- Main Najdi explanation (200–400 Arabic words)
  explanation_hijazi TEXT,                      -- Hijazi variant (reserved, NULL for now)

  -- Audio (reserved for future voice-clone prompt — leave NULL in this phase)
  audio_url_najdi TEXT,
  audio_url_hijazi TEXT,

  -- Metadata
  cefr_level TEXT,                              -- 'A1', 'A2', 'B1', 'B2', 'C1', etc.
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],          -- e.g. {'tenses','present-perfect','high-priority'}
  word_count INTEGER,                           -- Computed at insert time for QA

  -- Quality + publishing
  is_published BOOLEAN NOT NULL DEFAULT TRUE,   -- All explanations live unless explicitly hidden
  generated_by TEXT DEFAULT 'claude-code-opus-46',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One explanation per grammar lesson
  UNIQUE (grammar_lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_dialect_explanations_lesson
  ON public.dialect_explanations(grammar_lesson_id);
CREATE INDEX IF NOT EXISTS idx_dialect_explanations_cefr
  ON public.dialect_explanations(cefr_level);
CREATE INDEX IF NOT EXISTS idx_dialect_explanations_published
  ON public.dialect_explanations(is_published) WHERE is_published = TRUE;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_dialect_explanations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dialect_explanations_updated_at
  BEFORE UPDATE ON public.dialect_explanations
  FOR EACH ROW EXECUTE FUNCTION public.set_dialect_explanations_updated_at();

-- RLS
ALTER TABLE public.dialect_explanations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dialect_explanations_read_published" ON public.dialect_explanations;
CREATE POLICY "dialect_explanations_read_published"
  ON public.dialect_explanations FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "dialect_explanations_service_role_all" ON public.dialect_explanations;
CREATE POLICY "dialect_explanations_service_role_all"
  ON public.dialect_explanations FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);
