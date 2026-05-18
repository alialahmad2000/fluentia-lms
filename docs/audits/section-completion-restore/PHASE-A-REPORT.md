# Phase A — Section Completion Diagnosis

**Date:** 2026-05-19
**Prompt:** SECTION-COMPLETION-RESTORE-2026-05-18

---

## Source of truth

- **Table:** `public.unit_progress` (columns: id, student_id, unit_id, numerator, denominator, percentage, breakdown jsonb, updated_at)
- **Compute function:** `public.compute_unit_progress(p_student_id, p_unit_id)` — returns numerator/denominator/percentage/breakdown
- **Write helper:** `public.recompute_unit_progress_for(p_student_id, p_unit_id)` — calls compute then UPSERT
- **Trigger function:** `public.trg_recompute_unit_progress()` — extracts student_id+unit_id from NEW/OLD, special-cases vocabulary_word_mastery (joins through curriculum_vocabulary → curriculum_readings)

## Trigger inventory (all AFTER INSERT/UPDATE/DELETE, enabled)

| Table | Trigger | Status |
|---|---|---|
| `student_curriculum_progress` | `recompute_unit_progress_student_curriculum_progress` | enabled |
| `speaking_recordings` | `recompute_unit_progress_speaking_recordings` | enabled |
| `vocabulary_word_mastery` | `recompute_unit_progress_vocabulary_word_mastery` | enabled |
| `activity_attempts` | `recompute_unit_progress_activity_attempts` | enabled |

## RLS on `unit_progress` (verified correct)

- `students_read_own_unit_progress` — SELECT WHERE `student_id = auth.uid()` ✓
- `staff_read_unit_progress` — admins/trainers ✓
- `service_unit_progress` — service_role ✓

## Probe student: منار العتيبي (`cad66f17-…`)

- 8 distinct units with completions → 8 unit_progress rows exist (100% covered)
- Triggers ARE firing — no missing rows
- Breakdown reflects most sections correctly

## Section-by-section mismatch audit (across ALL students)

Query: for every (student, unit, section_type) completed in `student_curriculum_progress`
(is_best=true, status=completed), compare to the corresponding completion counter
in `unit_progress.breakdown.completion`.

| section_type | mismatches |
|---|---|
| `vocabulary_exercise` | **22** |
| `vocabulary` | **8** |
| reading | 0 |
| grammar | 0 |
| listening | 0 |
| speaking | 0 |
| writing | 0 |
| pronunciation | 0 |

## Diagnosis

**The bug is at: COMPUTE (function logic)**

**Specifically:** `compute_unit_progress` for the `vocabulary` section evaluates
completion ONLY from `vocabulary_word_mastery` (80% of total words must be engaged).
It ignores two explicit section-level completion signals that the UI writes to
`student_curriculum_progress`:

1. `section_type = 'vocabulary'` with `status='completed'` and `is_best=true`
2. `section_type = 'vocabulary_exercise'` with `status='completed'` and `is_best=true`

When a student finishes vocab activities, the UI inserts one of those rows. The
trigger fires correctly and recomputes the row, but the COMPUTE function discards
those signals — so unless the student has individually engaged with ≥80% of total
words via `vocabulary_word_mastery`, the vocab card stays "incomplete".

**Concrete example:** منار, unit `95530744-…`:
- `student_curriculum_progress` row exists with `section_type='vocabulary'` status=completed is_best=true
- `vocabulary_word_mastery`: 15 / 55 words engaged (27%, below the 44 needed for 80%)
- `unit_progress.completion.vocabulary_engaged` = 15, `vocabulary_needed` = 44
- UI logic: `engaged < needed` → tabStatus = `in_progress`
- Result: student "completed vocab" but card shows no ✓

## Section types NOT in `unit_progress.breakdown.completion`

- `vocabulary_exercise` — written by the UI but not consumed at all

## Required fix

1. **Update `compute_unit_progress`** so vocabulary is complete when EITHER:
   - explicit completion row in `student_curriculum_progress` with `section_type IN ('vocabulary', 'vocabulary_exercise')` AND `status='completed'` AND `is_best=true`, OR
   - 80% word-mastery threshold met (existing logic)
2. **Keep** the `vocabulary_engaged` / `vocabulary_needed` metric for the progress bar UI.
3. **Backfill** all existing students/units so historical completions become visible immediately.

## Untouched (not the bug)

- All other section types (reading/grammar/listening/speaking/writing/pronunciation) reflect correctly across all students.
- Triggers are correctly wired and enabled on all 4 source tables.
- Realtime subscription in `useUnitProgress` is correct.
- React-Query staleTime (30s) is fine.
- RLS allows the read.
- Per-vocab-word `mastered_at` (individual word green checks) is intentionally out of scope.
