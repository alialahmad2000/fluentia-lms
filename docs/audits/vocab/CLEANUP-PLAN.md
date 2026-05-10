# Vocab Cleanup Plan

**Generated:** 2026-05-09T23:28:26.323Z
**Total vocab rows:** 14383
**Student-protected rows:** 346

## Tier 1 — Duplicate Consolidation
- **Duplicate clusters (level+word):** 256
- **Rows to delete:** 453
- **Method:** Hard delete (no `deleted_at` column on curriculum_vocabulary)
- **Student-protected clusters (keep all rows):** 70
- **Source CSV:** `exact-duplicates.csv`

## Tier 2 — L4 Arabic-in-example Regeneration
- **Rows affected:** 3389
- **By level:** {"4":3389}
- **Method:** Regenerate `example_sentence` via Claude claude-sonnet-4-6
- **Estimated cost:** $4.07 (input) + $3.05 (output) ≈ $7.12

## Tier 3 — Minor Word/Example Mismatches
- **Rows affected:** 43
- **By level:** {"0":2,"1":5,"2":9,"3":17,"4":3,"5":7}
- **Method:** Regenerate `example_sentence` via Claude claude-sonnet-4-6
- **Estimated cost:** $0.05 (input) + $0.04 (output) ≈ $0.09

## Columns to Add Before Tier 2/3
```sql
ALTER TABLE curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS regenerated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleanup_run_id TEXT,
  ADD COLUMN IF NOT EXISTS original_example_sentence TEXT;
```

## Expected Final State
- **Alive rows after Tier 1:** 13930
- **Arabic in examples:** 0
- **Word/example mismatch:** 0
