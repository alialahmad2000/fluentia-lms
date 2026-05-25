# Problem 1 — Vocabulary Completion Checkmarks Dropped
## Phase A Diagnosis (READ-ONLY)

**Date:** 2026-05-25
**Branch:** `megafix-vocab-listening-reading`
**DB:** prod `nmjexpuycmqcxuxljier` (probed via service-role + one authenticated-student JWT)
**Scope:** Why completing a vocabulary exercise no longer shows the green checkmark.

---

## TL;DR ROOT CAUSE

**A DB trigger (`trg_recompute_unit_progress`) fires on every write to `vocabulary_word_mastery` and throws `record "new" has no field "unit_id"` before its own fallback runs — so every checkmark-save upsert from `WordExerciseModal` fails silently (caught → "تعذر حفظ التقدم") and no `*_exercise_passed` / `mastery_level` row is ever written; secondarily, the default word-tap behavior now opens the read-only `WordDetailSheet` instead of the exercise modal, so most students never even reach the (broken) writer.**

The write-cutoff date in prod (last organic `vocabulary_word_mastery` write = **2026-05-14**) matches the trigger migration date (`20260514100000_compute_unit_progress.sql`) **exactly**.

---

## 1A.1 — Entry-Points Inventory

Raw grep saved to `docs/audits/vocab-checkmarks/entry-points-raw.txt`.

