# Progress Calculator — Architecture Trace

## Source of truth: where is "100%" defined?

**Frontend-only calculation.** There is no DB-side `unit_progress` table or function.

The denominator is **dynamic** — computed from actual content existence in each `curriculum_*` table.

## Key files

| File | Role |
|---|---|
| `src/hooks/useUnitProgress.js` | Fetches content existence + student progress + vocab mastery; calls calculator |
| `src/utils/calculateUnitProgress.js` | `calculateUnitProgress()` — the core weighted progress function |
| `src/pages/student/curriculum/unit-v2/useUnitData.js` | Wraps `useUnitProgress` for the V2 unit page |

## Activity weights (sum = 100 when all present)

| Activity | Weight | Completion source |
|---|---|---|
| Reading A | 10 | `student_curriculum_progress` section_type='reading', status='completed' |
| Reading B | 10 | Same, different reading_id |
| Grammar | 13 | `student_curriculum_progress` section_type='grammar', status='completed' |
| Vocabulary | 18 | `vocabulary_word_mastery` mastery levels (not student_curriculum_progress) |
| Listening | 8 | `student_curriculum_progress` section_type='listening', status='completed' |
| Writing | 13 | `student_curriculum_progress` section_type='writing', status='completed' |
| Speaking | 13 | `student_curriculum_progress` section_type='speaking', status='completed' |
| Pronunciation | 10 | `student_curriculum_progress` section_type='pronunciation', status='completed' |
| Assessment | 5 | `student_curriculum_progress` section_type='assessment', status='completed' |

If an activity type doesn't exist in the unit's curriculum tables → excluded from denominator.

## Progress query filter

`useUnitProgress` reads `student_curriculum_progress` with `.neq('is_best', false)` — selects rows where `is_best` is TRUE or NULL (i.e., best-scoring attempt per activity).

## Cache staleness

Both `useUnitProgress` (staleTime: 60s) and `useLevelProgress` (staleTime: 120s) do NOT invalidate when activities complete. The `fluentia:activity:complete` event in `UnitContent.jsx` only triggers back-navigation, not a cache invalidation. This means progress shown in the unit page can be up to 60s behind the DB state.

## `calculateSimpleUnitProgress` — dead code

`calculateSimpleUnitProgress` (lines 198–220) has `hasGrammar: || true` etc. hardcoding but is **never imported or called** anywhere in the codebase. It is dead code.
