# Grammar Najdi — Discovery Notes (updated 2026-05-18)

## Edge Function

- **Path:** `supabase/functions/explain-grammar-answer/index.ts`
- **Model (before):** `claude-sonnet-4-20250514` → **after:** `claude-sonnet-4-6`
- **Max tokens:** 1500
- **Temperature:** 0.3
- **Output format:** `{ explanation_md }` — structured 6-section Markdown in Najdi dialect
- **Schema check:** validates all 6 `##` headers; retries once if missing; logs to `grammar_explanations_warnings` on second failure
- **Cache:** `grammar_explanation_cache` table, keyed by SHA-256 of question+answer+studentAnswer

## React Component

- **Modal:** `src/components/grammar/ExplainModal.jsx`
  - Triggered by "اشرح لي" button in `ExerciseCard.jsx`
  - Shows `NajdiExplanationView` for `explanation_md` responses (new format)
  - Shows old `dangerouslySetInnerHTML` for cached `explanation_html` rows (backward compat)
  - Both formats have a "تجديد الشرح / أعد التحميل بتنسيق محسّن" button for force_regenerate
- **Renderer:** `src/components/grammar/NajdiExplanationView.jsx` (react-markdown + remark-gfm)
- **CSS:** `src/components/grammar/grammar-najdi.css`

## Cache Table

- **Table:** `grammar_explanation_cache`
- **PK:** `cache_key` (TEXT — SHA-256 hash)
- **Columns:** `question_text`, `student_answer`, `correct_answer`, `tldr_ar`, `explanation_html` (old), `explanation_md` (new), `hit_count`, `created_at`
- **⚠️ MIGRATION NOT APPLIED:** `explanation_md` column does not exist in production.
  Apply `supabase/migrations/20260513000000_grammar_explanation_md.sql` in Supabase SQL Editor.
  Until applied: every request bypasses cache (SELECT fails → always hits Claude API).

## ⚠️ Required Manual Action — Apply Migration

Run this in the **Supabase SQL Editor** (project nmjexpuycmqcxuxljier):

```sql
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
```

After applying: new explanations will be cached; old HTML rows can be re-generated with the
"تجديد الشرح" button in ExplainModal.

## DB Samples (Before)

See `docs/dev-notes/grammar-najdi-samples-before.md` — all 5 existing rows are old HTML format,
no `explanation_md`. Output is dense prose with no section headings.

## Changes Made (2026-05-18 Polish Pass)

| Area | Before | After |
|------|--------|-------|
| Edge function model | `claude-sonnet-4-20250514` | `claude-sonnet-4-6` |
| Section heading size | 15px (0.9375rem) | 17px (1.0625rem) |
| Section heading top margin | 1.5rem | 2rem |
| Para bottom margin | 0.625rem | 0.75rem |
| List padding | 1.25rem | 1.5rem |
| Blockquote direction | `nth-child` (buggy for 3-line examples) | `unicode-bidi: plaintext` (content-aware) |
| Blockquote border | `border-right` (not RTL-semantic) | `border-inline-start` (RTL-correct) |
| Regen button for MD rows | missing | "تجديد الشرح" small button added |
