-- One row per (canonical_reading × interest_bucket)
CREATE TABLE IF NOT EXISTS public.personalized_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_reading_id UUID NOT NULL
    REFERENCES public.curriculum_readings(id) ON DELETE CASCADE,
  interest_bucket TEXT NOT NULL
    CHECK (interest_bucket IN ('medical','business','tech','sports','travel_food','islamic','fashion_beauty','family')),

  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  word_count INTEGER NOT NULL,

  -- Metadata mirrors canonical
  cefr_level TEXT,
  grammar_focus TEXT[],
  target_vocabulary TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Publishing
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  generated_by TEXT DEFAULT 'claude-code-opus-46',
  generation_batch TEXT,

  -- QA scores recorded at generation time
  qa_word_count_ratio NUMERIC,
  qa_vocab_coverage NUMERIC,
  qa_passed BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (canonical_reading_id, interest_bucket)
);

CREATE INDEX IF NOT EXISTS idx_personalized_readings_canonical
  ON public.personalized_readings(canonical_reading_id);
CREATE INDEX IF NOT EXISTS idx_personalized_readings_bucket
  ON public.personalized_readings(interest_bucket);
CREATE INDEX IF NOT EXISTS idx_personalized_readings_published
  ON public.personalized_readings(is_published) WHERE is_published = TRUE;

CREATE OR REPLACE FUNCTION public.set_personalized_readings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_personalized_readings_updated_at
  BEFORE UPDATE ON public.personalized_readings
  FOR EACH ROW EXECUTE FUNCTION public.set_personalized_readings_updated_at();

ALTER TABLE public.personalized_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personalized_readings_read_published" ON public.personalized_readings;
CREATE POLICY "personalized_readings_read_published"
  ON public.personalized_readings FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "personalized_readings_service_role_all" ON public.personalized_readings;
CREATE POLICY "personalized_readings_service_role_all"
  ON public.personalized_readings FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);
