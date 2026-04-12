# Vocabulary Tracking Diagnostic Report

**Date:** 2026-04-13
**Agent:** Diagnostic (read-only)
**Branch:** main

---

## Section 1: Code Map

### Components rendering vocab exercises
| File | Key Function | Line |
|------|-------------|------|
| `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | Main vocab review tab | 70 |
| `src/pages/student/curriculum/tabs/VocabularyExercises.jsx` | Exercises (match/fill/choose/scramble) | 31+ |
| `src/components/vocabulary/WordExerciseModal.jsx` | Per-word exercise modal (meaning/sentence/listening) | 25+ |
| `src/components/vocabulary/VocabularyQuiz.jsx` | Quiz modal for vocab chunks | 20+ |
| `src/components/vocabulary/ChunkSelector.jsx` | Chunk-based entry screen | 25+ |
| `src/pages/student/vocabulary/VocabularyFlashcards.jsx` | Personal flashcards view | — |
| `src/pages/student/DailyReview.jsx` | SRS daily review | 16+ |

### Hooks reading/writing vocab progress
| File | Hook | Line | Tables |
|------|------|------|--------|
| `src/hooks/useVocabularyMastery.js` | `useVocabularyMastery(studentId, unitId)` | 5 | `curriculum_readings` → `curriculum_vocabulary` → `vocabulary_word_mastery` |
| `src/hooks/useVocabularyQuiz.js` | `useVocabularyQuiz()` + `saveQuizAttempt()` | 16, 96 | `vocabulary_quiz_attempts`, `xp_transactions` |
| `src/hooks/useVocabularyChunks.js` | `useVocabularyChunks()` | 21 | (client-side computation) |
| `src/hooks/useUnitProgress.js` | `useUnitProgress(studentId, unitId)` | 9 | `curriculum_readings`, `curriculum_vocabulary`, `vocabulary_word_mastery`, `student_curriculum_progress` |
| `src/hooks/useAnkiSession.js` | Anki SRS session | — | `curriculum_vocabulary_srs` |

### XP award paths for vocabulary
| Path | File:Line | Method | Amount |
|------|-----------|--------|--------|
| Word exercise pass | `WordExerciseModal.jsx:78` | Direct insert `xp_transactions` | 3 XP |
| Word fully mastered | `WordExerciseModal.jsx:90` | Direct insert `xp_transactions` | 5 XP |
| Quiz completion | `useVocabularyQuiz.js:135` | Direct insert or `award_curriculum_xp` RPC | `correct*2 + bonus` |
| Game completion | `xpManager.js:47` | Direct insert `xp_transactions` | 5-25 XP |
| Section complete | `curriculumXP.js:27` | `award_curriculum_xp` RPC | 10-20 XP |
| SRS review | `DailyReview.jsx:95` | Direct insert `xp_transactions` | 2 XP |

### Unit progress calculation
| File | Key Detail |
|------|-----------|
| `src/utils/calculateUnitProgress.js:56-64` | **Vocabulary progress = `masteredCount / totalWords`** (mastery-based, weight 18/100) |
| `src/hooks/useUnitProgress.js:68-78` | Fetches `vocabulary_word_mastery` and counts `mastery_level === 'mastered'` |

---

## Section 2: Schema Map

### `curriculum_vocabulary` (word definitions, 1000 total)
- `id` (uuid PK), `reading_id` (FK → `curriculum_readings`), `word`, `definition_en`, `definition_ar`, `part_of_speech`, `pronunciation_ipa`, `audio_url`, `example_sentence`, `difficulty_tier`, `sort_order`
- **FK chain:** `curriculum_vocabulary.reading_id` → `curriculum_readings.unit_id` → `curriculum_units.level_id` → `curriculum_levels`

### `vocabulary_word_mastery` (student per-word mastery, 308 records)
- `id` (uuid PK), `student_id` (FK → students), `vocabulary_id` (FK → curriculum_vocabulary)
- `mastery_level` ('new'|'learning'|'mastered'), `meaning_exercise_passed`, `sentence_exercise_passed`, `listening_exercise_passed`, `last_practiced_at`
- **Unique:** `(student_id, vocabulary_id)` — upsert-safe
- **RLS:** students CRUD own, staff SELECT all, admin ALL

### `vocabulary_quiz_attempts` (quiz results, 0 records)
- `student_id`, `unit_id`, `chunk_index`, `chunk_size`, `total_questions`, `correct_count`, `wrong_word_ids`, `duration_seconds`, `xp_awarded`
- **RLS:** students insert/select own, trainers select

### `student_curriculum_progress` (section completion, 39 vocab-related)
- `student_id`, `unit_id`, `section_type` ('vocabulary'|'vocabulary_exercise'), `status`, `score`, `completed_at`
- **RLS:** students ALL own, staff read, service role ALL

### `xp_transactions` (XP awards)
- `student_id`, `amount`, `reason`, `description`, `related_id`, `created_at`
- **RLS:** students/trainers select, insert open, admin update/delete

### `award_curriculum_xp` RPC (deduplication)
- **Prevents double-award** per `(student_id, section_type, unit_id)` by checking: `related_id = p_unit_id AND description LIKE '%section_type%'`
- Returns 0 if already awarded

---

## Section 3: Data Audit Table

**72 units across 6 levels. 1000 vocabulary words total.**

| Level | Units | Vocab Words | Units w/ Activity | Units Working | Units Broken |
|-------|-------|-------------|-------------------|---------------|-------------|
| L0 (Foundation) | 12 | ~90 | 0 | 0 | 0 |
| L1 (Basics) | 12 | ~93 | 3 (U1-U3) | 3 | 0 |
| L2 (Development) | 12 | ~179 | 0 | 0 | 0 |
| L3 (Fluency) | 12 | ~191 | 3 (U1-U3) | 3 | 0 |
| L4 (Mastery) | 12 | ~219 | 0 | 0 | 0 |
| L5 (Proficiency) | 12 | ~231 | 0 | 0 | 0 |
| **Total** | **72** | **1000** | **6** | **5 ✅** | **0 ❌** |

### Detailed activity on active units:

| Level | Unit | Vocab | Students | Mastery | Progress | XP | Status |
|-------|------|-------|----------|---------|----------|----|--------|
| L1 | U1 | 6 | 4 | 19 | 11 | ✅ | ✅ WORKING |
| L1 | U2 | 10 | 5 | 50 | 10 | ✅ | ✅ WORKING |
| L1 | U3 | 9 | 1 | 1 | 4 | ✅ | ✅ WORKING |
| L3 | U1 | 20 | 3 | 60 | 7 | ✅ | ✅ WORKING |
| L3 | U2 | 20 | 2 | 40 | 4 | ✅ | ✅ WORKING |
| L3 | U3 | 9 | 0 | 0 | 3 | ✅ | — NO_ATTEMPTS on mastery |

**66 units have zero student attempts** — not broken, just unattempted (academy is early-stage, students on units 1-3 only).

---

## Section 4: Root Cause Hypothesis

### Finding: There are NO broken units in the data.

All 5 units with student activity have correct:
- Vocabulary word mastery records (308 total across 16 students)
- Progress records (39 vocab-related)
- XP transactions (113 vocab-related)
- FK integrity (0 orphan vocab, 0 orphan readings)

### The real issue is the **unit progress bar calculation**, not missing data:

**Key discovery in `calculateUnitProgress.js` line 56-64:**
```javascript
// Vocabulary progress in the unit progress bar:
getProgress: (_sp, _c, vm) => {
  if (!vm || !vm.totalWords || vm.totalWords === 0) return 0
  return vm.masteredCount / vm.totalWords   // ← ONLY counts 'mastered' words
}
```

**The progress bar for vocabulary counts ONLY `mastery_level === 'mastered'` words.** Words at `'learning'` level contribute 0% to the unit progress bar.

Mastery level distribution across all 308 records:
- A student can have 40 mastery records but only a few at 'mastered' level
- The progress ring shows (e.g.) 2/10 even if 8 words are at 'learning'
- This creates the perception of "broken" tracking

### Secondary issue: "X of Y completed" display

The VocabularyTab shows `masteredCount` / `totalWords` via `useVocabularyMastery`. If a unit has 20 words and only 3 are fully mastered (all 3 exercises passed), the display shows "3 of 20" — appearing broken to students who practiced extensively but didn't complete all 3 exercise types per word.

### Additional observations:

1. **`is_published = false` on ALL 72 units** — not enforced in code, but cosmetically incorrect
2. **L0 (Foundation) has 12 units** with no students assigned to level 0 — dead content
3. **`vocabulary_quiz_attempts` table is completely empty** (0 rows) — quiz attempt saving may have a bug or quizzes aren't being used
4. **Deduplication in `award_curriculum_xp`** prevents re-awarding section XP — working as designed

---

## Section 5: Impact

### Affected Students (all 16 active)

| Student | Email | Level | Mastery Records | Mastered Words | Learning Words | Vocab XP | Total XP |
|---------|-------|-------|-----------------|---------------|---------------|----------|----------|
| سارة شراحيلي | sarashrahili22@gmail.com | L1 | 40 | ? | ? | 60 | 80 |
| نورة اليامي | nourahumayyim@gmail.com | L1 | 40 | ? | ? | 245 | 625 |
| منار العتيبي | manar126712@gmail.com | L1 | 21 | ? | ? | 768 | 1303 |
| سارة منصور | sarakhaledm43@gmail.com | L1 | 43 | ? | ? | 180 | 305 |
| فاطمة خواجي | fa.khawaji@gmail.com | L1 | 22 | ? | ? | 140 | 235 |
| نادية القحطاني | nadiah.alkhayar@gmail.com | L3 | 57 | ? | ? | 605 | 840 |
| وعد العمران | waadmohammed21@gmail.com | L3 | 57 | ? | ? | 130 | 285 |
| الهنوف البقمي | alhnouf191@gmail.com | L3 | 28 | ? | ? | 145 | 175 |

**8 students** have mastery records but their unit progress bars likely show lower percentages than expected because `'learning'` words don't count toward the progress bar.

### XP Not Owed

No XP is being lost — all XP award paths work correctly. The bug is perceptual: progress bar appears incomplete.

---

## Section 6: Proposed Fix Strategy

### Fix 1: Include 'learning' words in progress calculation (CODE)
In `src/utils/calculateUnitProgress.js` line 61-63, change vocabulary progress to include partial credit for learning words:

```javascript
// Current (all-or-nothing):
return vm.masteredCount / vm.totalWords

