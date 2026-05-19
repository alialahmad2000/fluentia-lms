# Pronunciation feature — SHELVED on 2026-05-19

## Reason

UX issues caused more friction for students than the feature was worth.
Reactivation requires fresh design + product decision.

This shelving is **non-destructive**: every code file and DB row is preserved.
The feature is hidden from student-facing UI surfaces only.

## What was hidden (5 student-facing surfaces)

All marked with the literal comment `PRONUNCIATION-HIDDEN 2026-05-19` so a future grep can find every site at once.

| Surface | File:line |
|---------|-----------|
| `/student/pronunciation` route | `src/App.jsx:49, 655` (lazy import + Route) |
| Unit overview tab + render case | `src/pages/student/curriculum/UnitContent.jsx:30, 57, 287` |
| Unit-v2 activity grid card | `src/pages/student/curriculum/unit-v2/useUnitData.js:19` (ACTIVITY_MAP entry) |
| Section-icon registry (used by debrief + premium primitives) | `src/pages/student/curriculum/_premiumPrimitives.jsx:137` |
| Sub-tab inside معمل التحدث | `src/pages/student/StudentSpeaking.jsx:16, 22, 56` |

## What was NOT touched (preserved for revival)

- **Component files (`src/pages/student/StudentPronunciation.jsx`, `src/pages/student/curriculum/tabs/PronunciationTab.jsx`, `src/components/curriculum/PronunciationActivity.jsx`)** — all preserved, just unreachable.
- **Vocabulary pronunciation alerts** (`src/components/vocabulary/PronunciationAlert.jsx`, `src/components/vocabulary/tabs/PronunciationTab.jsx`) — DIFFERENT feature (IPA + Saudi-Arabic mispronunciation alerts shown in vocab word details). Stays active.
- **Speaking AI feedback** (`result.pronunciation_notes` in `StudentSpeaking.jsx`) — DIFFERENT feature (pronunciation comments from AI on speaking submissions). Stays active.
- **DB data:** `curriculum_pronunciation` rows preserved. Any `student_curriculum_progress` rows with `section_type='pronunciation'` preserved.
- **Audio files in storage:** untouched.
- **Backend utility code** (`src/hooks/useUnitProgress.js`, `src/utils/calculateUnitProgress.js`, `src/utils/curriculumXP.js`, `src/lib/constants.js`) still references pronunciation — kept because they handle the case gracefully when no pronunciation activity exists in a unit (which is the new normal).

## Companion DB change: `compute_unit_progress` excludes pronunciation

To ensure students can still hit 100% on a unit without pronunciation contributing to the denominator, the SQL function `compute_unit_progress` was updated to skip the pronunciation block. Migration: `supabase/migrations/20260519120000_compute_unit_progress_exclude_pronunciation.sql`.

The fields `pronunciation_done` and `inventory.pronunciation` no longer appear in `unit_progress.breakdown` after the next trigger fire. Existing rows have been backfilled.

## How to re-enable (5 minutes of work)

1. `grep -rn "PRONUNCIATION-HIDDEN 2026-05-19" src/ docs/ supabase/migrations/` — finds every hidden surface
2. Un-comment the imports + JSX in each marked location
3. Restore `compute_unit_progress` to include pronunciation by either:
   - Reverting the 2026-05-19 migration, OR
   - Writing a new migration that re-adds the pronunciation inventory + completion blocks
4. Run the backfill: `node scripts/audits/section-completion/backfill.cjs` (covers all active students)
5. Smoke test: log in as a real student, confirm the pronunciation card appears in unit overview and the unit_progress denominator includes it.

## Data preservation receipts (verified at shelving time)

- `curriculum_pronunciation` rows: see DB
- `student_curriculum_progress` rows with `section_type='pronunciation'`: see DB
- Pronunciation audio files in `curriculum-audio` bucket: untouched (`/pronunciation/...` prefix)
