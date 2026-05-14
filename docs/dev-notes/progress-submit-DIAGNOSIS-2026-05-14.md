# Diagnosis — May 14, 2026

## What's already deployed (from Prompt 04, commit 4991bdf)

- `compute_unit_progress` function: **NO** — not yet created
- `unit_progress` table: **NO** — not yet created
- Progress triggers: **NONE**
- `useResilientActivitySubmit` hook: **NO**
- `useActivityAutoSave` / universal retry: **NO** (different from this codebase's pattern)
- Speaking write-path error handling: **YES** (SpeakingTab.handleUploadComplete fixed)
- Listening submit hang fix: **YES** (hasSaved.current timing fixed, submitting state added)
- Admin diagnostic at `/admin/progress-diagnostic`: **YES** (frontend-only, reads from student_curriculum_progress)

## Schema reality vs. prompt assumptions

**The prompt assumes separate `student_*_progress` tables. Reality:**
All curriculum section completions live in one unified table: `student_curriculum_progress`
with a `section_type` column ('reading','grammar','listening','speaking','writing','vocabulary','pronunciation').

Key table names:
| Prompt assumed | Actual |
|---|---|
| `student_reading_progress` | `student_curriculum_progress` WHERE section_type='reading' |
| `student_grammar_progress` | `student_curriculum_progress` WHERE section_type='grammar' |
| `student_listening_progress` | `student_curriculum_progress` WHERE section_type='listening' |
| `student_writing_progress` | `student_curriculum_progress` WHERE section_type='writing' |
| `student_pronunciation_progress` | `student_curriculum_progress` WHERE section_type='pronunciation' |
| `curriculum_reading_passages` | `curriculum_readings` |
| `curriculum_grammar_lessons` | `curriculum_grammar` |
| `curriculum_speaking_topics` | `curriculum_speaking` |
| `curriculum_writing_prompts` | `curriculum_writing` |
| `curriculum_unit_assessments` | `curriculum_assessments` |
| `vocabulary_quiz_attempts` | `vocabulary_quiz_attempts` (exists) AND `student_curriculum_progress` section_type='vocabulary' |

**`curriculum_vocabulary` has NO `unit_id` column** — must join via `curriculum_readings.unit_id`.

**`vocabulary_word_mastery` columns:** meaning_exercise_passed, sentence_exercise_passed, listening_exercise_passed, mastery_level ('new','learning','mastered')

**`activity_attempts` has `score` column** — used for unit assessments (curriculum_assessments).

Speaking is tracked in BOTH:
- `speaking_recordings` table (actual audio + AI evaluation)
- `student_curriculum_progress` section_type='speaking' (completion flag, backfilled by Prompt 04)

## Submit handlers found

| File | Activity | Smells | Notes |
|---|---|---|---|
| `ExerciseSection.jsx` | grammar | ✓ has try/finally, submitting state | SAFE |
| `ListeningTab.jsx` | listening | ✓ fixed in Prompt 04 (submitting state + error recovery) | SAFE |
| `SpeakingTab.jsx` | speaking | ✓ fixed in Prompt 04 (error handling + invalidation) | SAFE |
| `WritingTab.jsx` | writing | ⚠️ `setSubmitting(false)` called AFTER `fetchFeedback` (60s×2 timeout) | **HANG BUG** |
| `VocabularyTab.jsx` | vocabulary | Auto-save pattern, no blocking submit button | Low risk |
| `PronunciationTab.jsx` | pronunciation | Has submitting state | Needs verification |
| `ReadingTab.jsx` | reading | INSERT-per-attempt, no blocking submit | Low risk |

## WritingTab hang root cause

```
setSubmitting(true)          ← locks button
await saveToDb(text, true)   ← fast (< 1s)
setSubmitted(true)
toast(...)
await fetchFeedback(text)    ← invokeWithRetry(timeoutMs: 60000, retries: 2) = up to 120s!
setSubmitting(false)         ← only reached after AI completes
```

Fix: call `setSubmitting(false)` immediately after `saveToDb` succeeds, before the AI call.

## Hawazin's state

Profile: `050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6`

Unit "ثقافة القهوة" (`738ff234`): has grammar ✓, reading A ✓, reading B ✓, pronunciation in_progress
Unit "الذكاء الاصطناعي" (`a5b583a4`): has grammar ✓, reading A ✓, reading B ✓, writing ✓, vocab in_progress

Both units are genuinely incomplete (listening, speaking, vocabulary not done).
She is NOT stuck at a wrong percentage — her percentage accurately reflects partial completion.
The "stuck at 95%" bug pattern affects students who complete all activities but a progress
row fails to write (e.g., the 4 speaking students backfilled in Prompt 04).

## Progress bar staleness root cause

Progress calculated ENTIRELY in frontend (`useUnitProgress.js` → `calculateUnitProgress()`).
No DB-side `unit_progress` table. No Realtime. After any submission:
- staleTime=60s means level browser can show stale data for up to 60s
- `fluentia:activity:complete` event now invalidates cache (fixed in Prompt 04) but this
  only works within the same session/tab
- Multiple devices/tabs don't sync

## This prompt's scope (not yet done)

1. `compute_unit_progress()` PL/pgSQL function (adapted to actual schema)
2. `unit_progress` table + RLS + Realtime publication
3. Trigger on `student_curriculum_progress` + `speaking_recordings`
4. `useResilientActivitySubmit` hook (generic loading-state wrapper)
5. Fix WritingTab.handleSubmit timing
6. Update `useUnitProgress.js` to read from `unit_progress` table with Realtime
7. Backfill script (via pg direct, not Supabase SDK — avoids row limit issues)
8. Updated admin diagnostic to show `unit_progress` breakdown

## Estimated blast radius

- Students with speaking recordings but no progress row: **0** (fixed in Prompt 04)
- Listening limbo rows (real students): **0** (fixed in Prompt 04)
- Writing submits that hang: affects anyone whose AI call takes > 15s (exact count unknown but real)
- Units with stale progress bars (all students, every session): widespread UX issue