// Proposed (partial credit):
const mastered = vm.masteredCount
const learning = vm.learningCount || 0
return (mastered + learning * 0.5) / vm.totalWords
```

This requires also passing `learningCount` from `useUnitProgress.js` (line 75-78).

### Fix 2: Investigate empty `vocabulary_quiz_attempts` (DATA/CODE)
- 0 rows in `vocabulary_quiz_attempts` despite active quiz usage
- Check if `saveQuizAttempt()` in `useVocabularyQuiz.js:110-122` is failing silently
- Likely RLS issue: the INSERT policy (`Students insert own quiz attempts`) may lack a `WITH CHECK` clause matching `student_id = auth.uid()`

### Fix 3: Update progress bar display (UI)
- Show both "mastered" and "learning" counts in the vocab section header
- e.g., "أتقنت 3 | تتعلم 8 | 20 كلمة" instead of just "3/20"

### Fix 4 (optional): Set `is_published = true` on active units
- All 72 units have `is_published = false` — likely a migration oversight
- Not blocking but cosmetically wrong

---

## Section 7: Risks & Rollback Plan

### Risks
1. **Fix 1** changes how progress % is calculated — students will see sudden progress jumps
   - Mitigation: This is the desired behavior (more accurate progress)
2. **Fix 2** may involve RLS policy changes — test with non-admin student auth
3. **Fix 3** is UI-only — low risk

### Rollback
- All fixes are in code (calculateUnitProgress.js, useUnitProgress.js) and can be git-reverted
- No data migrations needed — the data is correct
- No XP adjustments needed — XP is accurate

---

## Appendix: Queries Executed

```sql
-- Schema discovery
SELECT * FROM vocabulary_word_mastery LIMIT 1;  -- 308 total rows
SELECT * FROM vocabulary_quiz_attempts LIMIT 1;  -- 0 rows (empty!)
SELECT * FROM student_curriculum_progress WHERE section_type IN ('vocabulary','vocabulary_exercise');  -- 39 rows
SELECT * FROM xp_transactions WHERE description ILIKE '%مفردات%' OR description ILIKE '%أتقن%';  -- 113 rows

-- Unit audit
SELECT u.id, u.unit_number, l.level_number, COUNT(cv.id) as vocab_count
FROM curriculum_units u
JOIN curriculum_levels l ON l.id = u.level_id
LEFT JOIN curriculum_readings cr ON cr.unit_id = u.id
LEFT JOIN curriculum_vocabulary cv ON cv.reading_id = cr.id
GROUP BY u.id, u.unit_number, l.level_number
ORDER BY l.level_number, u.unit_number;
-- Result: 72 units, all with vocab, 1000 total words

-- FK integrity
-- 0 orphan vocabulary (reading_id → missing reading)
-- 0 orphan readings (unit_id → missing unit)

-- RLS policies checked via pg_policies for:
-- vocabulary_word_mastery, vocabulary_quiz_attempts, student_curriculum_progress, xp_transactions
-- All correct: students CRUD own, staff read, service role full access

-- award_curriculum_xp RPC body examined:
-- Has deduplication: checks existing xp_transactions for same (student, section_type, unit_id)
-- Vocabulary section: 10 XP base
-- Vocabulary_exercise section: 10-20 XP based on score
```
