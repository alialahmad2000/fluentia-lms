# Migration Pre-check — 20260525000000_fix_recompute_unit_progress_vwm

Date: 2026-05-25
Method: Supabase Management API (token from .mcp.json), prod ref `nmjexpuycmqcxuxljier`.

## Finding: MIGRATION NEEDED
Current prod `trg_recompute_unit_progress()` still contains the broken pattern:
```
v_student_id := COALESCE(NEW.student_id, OLD.student_id);
v_unit_id    := COALESCE(NEW.unit_id, OLD.unit_id);   -- throws on vocabulary_word_mastery
```
The `NEW.unit_id` reference is evaluated unconditionally before the table-aware
fallback, so any write to `vocabulary_word_mastery` (no unit_id column) raises
`record "new" has no field "unit_id"`. Full before-source captured in
`ROLLBACK-trigger-before.json`.

## Action
Apply `supabase/migrations/20260525000000_fix_recompute_unit_progress_vwm.sql`
(reads fields via `to_jsonb(NEW)->>'key'`, never throws; resolves unit_id for
vocab rows via vocabulary_id -> curriculum_vocabulary.reading_id ->
curriculum_readings.unit_id). Idempotent CREATE OR REPLACE; forward-safe superset
of the old trigger.
