-- Add Markdown explanation column (new format; explanation_html kept for backward compat)
ALTER TABLE public.grammar_explanation_cache
  ADD COLUMN IF NOT EXISTS explanation_md TEXT;

-- Warnings table for schema-validation failures
CREATE TABLE IF NOT EXISTS public.grammar_explanations_warnings (
  id        BIGSERIAL    PRIMARY KEY,
  cache_key TEXT         NOT NULL,
  reason    TEXT         NOT NULL,
  raw_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grammar_explanations_warnings ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT policies — only service_role (edge function) can write via RLS bypass
