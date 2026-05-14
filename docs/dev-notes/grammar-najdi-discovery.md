# Grammar Najdi — Discovery Notes

## Edge Function

- **Path:** `supabase/functions/explain-grammar-answer/index.ts`
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens (before):** 800 → **after:** 1500
- **Temperature (before):** unset (API default) → **after:** 0.3
- **Output (before):** JSON `{ tldr_ar, explanation_html }` (HTML fragments)
- **Output (after):** `{ explanation_md }` (structured 6-section Markdown in Najdi dialect)

## React Component

- **Path:** `src/components/grammar/ExplainModal.jsx`
- **Trigger:** `ExerciseCard.jsx` "اشرح لي" button
- **Render method (before):** `DOMPurify.sanitize + dangerouslySetInnerHTML`
- **Render method (after):** `NajdiExplanationView` (react-markdown) for new rows; old HTML rendering preserved for cached rows

## Cache Table

- **Table:** `grammar_explanation_cache`
- **Key columns:** `cache_key` (SHA-256 of question+answer), `explanation_html` (old), `explanation_md` (new, added in migration 20260513000000)
- **Backward compat:** if `explanation_md` is null → fall back to `explanation_html` + `tldr_ar`

## New Files

- `supabase/migrations/20260513000000_grammar_explanation_md.sql`
- `src/components/grammar/NajdiExplanationView.jsx`
- `src/components/grammar/grammar-najdi.css`

## DB Samples Before

Could not retrieve live samples (no direct DB connection at discovery time). Run the following to sample after deployment:

```sql
SELECT id, cache_key, explanation_html, explanation_md, created_at
FROM grammar_explanation_cache
ORDER BY random() LIMIT 3;
```
