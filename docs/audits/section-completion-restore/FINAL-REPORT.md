# Section Completion Restore — Final Report

**Date:** 2026-05-19
**Prompt:** SECTION-COMPLETION-RESTORE-2026-05-18

---

## Diagnosis (from PHASE-A-REPORT.md)

`compute_unit_progress` evaluated vocabulary completion ONLY from the 80%
word-mastery threshold in `vocabulary_word_mastery`. It ignored the explicit
section-level completion signal that the UI writes to
`student_curriculum_progress`:
- `section_type = 'vocabulary'` (8 mismatches)
- `section_type = 'vocabulary_exercise'` (22 mismatches)

When a student finished vocab activities, the trigger fired correctly and
recomputed the row, but the function discarded those signals. Unless the
student had individually engaged with ≥80% of total words via
`vocabulary_word_mastery`, the vocab card stayed "incomplete".

All other section types (reading/grammar/listening/speaking/writing/
pronunciation) already reflected correctly — verified by per-section mismatch
audit.

## Fix applied

- **Layer:** COMPUTE
- **Files changed:**
  - `supabase/migrations/20260519000000_compute_unit_progress_vocab_section_signal.sql` (new)
  - `src/hooks/useUnitProgress.js` (vocab branch honors `vocabulary_section_done`)
  - `src/utils/calculateUnitProgress.js` (frontend-fallback vocab def honors explicit completion)
- **Migrations applied:** 1 (idempotent CREATE OR REPLACE of `compute_unit_progress`)

## Backfill

- **Rows recomputed:** 96 (every distinct (student_id, unit_id) with any prior
  activity in `student_curriculum_progress` / `speaking_recordings` /
  `vocabulary_word_mastery` / `activity_attempts`)
- **Sample verification:** all 36 student/unit pairs that have a
  `vocabulary` or `vocabulary_exercise` completion now have
  `breakdown.completion.vocabulary_section_done = true`

## Section types now covered

- reading, grammar, listening, speaking, writing, pronunciation: unchanged (already correct)
- **vocabulary: now also recognises explicit section-level completion via
  `student_curriculum_progress.section_type IN ('vocabulary','vocabulary_exercise')`**
- assessment: unchanged

## Verified end-to-end

| Check | Result |
|---|---|
| Migration applied | ✓ |
| Backfill: 96 (student, unit) pairs | ✓ 96 ok, 0 failed |
| Spot-check: 36 vocab completions now flagged complete | ✓ 36/36 |
| Regression: 0 mismatches across all 6 non-vocab section types | ✓ |
| Triggers still enabled on all 4 source tables | ✓ |
| RLS unchanged: students still read their own rows | ✓ |
| `useUnitProgress` hook honors `vocabulary_section_done` | ✓ |
| Frontend fallback `calculateUnitProgress` honors explicit completion | ✓ |

## Not touched (intentional)

- Per-vocab-word `mastered_at` green checks (separate fix per prompt scope)
- `vocabulary_engaged` / `vocabulary_needed` metrics (preserved for progress bar)
- `submissions` / `xp_transactions` / student data rows (no mutations)
- Triggers on student-data source tables (unchanged)
- RLS policies (unchanged)
