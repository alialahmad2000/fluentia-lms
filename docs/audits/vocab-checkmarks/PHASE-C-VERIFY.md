# Vocabulary Checkmarks — Phase C Verification

Date: 2026-05-25
Branch: `megafix-vocab-listening-reading`

## Root cause (Phase A, verified live)
`trg_recompute_unit_progress()` (shipped `20260514100000_compute_unit_progress.sql`) evaluates `NEW.unit_id` unconditionally at line 289 — but `vocabulary_word_mastery` has no `unit_id` column. plpgsql raises `record "new" has no field "unit_id"` *before* the table-aware fallback at line 292 can run. Every `WordExerciseModal` checkmark upsert therefore throws, is swallowed by the modal's try/catch, and writes no row. Last organic write to the table = **2026-05-14** (this trigger's ship date). Confirmed live via an authenticated student JWT: idempotent upsert returned `ERR record "new" has no field "unit_id"`.

## Fix
1. **DB (primary)** — `supabase/migrations/20260525000000_fix_recompute_unit_progress_vwm.sql`: `CREATE OR REPLACE FUNCTION trg_recompute_unit_progress()` reading NEW/OLD fields via `to_jsonb(...)->>'key'` (returns NULL for absent keys, never throws) and resolving `unit_id` for vocab rows via `vocabulary_id → curriculum_vocabulary.reading_id → curriculum_readings.unit_id`. `compute_unit_progress()` / `recompute_unit_progress_for()` untouched.
2. **Frontend hardening** — `WordExerciseModal.jsx` catch now surfaces the real error code+message (toast description + console) so a future server-side regression is loud, not silent.

| Check | Pass/Fail | Notes |
|---|---|---|
| Root cause identified + verified live | PASS | trigger `unit_id` throw, reproduced with student JWT |
| Trigger fix is table-agnostic (no hard NEW.unit_id ref) | PASS | uses `to_jsonb(NEW)->>'unit_id'` |
| Fix preserves vocab unit_id resolution path | PASS | vocabulary_id → reading_id → unit_id |
| compute_unit_progress / recompute_unit_progress_for untouched | PASS | only the trigger fn replaced |
| Save-failure no longer swallowed silently | PASS | error code+message surfaced |
| RLS healthy (no change needed) | PASS | Phase A: SELECT/INSERT/UPDATE policies all resolve `auth.uid()=student_id` |
| Migration applied to PROD | **BLOCKED — by design** | DB-strategy: apply on Supabase branch first, Ali promotes. NOT applied to prod by me. |
| Checkmarks render after a real exercise pass | **PENDING prod promotion** | will pass once trigger fix is live; verify via `docs/audits/_megafix-tmp/rls-jwt-check.mjs` |

## How to verify after promoting the migration
1. Apply `20260525000000_fix_recompute_unit_progress_vwm.sql` on a Supabase branch.
2. Run `NODE_OPTIONS="--dns-result-order=ipv4first" node docs/audits/_megafix-tmp/rls-jwt-check.mjs` → expect `upsert_with_select = OK returned 1 row` (was `ERR record "new" has no field "unit_id"`).
3. As a real student, complete a word's 3 exercises → row appears in `vocabulary_word_mastery` with `mastery_level='mastered'` and `updated_at` now → green dots/check render in VocabularyTab.

## Deferred (documented, not done — rationale)
- **Unified `<VocabMasteryCheck>` primitive across all 10 entry points** + **unit-completion confetti/+50 XP**: deliberately deferred. The trigger fix restores the existing (correct) per-word checkmark + dot UI everywhere it already lives, and a 10-surface refactor / new XP-award path carries regression risk that isn't justified for a primarily cosmetic unification on a branch under review. Per-word +3/+5 XP + "أتقنت" toast already exist in `WordExerciseModal`. Recommend a follow-up if the unification is still wanted.
- **Tap-behavior default (`details` → `practice`)**: NOT changed. All 22 active students default to `details` (read-only sheet) since 2026-05-21, so a single tap doesn't open the writer — but the practice paths (Hero / Journey / the sheet's "تدرّب" button) all write correctly once the trigger is fixed. Flipping the default (or a `UPDATE profiles ...` backfill) is a product/UX call for Ali, not a silent change.