| # | File | Purpose | Success-state UI | Function that fires it | Table written |
|---|------|---------|------------------|------------------------|---------------|
| 1 | `src/components/vocabulary/WordExerciseModal.jsx` | The 3-exercise drill (meaning / sentence / listening) per word — **the only writer of the checkmark booleans** | 3 green dots in header (`passedCount`), green ✓ per exercise row, "أتقنت هذه الكلمة!" | `handleExerciseComplete` → `supabase.from('vocabulary_word_mastery').upsert(...).select()` | `vocabulary_word_mastery` (+ `xp_transactions`, + `curriculum_vocabulary_srs` via `applyRating`) |
| 2 | `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | Unit vocab library: word cards w/ mastery dots, filters (mastered/learning), completion banner | Per-card 3 dots (`mastery?.*_exercise_passed`), green border when `mastery_level==='mastered'`, "أتقنتها" pill, mastery % banner | Reads via `useVocabularyMastery`; routes taps to #1 or #6 via `onTapWord`/`tapBehavior` | reads `vocabulary_word_mastery`; writes `student_curriculum_progress` (section reviewed-count, NOT checkmarks) |
| 3 | `src/hooks/useVocabularyMastery.js` | React Query source for the mastery map keyed `['vocabulary-mastery', profile.id, unitId]` | n/a (data layer) | `useQuery` → reads; `updateMastery` mutation (unused by checkmark path) | reads `vocabulary_word_mastery` |
| 4 | `src/components/curriculum/journey/ChunkMiniSession.jsx` (+ `ChunkLane.jsx`) | "Journey lane" chunk drill — funnels one word at a time into #1 | chunk progress; delegates checkmark writes to #1 | `onRequestNextWord` → opens #1 (`setExerciseWord`) | via #1 → `vocabulary_word_mastery` |
| 5 | `src/components/curriculum/hero/HeroSection.jsx` | Hero "tap next word" → opens #1 | mastery orb/stats | `onOpenWord` → opens #1 | via #1 |
| 6 | `src/components/curriculum/word-detail/WordDetailSheet.jsx` | **Default single-tap target** (since 2026-05-21). Read-only enrichment drawer + SRS stats | mastery *badge* (read-only, from `mastery_level`); NO checkmark write | "تدرّب على هذي الكلمة" → defers to #1; "أضفها للمراجعة الفورية" → SRS only | **writes NOTHING to `vocabulary_word_mastery`**; `addWordToImmediateReview` → `curriculum_vocabulary_srs` |
| 7 | `src/pages/student/curriculum/tabs/VocabularyExercises.jsx` | Unit-level batch exercises (separate from per-word) | section complete badge | `awardCurriculumXP('vocabulary_exercise')` | `student_curriculum_progress` (section_type=`vocabulary_exercise`) — not the per-word checkmark |
| 8 | `src/pages/student/vocabulary/VocabularyFlashcards.jsx` + `components/VocabularyPractice.jsx` | Standalone flashcards / quiz | flip / quiz result | `saveQuizAttempt` | `vocabulary_quiz_attempts` (not checkmarks) |
| 9 | `src/components/srs/SrsReviewSession.jsx`, `src/pages/student/SrsHome.jsx`, `DailyReview.jsx` | SRS / FSRS daily review | rating buttons | `applyRating` | `curriculum_vocabulary_srs` + `srs_review_logs` (active, healthy) |
| 10 | `src/components/hard-words/*` + `HardWordsHome.jsx` | Hard-words drills | drill feedback | `recordDrill` | `hard_words_drill_log` (active) |

**Conclusion:** the green checkmark dots come from exactly ONE writer — `WordExerciseModal` (#1) — into ONE table — `vocabulary_word_mastery`. Everything else (#7–#10) writes other tables and is unaffected/healthy.

---

## 1A.2 — Schema vs Code

Columns confirmed against prod via `.select('*').limit(1)` key-listing.

| Table | Exists? | Code writes | Mismatch? |
|-------|---------|-------------|-----------|
| `vocabulary_word_mastery` | ✅ | `student_id, vocabulary_id, *_exercise_passed, *_exercise_attempts, *_exercise_passed_at, last_practiced_at, mastery_level` | **Code is correct.** Table has NO `unit_id` column — but a TRIGGER references `NEW.unit_id` (see 1A.3). |
| `curriculum_vocabulary_srs` | ✅ | via `applyRating`: `state, due, last_review, stability, difficulty, reps, lapses, elapsed_days, scheduled_days` | none — matches |
| `srs_review_logs` | ✅ | `student_id, vocabulary_id, rating, state_before, state_after, stability_after, difficulty_after, elapsed_days, scheduled_days` | **Table uses `reviewed_at` (NOT `created_at`).** `applyRating` insert does NOT send `created_at`, so this is fine. (Note: some *read* helpers must use `reviewed_at`.) |
| `vocabulary_quiz_attempts` | ✅ | `student_id, unit_id, chunk_index, chunk_size, total_questions, correct_count, wrong_word_ids, duration_seconds, xp_awarded` | none |
| `hard_words_drill_log` | ✅ (exists) | `student_id, vocabulary_id, drill_mode, is_correct, response_ms, attempted_at` | none |
| `curriculum_vocabulary` | ✅ (13,930 rows) | read-only here | none |

No code-vs-column mismatch in the JS write payloads. **The mismatch is in a server-side trigger function (1A.3), not in the client.**

---

## 1A.3 — RLS / Trigger Findings

`vocabulary_word_mastery` RLS (from `supabase/migrations/078_vocabulary_word_mastery.sql`):

| Operation | Policy | Resolves for student? |
|-----------|--------|------------------------|
| SELECT | `students_own_mastery_select`: `student_id = auth.uid()` | ✅ (verified live: student JWT SELECT returned 3 rows) |
| INSERT | `students_own_mastery_insert`: WITH CHECK `student_id = auth.uid()` | ✅ |
| UPDATE | `students_own_mastery_update`: USING `student_id = auth.uid()` | ✅ |
| staff/admin SELECT/ALL | role check via profiles | ✅ |

`students.id` is `PRIMARY KEY REFERENCES profiles(id)` (migration 001 line 113) → **`students.id === profiles.id === auth.uid()`** (verified live: auth_uid `0c8112f5…` === student_id). The code passes `studentId={profile?.id}` and `useVocabularyMastery(profile?.id, …)` — **correct**; no ID-mismatch bug. RLS is NOT the cause.

### 🔴 The actual server-side bug — a BEFORE-fallback trigger throw

`supabase/migrations/20260514100000_compute_unit_progress.sql` attaches `recompute_unit_progress_vocabulary_word_mastery` (AFTER INSERT/UPDATE/DELETE) → `trg_recompute_unit_progress()`. The function body (line 289):

```sql
v_unit_id := COALESCE(NEW.unit_id, OLD.unit_id);   -- ❌ vocabulary_word_mastery has NO unit_id column
-- The intended fallback below is UNREACHABLE — plpgsql throws on line above:
IF v_unit_id IS NULL AND TG_TABLE_NAME = 'vocabulary_word_mastery' THEN
   SELECT cr.unit_id ... -- never reached
```

plpgsql raises **`record "new" has no field "unit_id"`** the moment the trigger fires on this table. **Verified LIVE** via an authenticated student (ليان) magiclink JWT: a benign idempotent upsert returned `ERR record "new" has no field "unit_id"`. The fallback (lines 292–298) that was meant to handle the missing column never executes because the reference on line 289 evaluates first.

Two later migrations (`20260519000000`, `20260519120000`) only `CREATE OR REPLACE compute_unit_progress` (the inner calc) — they do **NOT** redefine `trg_recompute_unit_progress`, so this broken function is still live in prod.

---

## 1A.4 — Live Data Probe (3 active students + global)

Scripts: `docs/audits/_megafix-tmp/{vocab-probe,vocab-history,tap-behavior,rls-jwt-check}.mjs`.

**Table counts:** `vocabulary_word_mastery` = 3,473 · `curriculum_vocabulary_srs` = 124 · `srs_review_logs` = 147 · `vocabulary_quiz_attempts` = 13 · `hard_words_drill_log` = 2.

| Student | mastery rows | by level | writes in last 7d | SRS rows | vocab section rows |
|---------|-------------|----------|--------------------|----------|---------------------|
| ليان العنزي (`0c81…`) | 119 | mastered:119 | **0** | 3 (learning) | 5 (2 completed) |
| نورة اليامي (`d1a3…`) | 296 | mastered:296 | **0** | 0 | 4 (0 completed) |
| سارة العرابي (`338e…`) | 2 | mastered:2 | **0** | 4 (learning) | 2 |

**Global `vocabulary_word_mastery` write history (full table):**
- `mastery_level` distribution is HEALTHY: `mastered: 999, learning: 1` in a 1000-row sample, `passed_but_new_or_null = 0` → the MEGA-FIX V2 "mastery_level stuck NULL" bug is NOT recurring.
- `updated_at` by day: rows on Apr 28 → **May 14**, then **ZERO**. `rows_updated_after_2026-05-14 = 0`, `students_active_after_May14 = 0`.
- Latest write across the ENTIRE table: **2026-05-14T10:14** (11 days before this audit).

**Are rows being written? — NO (to this table).** Partial overall: students ARE active in vocabulary, but only via the SRS/hard-words paths:
- `srs_review_logs`: writes as recent as **2026-05-24** (yesterday).
- `hard_words_drill_log`: writes **2026-05-23**.
- `student.last_vocab_visit_at`: ليان visited **2026-05-23**, منار **2026-05-22**.

So students open the vocab tab and tap words daily — but **no checkmark row has been saved since May 14**, exactly when the recompute trigger shipped.

---

## 1A.5 — UI Render-Chain Trace (per entry point)

The chain for the checkmark:

1. **Read:** `VocabularyTab` → `useVocabularyMastery(profile.id, unitId)` → React Query key `['vocabulary-mastery', profile.id, unitId]` → SELECT `vocabulary_word_mastery`. ✅ works (RLS SELECT ok).
2. **Render:** `WordCard` reads `mastery?.meaning_exercise_passed | sentence_… | listening_…` → 3 dots; `mastery?.mastery_level === 'mastered'` → green border + "أتقنتها". ✅ logic correct.
3. **Write:** tap a word →
   - **Default path (`tapBehavior === 'details'`, ALL 22 active students):** `onTapWord` → `setDetailSheetWord(w)` → **`WordDetailSheet` (read-only)**. Student must click a SECOND button ("تدرّب") to reach the writer. **Chain breaks here for most students.**
   - **Practice path (#1 reached, e.g. via Hero / Journey / "تدرّب"):** `handleExerciseComplete` → `upsert(...).select()` → **trigger throws `unit_id`** → caught → `toast('تعذر حفظ التقدم')` → `onMasteryUpdate(undefined)` → `handleMasteryUpdate` invalidates the query but the DB has no new row → **dots stay grey. Chain breaks here too (the deeper, primary break).**
4. **Cache invalidation:** `handleMasteryUpdate` correctly calls `setQueryData` + `invalidateQueries`. Cache logic is FINE — there is simply nothing new to read because the write failed.

**First (and primary) break:** the write itself — the recompute trigger throwing on `NEW.unit_id`. Even with `tapBehavior='practice'`, the checkmark would not save. The tap-behavior default is a second, compounding break that hides the modal from most students.

---

## ROOT CAUSE (one sentence)

The `trg_recompute_unit_progress()` trigger fires `AFTER INSERT/UPDATE` on `vocabulary_word_mastery` and unconditionally evaluates `NEW.unit_id` (a column that table does not have) before its own fallback can run, so every checkmark-save upsert raises `record "new" has no field "unit_id"`, fails silently in the modal's try/catch, and writes no mastery row — compounded by the post-2026-05-21 default that routes a single word-tap to the read-only `WordDetailSheet` instead of the exercise modal.

---

## Plan for Phase B (specific files to touch)

1. **DB (primary fix) — new idempotent migration**
   `supabase/migrations/<ts>_fix_recompute_unit_progress_vwm.sql`:
   `CREATE OR REPLACE FUNCTION trg_recompute_unit_progress()` that does NOT reference `NEW.unit_id` when the table lacks it. Replace line 289 with a table-aware resolution, e.g.:
   - default `v_unit_id := NULL;`
   - `IF TG_TABLE_NAME = 'vocabulary_word_mastery' THEN` resolve via `vocabulary_id → curriculum_vocabulary.reading_id → curriculum_readings.unit_id`;
   - `ELSE v_unit_id := COALESCE(NEW.unit_id, OLD.unit_id); END IF;`
   (Use `to_jsonb(NEW) ? 'unit_id'` guard, or per-table branch — plpgsql evaluates field refs lazily inside branches, so branching by `TG_TABLE_NAME` avoids the throw.) Keep `SECURITY DEFINER`. Apply on a Supabase branch DB first; Ali promotes to prod.

2. **DB sanity (no data mutation):** after the trigger fix, optionally backfill nothing — historical rows are intact; new exercise passes will write correctly.

3. **Frontend (secondary fix) — restore the exercise modal as the primary tap target.** Either:
   - `supabase/migrations/<ts>_vocab_tap_default_practice.sql`: change `profiles.vocab_tap_behavior` DEFAULT to `'practice'` (and/or one-time `UPDATE profiles SET vocab_tap_behavior='practice' WHERE vocab_tap_behavior='details'` — Ali's call, since some students may prefer details), **OR**
   - `src/pages/student/curriculum/tabs/VocabularyTab.jsx` (line ~238 `tapBehavior` default; lines ~742–746 `onTapWord`): make the default route open `WordExerciseModal`, keeping `WordDetailSheet` reachable via a clearly-labeled secondary affordance. Lower-risk: leave the sheet but add a prominent in-sheet "تدرّب" that's the default focus.

4. **Frontend hardening (defense-in-depth) — surface the real save error.**
   `src/components/vocabulary/WordExerciseModal.jsx` `handleExerciseComplete` catch block (line ~131): currently shows a generic toast and swallows the DB error. After the trigger fix this won't fire, but add the error code to the toast/console so a future server-side regression is visible instead of silent.

5. **Verify:** re-run `docs/audits/_megafix-tmp/rls-jwt-check.mjs` against the branch DB — expect `upsert_with_select = OK returned 1 row`. Then confirm a fresh exercise pass writes a row with `updated_at` > now and `mastery_level` advances.

Scratch scripts live under `docs/audits/_megafix-tmp/`.
