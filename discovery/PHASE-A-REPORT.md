# Phase A Discovery Report — Universal Retry + Phantom Kill
**Date:** 2026-05-09 | **Analyst:** Claude (automated) | **Awaiting:** `GO PHASE B` from Ali

---

## A.1 — Activity Tab Inventory

| Tab | File path | Submission table | Submit handler | Uses useActivitySubmit? | Custom submit logic? |
|---|---|---|---|---|---|
| Grammar | `src/pages/student/curriculum/tabs/GrammarTab.jsx` → delegates to `src/components/grammar/ExerciseSection.jsx` | `student_curriculum_progress` (grammar_id FK) | `handleFinish()` in ExerciseSection.jsx:342 | ❌ hook does not exist | ✅ Full custom logic (saveProgress + autosave effect) |
| Reading A/B | `src/pages/student/curriculum/tabs/ReadingTab.jsx` → `ReadingContent` → `ComprehensionSection` | `student_curriculum_progress` (reading_id FK) | `handleComprehensionComplete()` at line 210 | ❌ hook does not exist | ✅ Custom (upsert onConflict student_id,reading_id) |
| Listening | `src/pages/student/curriculum/tabs/ListeningTab.jsx` → `ListeningExercises` | `student_curriculum_progress` (listening_id FK) | `handleSubmit()` at line 403 | ❌ hook does not exist | ✅ Custom (upsert onConflict student_id,listening_id) — **HAS PHANTOM BUG** |
| Vocabulary (word review) | `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | `student_curriculum_progress` (unit_id + section_type='vocabulary') | Auto-marks on `markReviewed` (no explicit submit button) | ❌ hook does not exist | ✅ Custom (INSERT, then UPDATE by id) |
| Vocabulary Exercises (match/fill/choose/scramble) | `src/pages/student/curriculum/tabs/VocabularyExercises.jsx` | `student_curriculum_progress` (unit_id + section_type='vocabulary_exercise') | `handleSubmit()` inside each ExerciseRunner sub-component → calls `onComplete()` → `saveResult()` | ❌ hook does not exist | ✅ Custom (INSERT then UPDATE by id) |
| Assessment | `src/pages/student/curriculum/tabs/AssessmentTab.jsx` | N/A | N/A — **PLACEHOLDER ONLY** (shows "قريباً إن شاء الله") | N/A | N/A |
| Speaking | `src/pages/student/curriculum/tabs/SpeakingTab.jsx` | `student_curriculum_progress` (speaking_id FK) | Recording-based (voice submission) | ❌ hook does not exist | ✅ Custom — OUT OF SCOPE |
| Writing | `src/pages/student/curriculum/tabs/WritingTab.jsx` | `student_curriculum_progress` (writing_id FK) | Explicit submit after min word count | ❌ hook does not exist | ✅ Custom — OUT OF SCOPE |
| Pronunciation | `src/pages/student/curriculum/tabs/PronunciationTab.jsx` | `student_curriculum_progress` (pronunciation_id + unit_id + section_type='pronunciation') | Recording-based | ❌ hook does not exist | ✅ Custom |

> **CRITICAL FINDING (A.4):** `useActivitySubmit` and `useActivityAutoSave` **do not exist anywhere in the codebase**. The 2026-04-16 fix was implemented as inline save/submit separation logic within each tab component, not via shared hooks. Every tab has its own autosave + explicit-submit pattern.

---

## A.2 — Submission Tables Schema

**Single table: `student_curriculum_progress`** (all curriculum activity types write here)

### Full schema:
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| student_id | uuid | NO | — | FK → profiles |
| unit_id | uuid | YES | — | |
| reading_id | uuid | YES | — | |
| grammar_id | uuid | YES | — | |
| assessment_id | uuid | YES | — | |
| writing_id | uuid | YES | — | |
| listening_id | uuid | YES | — | |
| speaking_id | uuid | YES | — | |
| pronunciation_id | uuid | YES | — | |
| section_type | text | NO | — | discriminator: 'reading','grammar','listening','vocabulary','vocabulary_exercise','speaking','writing','pronunciation' |
| status | text | YES | 'not_started' | |
| score | numeric | YES | — | |
| answers | jsonb | YES | — | |
| time_spent_seconds | integer | YES | 0 | |
| completed_at | timestamptz | YES | — | |
| attempt_number | integer | YES | 1 | ✅ exists |
| is_latest | boolean | NO | true | ✅ exists |
| is_best | boolean | NO | true | ✅ exists |
| attempt_history | jsonb | YES | '[]' | for Reading/Listening: stores previous attempt summaries |
| hint_usage | jsonb | NO | '[]' | |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |
| (trainer/evaluation/redo columns) | various | YES | — | out of scope |

### Multi-attempt columns: ✅ All exist (attempt_number, is_latest, is_best)
### Status column: ✅ Exists

### Unique Constraints that BLOCK multi-attempt:
| Constraint name | Columns | Effect |
|---|---|---|
| `scp_unique_reading` | (student_id, reading_id) | ❌ Prevents multiple rows per student+reading — forces upsert/overwrite model |
| `scp_unique_listening` | (student_id, listening_id) | ❌ Prevents multiple rows per student+listening — forces upsert/overwrite model |
| `scp_unique_speaking` | (student_id, speaking_id) | OUT OF SCOPE |
| `scp_unique_writing` | (student_id, writing_id) | OUT OF SCOPE |

Grammar, Vocabulary, VocabularyExercises: **no unique constraint** — ✅ true multi-row multi-attempt works already (Grammar is correctly implemented this way).

---

## A.3 — Phantom Rows in Production

| Table | Pattern A (score=0, empty answers) | Pattern B (<3 sec, score<30) | Affected students |
|---|---|---|---|
| student_curriculum_progress (grammar) | 3 rows (score=0) | 0 | — |
| student_curriculum_progress (reading) | 0 | 0 | 0 |
| student_curriculum_progress (listening) | 0 | 0 | 0 |
| student_curriculum_progress (writing) | 4 rows (score=0) | 1 (<3 sec) | — |
| All other section types | 0 | 0 | 0 |

**Extended pattern (null studentAnswer in completed listening rows):**
- 1 row found from 2026-04-17T18:30 — `student=de70db0c`, score=67%, nullAnswers=1/3
- This is a **confirmed phantom-pattern row**: student submitted with 1 unanswered question (null studentAnswer) that was treated as answered because it existed as a key in the answers state

**Top affected students:**
- No classic zero-score phantoms in DB currently
- 1 student (de70db0c) has a partial-phantom (submitted with null answer)

**Lian (ليان عبدالله العنزي, layan88700@gmail.com, id=0c8112f5):**
- Does NOT appear in phantom scan — Lian likely retried after phantom (overwriting the phantom row since unique constraints on reading/listening force a single row)
- Latest grammar attempt: score=50% on 2026-05-09 (today — this may be the incident)
- Has an in-progress reading row (likely autosaved mid-session)

> **Note:** Phantom rows for Reading and Listening are self-healing (overwritten when student retries) due to the `onConflict` upsert model. This is why Pattern A shows 0 reading/listening phantoms — the evidence was destroyed by subsequent retries.

---

## A.4 — Hooks Coverage

**`useActivitySubmit` / `useActivityAutoSave` hooks: DO NOT EXIST in this codebase.**

The 2026-04-16 fix was NOT implemented via shared hooks. Instead, each tab has its own inline save/submit separation. No tab imports these hooks because they were never created.

Tabs NOT using useActivitySubmit/useActivityAutoSave:
- ALL tabs (Grammar, Reading, Listening, Vocabulary, VocabularyExercises, Assessment, Speaking, Writing, Pronunciation)

---

## A.5 — Multi-Attempt Schema Gaps

**No missing columns** — `attempt_number`, `is_latest`, `is_best` all exist on `student_curriculum_progress`.

However, the **unique constraints** (`scp_unique_reading`, `scp_unique_listening`) prevent the INSERT-per-attempt model required for true multi-attempt with separate rows. Grammar works correctly (INSERT-based, no unique constraint). Reading and Listening use the upsert-overwrite model which is structurally incompatible with the "each retry = new row" pattern.

---

## A.6 — Activity Type Discriminator

- **Table:** `curriculum_assessments`
- **Column:** `assessment_type` (text)
- **Also:** `is_promotion_gate` (boolean)

| Value | Meaning | Retry policy |
|---|---|---|
| `unit_quiz` | Per-unit quiz/assessment | **EXCLUDED from unlimited retry** |
| `mid_level` | Mid-level test | **EXCLUDED from unlimited retry** |
| `final` | Final level assessment | **EXCLUDED from unlimited retry** |
| `level_cumulative` | Level exit test (used in LevelExitTest.jsx) | **EXCLUDED from unlimited retry** |

Practice activities (IN SCOPE for unlimited retry):
- `section_type` = `reading`, `grammar`, `listening`, `vocabulary`, `vocabulary_exercise`

**Note:** The `AssessmentTab.jsx` component is a non-functional placeholder. The actual assessment flow is handled by separate pages (e.g., `LevelExitTest.jsx`, `StudentAssessments.jsx`), not the curriculum tab. So there is effectively no per-unit final assessment within the tab system to exclude — only the level-wide tests exist as a separate page flow.

---

## A.7 — ROOT CAUSE HYPOTHESIS

**Primary root cause of Lian's (and others') experience:**

The phantom bug lives in **`ListeningTab.jsx`'s `buildResults()` function**. When a student partially answers listening questions and the page freezes/reloads, the autosave writes ALL exercise results to DB — including unanswered ones with `studentAnswer: null` and `isCorrect: false`. On reload, the restore logic at `ListeningExercises` line 302–309:

```js
data.answers.questions.forEach(q => {
  restored[q.questionIndex] = { selected: q.studentAnswer, correct: q.isCorrect }
  // ← No null check! Every question gets an entry, even unanswered ones
})
```

sets `answers` state with ALL N question slots populated (even those with `null` as the selected value). This makes `answered = Object.keys(answers).length = total`, causing `allAnswered = true`. The submit button renders as ACTIVE with the label "تسليم الإجابات (N/N)" — making the student believe all questions are answered. Clicking submit triggers `saveProgress(answers, true)` which computes `score = (correct / total) * 100` where all null-answered questions contribute 0. Result: `status='completed'` with partial-to-zero score and all null questions marked wrong.

**This is confirmed by the production phantom row** from 2026-04-17 (`student=de70db0c`, score=67%, 1 null answer out of 3 — submitted while one question was still null because it appeared "answered" in state).

**Secondary issue:** `scp_unique_reading` and `scp_unique_listening` constraints force a single-row upsert model for Reading and Listening. Mid-retry autosaves overwrite the previous completion's `score`, `status`, and `completed_at` to null/in_progress. If the student then abandons the retry (force-reloads without submitting), the previous completion data is lost. This explains "activity shows as completed with 0%" — the DB row was flipped to in_progress by autosave, but the display state in a previous React session showed submitted, and on the NEXT reload the re-hydrated null answers + submit button causes the phantom.

**Grammar is immune** because `ExerciseSection`'s restore only loads non-null answers:
```js
if (r.studentAnswer != null) { restored[r.id] = ... }
```
Grammar also uses INSERT (no upsert), so previous completions are never overwritten.

---

## A.8 — Tabs That Need Fixing

1. **`ListeningTab.jsx`** — fix `buildResults()` / restore logic to exclude null answers from state. Critical phantom bug.
2. **`ReadingTab.jsx`** — the `handleComprehensionAutosave` overwrites `completed_at` and `score` to null during retry; the upsert model (scp_unique_reading) prevents true multi-attempt rows.
3. **`VocabularyExercises.jsx`** — auto-marks status='completed' without a DB guard trigger; if `allDone` triggers incorrectly, it could phantom-complete.

Tabs that are SAFE (do not need fixing for phantom):
- GrammarTab / ExerciseSection — null-safe restore, INSERT model, correct submit gate
- VocabularyTab — completion is word-review based (legitimate), no submit-button phantom path
- AssessmentTab — placeholder, no submission code
- SpeakingTab, WritingTab — OUT OF SCOPE

---

## A.9 — Tables That Need Migrating

**Single table:** `student_curriculum_progress`

Changes needed:
1. **Drop `scp_unique_reading`** — to enable INSERT-per-attempt for Reading (like Grammar does)
2. **Drop `scp_unique_listening`** — to enable INSERT-per-attempt for Listening
3. **Add DB-level guard trigger** — block `status='completed'` with empty answers on INSERT/UPDATE
4. **No schema column additions needed** — `attempt_number`, `is_latest`, `is_best` already exist

---

## A.10 — Estimated Phantom Rows to Heal

**0 current phantom rows meeting Pattern A** (zero score + empty answers).

However:
- 3 grammar rows with score=0 need review (may be legitimate zero scores)
- 4 writing rows with score=0 need review (likely trainer-graded at zero, may be legitimate)
- 1 listening row from 2026-04-17 with null studentAnswer (confirmed partial phantom)
- Unknown number healed by prior retries (evidence destroyed by upsert overwrites)

**Recommendation:** Rather than a bulk heal migration (no clear phantoms to heal), the fix is forward-looking:
1. Fix the null-answer bug in ListeningTab to prevent new phantoms
2. Drop the unique constraints to enable true multi-attempt
3. Add the DB trigger to block future phantoms

---

=== PHASE A COMPLETE — AWAITING `GO PHASE B` FROM ALI ===
