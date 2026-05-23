# MOCK EXAM — CRITICAL: Real Scoring Bug Diagnosis + Repair

## ⚠ WHAT WE NOW KNOW (this changes everything)

Previous incident investigations focused on the wrong layer. Looking at the admin dashboard screenshot Ali just shared:

**Ali's own attempt (admin@fluentia.academy) shows:**
- Started 03:33 KSA, submitted 04:27 KSA (54-minute attempt — substantial)
- **34 answers saved** (out of 35 for A1)
- **52 words written** (above the 50-word minimum)
- **Final score: 15/100**
- `ai_writing_status = pending` — for an attempt submitted at 04:27, now several hours later
- Status `قيد المراجعة` (revealed=false)

This is **NOT a network issue**. Ali's answers WERE saved. His writing WAS captured. The submit DID complete. Yet the score is 15/100 — which means either the auto-grading logic is wrong, OR most of his `selected_index` values are NULL (the UI never persisted them despite appearing to), OR the `correct_index` values in the seeded questions are wrong.

The AI grading for HIS attempt also never ran — `ai_writing_status='pending'` hours later means the edge function was never invoked OR it ran and failed silently.

**Previous resilience patches (commits 6172384 and 0dd1390) addressed the wrong layer.** They added timeouts and heartbeats to the save/submit path. But the real bug is downstream: **answers persist, scoring breaks**. We need to forensically dissect Ali's attempt row by row to find which of these is true:

1. The UI sent `selected_index` correctly to `mock_exam_save_answer`, but the value got dropped on the server (RLS or RPC parameter handling)
2. The UI sent `selected_index` incorrectly (always null or wrong index) due to a state bug
3. The values were saved correctly, but the `mock_exam_submit` RPC's grading query is broken
4. The values were saved correctly, the grading ran, but the `correct_index` in the seeded questions is wrong for ~85% of questions (would explain 15/100 with 34 attempted)
5. The grading ran correctly, score is genuinely 15/100, and Ali's exam was just hard

We need data, not assumptions. This prompt does forensic diagnosis on Ali's own attempt FIRST (safest possible test subject — it's his own data), finds the root cause, fixes it, re-grades everyone affected.

---

## SACRED RULES (broken assumptions from the past — be careful)

1. **"Admin = test account" is FALSE.** Ali submits real exams to test. His attempts are production data and must be diagnosed, not skipped.
2. **`is_test_account=false` does NOT mean "real student."** It means "not flagged as a test account." Diagnose every attempt regardless of role.
3. **The 8 existing RPCs are not necessarily bug-free.** We've been treating `mock_exam_submit` as a sealed unit. This prompt will inspect its actual behavior, not just trust it.
4. **The 74 seeded questions might have bad `correct_index` values.** Verify a sample by hand.
5. **`ai_writing_status='pending'` for an attempt submitted hours ago means the edge function was never successfully invoked for it.** Investigate the kick-off chain.
6. **Network resilience changes shipped in 6172384 + 0dd1390 stay** — they don't hurt anything. But they don't fix THIS class of bug. Don't add more resilience. Find the actual bug.

---

## Working context

- **Repo:** `alialahmad2000/fluentia-lms`, branch `main`
- **Supabase ref:** `nmjexpuycmqcxuxljier`
- **Last commit:** `0dd1390`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Subject of diagnosis:** `admin@fluentia.academy` attempt, started 2026-05-22 03:33 KSA, submitted 2026-05-22 04:27 KSA. Find it via SQL — don't hardcode the ID, look it up.

---

## PHASE A — Pull the raw evidence (no changes, just look)

Write findings to `docs/MOCK-EXAM-SCORING-DIAGNOSIS.md` and to terminal. Be specific. Numbers, not narratives.

### A.1 — Find Ali's attempt + dump every column

```sql
SELECT *
FROM mock_exam_attempts
WHERE student_id = (SELECT id FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@fluentia.academy'))
ORDER BY started_at DESC
LIMIT 5;
```

Print the entire row(s). All scores. All timestamps. The `writing_response` text (first 500 chars). `is_revealed`. `ai_writing_status`. `manual_writing_score`.

### A.2 — Every answer row Ali saved

```sql
WITH ali_attempt AS (
  SELECT a.id
  FROM mock_exam_attempts a
  JOIN auth.users u ON u.id = a.student_id
  WHERE u.email = 'admin@fluentia.academy'
  ORDER BY a.started_at DESC LIMIT 1
)
SELECT
  q.section,
  q.order_index,
  q.question_type,
  LEFT(q.stem, 80) AS stem_preview,
  q.options,
  q.correct_index AS expected_index,
  q.acceptable_answers AS expected_text,
  ans.selected_index AS got_index,
  ans.text_answer AS got_text,
  ans.is_correct,
  ans.points_awarded,
  q.points AS max_points
FROM mock_exam_answers ans
JOIN mock_exam_questions q ON q.id = ans.question_id
WHERE ans.attempt_id = (SELECT id FROM ali_attempt)
ORDER BY
  CASE q.section
    WHEN 'reading' THEN 1 WHEN 'vocabulary' THEN 2
    WHEN 'spelling' THEN 3 WHEN 'grammar' THEN 4
    WHEN 'writing' THEN 5
  END,
  q.order_index;
```

For each row, print all columns. Look for patterns:
- Are most `got_index` NULL? → UI never persisted
- Are most `got_index` populated but `is_correct=false`? → either bad answers OR bad `correct_index`
- Are most `got_index` populated AND match `expected_index` but `is_correct=null`? → scoring never ran
- Are `points_awarded` summing to 15 across non-writing sections? → matches the visible total, scoring DID run, answers are just genuinely wrong

### A.3 — Sanity-check the seeded `correct_index` values

Pick 5 questions from Ali's exam that he got "wrong." Read the stem + options + correct_index. Verify by hand — if you can, is the marked correct index actually right?

For example: a grammar MCQ `"She ___ a student."` with options `["am","is","are","be"]` and `correct_index=0` would be a seed bug — the correct answer is "is" (index 1).

```sql
-- Pull 10 questions Ali got wrong, full detail
WITH ali_attempt AS (
  SELECT a.id
  FROM mock_exam_attempts a
  JOIN auth.users u ON u.id = a.student_id
  WHERE u.email = 'admin@fluentia.academy'
  ORDER BY a.started_at DESC LIMIT 1
)
SELECT
  q.section, q.order_index, q.question_type,
  q.stem, q.options, q.correct_index, q.acceptable_answers,
  ans.selected_index, ans.text_answer, ans.is_correct
FROM mock_exam_answers ans
JOIN mock_exam_questions q ON q.id = ans.question_id
WHERE ans.attempt_id = (SELECT id FROM ali_attempt)
  AND (ans.is_correct = false OR ans.is_correct IS NULL)
LIMIT 10;
```

If even 1 of the 10 has an obviously wrong `correct_index`, surface immediately. We'll spot-check more.

### A.4 — Cross-check: count answers vs scoring

```sql
WITH ali_attempt AS (
  SELECT a.id, a.score_total, a.score_grammar, a.score_reading,
         a.score_vocabulary, a.score_spelling, a.score_writing
  FROM mock_exam_attempts a
  JOIN auth.users u ON u.id = a.student_id
  WHERE u.email = 'admin@fluentia.academy'
  ORDER BY a.started_at DESC LIMIT 1
)
SELECT
  q.section,
  COUNT(*) AS answered,
  COUNT(*) FILTER (WHERE ans.is_correct = true) AS correct,
  COUNT(*) FILTER (WHERE ans.is_correct = false) AS wrong,
  COUNT(*) FILTER (WHERE ans.is_correct IS NULL) AS ungraded,
  SUM(ans.points_awarded) AS sum_points_awarded,
  SUM(q.points) AS section_total_possible
FROM mock_exam_answers ans
JOIN mock_exam_questions q ON q.id = ans.question_id
WHERE ans.attempt_id = (SELECT id FROM ali_attempt)
GROUP BY q.section
ORDER BY q.section;
```

Compare `sum_points_awarded` per section against the attempt's `score_grammar`/`score_reading`/etc. If they don't match, the submit RPC's UPDATE landed but the SELECT...SUM aggregation broke.

### A.5 — Why is AI writing pending hours later?

```sql
-- Did the edge function ever try to grade Ali's writing?
SELECT *
FROM mock_exam_ai_writing_log
WHERE attempt_id = (
  SELECT a.id FROM mock_exam_attempts a
  JOIN auth.users u ON u.id = a.student_id
  WHERE u.email = 'admin@fluentia.academy'
  ORDER BY a.started_at DESC LIMIT 1
);
```

If empty: the function was never invoked. Look at the frontend `handleConfirmSubmit` — is the `supabase.functions.invoke('mock-exam-grade-writing', ...)` call actually firing? Check the browser DevTools network log on a fresh test attempt if needed.

If non-empty with errors: read the error. Maybe the function failed to parse Claude's response, or hit a timeout, or got a 401.

### A.6 — Other affected students

Once we know what's wrong with Ali's attempt, run a similar diagnostic on every submitted attempt:

```sql
SELECT
  p.full_name,
  e.code,
  a.is_submitted,
  a.score_total,
  a.ai_writing_status,
  COUNT(ans.id) AS answers_count,
  COUNT(ans.id) FILTER (WHERE ans.is_correct = true) AS correct,
  COUNT(ans.id) FILTER (WHERE ans.is_correct IS NULL) AS ungraded,
  SUM(ans.points_awarded) AS sum_points
FROM mock_exam_attempts a
JOIN profiles p ON p.id = a.student_id
JOIN mock_exams e ON e.id = a.exam_id
LEFT JOIN mock_exam_answers ans ON ans.attempt_id = a.id
WHERE a.is_submitted = true
GROUP BY p.full_name, e.code, a.is_submitted, a.score_total, a.ai_writing_status
ORDER BY a.score_total NULLS FIRST;
```

Identify every attempt where `score_total < 50` AND `answers_count > 20` — these are the suspicious ones.

---

## PHASE B — Categorize the root cause

After Phase A data is in hand, declare which of these is the truth:

**B.1 — Possible truths (pick the one the data supports):**

| Hypothesis | Evidence pattern | Verdict |
|---|---|---|
| Answers never persisted (UI bug) | Most `got_index` IS NULL despite Ali clicking through 34 Qs | UI state bug — fix client |
| Answers persisted but scoring query broke | `got_index` matches `correct_index` but `is_correct=false` or null | RPC bug — fix `mock_exam_submit` scoring logic |
| Scoring ran but `correct_index` is seeded wrong | Reading 5 questions by hand shows the `correct_index` is genuinely wrong | Seed data bug — re-author or fix the affected questions |
| Scoring ran correctly, exam is just hard | `got_index` matches `correct_index` only ~15% of the time, AND when correct the points add up | No bug — score is real |
| AI invocation was skipped entirely | `mock_exam_ai_writing_log` empty for Ali | Frontend kickoff is broken — fix the invoke call |
| AI invocation ran and failed | log has rows with `status='error'` or `status='fallback'` for Ali | Edge function bug — fix that |

If multiple are true, list all of them. The fix may be multi-pronged.

---

## PHASE C — Targeted fix (whichever the data points to)

### If C.1 — UI never persisted some answers

Look at `MockExamAttempt.jsx`. Audit:
- Does `onSelectOption(qid, idx)` actually fire `saveAnswer(qid, idx, ...)` synchronously every time?
- Is `idx` being passed correctly from the click handler? `console.log` in the click handler temporarily
- Race condition? When user clicks fast across 4 questions in a row, do all 4 saves go through? Verify with the audit log.

Fix: ensure every option click writes immediately (no debounce skip) and that the saved value is the actual click index.

### If C.2 — Scoring RPC is broken

Read `mock_exam_submit` definition fully. Look at the UPDATE...JOIN that sets `is_correct` and `points_awarded`. Common bug shapes:
- `JOIN mock_exam_questions q ON q.id = a.question_id` — should be in the FROM clause, not a JOIN, when used inside UPDATE
- `selected_index = q.correct_index` — both should be INT, but check if one of them is a JSONB number causing a type mismatch (`'2'::jsonb != 2::int`)
- The fill_blank case-insensitive comparison: are leading/trailing newlines handled?

Patch the RPC. After patching, **re-grade every affected attempt** by calling `mock_exam_admin_force_submit` (the recovery RPC from yesterday).

### If C.3 — Seeded `correct_index` is wrong

For each affected question, manually verify the correct answer and patch:

```sql
UPDATE mock_exam_questions
   SET correct_index = <new_value>
 WHERE id = '<question_id>';
```

Then re-run scoring across all submitted attempts:

```sql
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM mock_exam_attempts WHERE is_submitted = true LOOP
    PERFORM mock_exam_admin_force_submit(r.id, false);
  END LOOP;
END $$;
```

### If C.4 — AI invocation never fired

Look at the production frontend bundle. Use `view-source` or download the deployed JS and search for `mock-exam-grade-writing`. If it's missing or the call is gated behind a condition that's false in prod, fix.

Then manually re-invoke for every attempt with `ai_writing_status='pending'`:

```bash
# As a loop, calling the edge function once per stuck attempt
```

### If C.5 — Everything works, score is real

Then there's no code bug — but UX-wise, Ali (who knows the material) scored 15/100, which means students are likely to score even lower. **This warrants a content review of the seeded questions** — verify the difficulty calibration. But that's a separate decision from a bug fix; surface to Ali for his judgment.

---

## PHASE D — Re-grade everyone affected + re-trigger AI for everyone pending

Regardless of which fix above applies, **at the end of all fixes**:

1. Re-run `mock_exam_admin_force_submit` for every submitted attempt with answers but low score (to apply any scoring fix)
2. Re-invoke the grade-writing edge function for every attempt with `ai_writing_status IN ('pending', 'failed')`
3. Verify final state via the Phase A.4 SQL — every section's `sum_points_awarded` should equal the attempt's `score_<section>` field.

---

## PHASE E — Output

Print to terminal:

```
=== SCORING DIAGNOSIS COMPLETE ===

Root cause identified: <one of B.1>
Evidence: <2-3 sentence summary>

Fix applied: <C.x summary>
Files changed: <list>
Migrations: <list or "none">
RPCs modified: <list or "none">
Questions corrected: <count or "none">

Re-grading results:
  Ali's attempt: 15/100 → <new_score>/100
  Other re-graded attempts: <count> with average score change of <delta>

AI grading re-triggered for: <count> attempts

Per-attempt rollup:
  | name | exam | old_score | new_score | ai_status |
  | ...  | ...  | ...       | ...       | ...       |

Commit: <sha>

>>> ALI'S NEXT STEPS <<<
1. Open /admin/mock-exam-results and confirm scores look correct
2. If Ali's own attempt now shows a believable score (likely 70-95 if all his answers were right), the fix is verified
3. Decide when to reveal results
```

---

## PHASE F — Atomic commit

```bash
git add -A
git commit -m "fix(mock-exam): repair scoring + re-grade affected attempts

Root cause: <one-line summary from Phase B>

- Diagnostic forensics on Ali's own attempt (admin@fluentia.academy) revealed
  <evidence>
- <specific fix description>
- Re-graded <N> submitted attempts via mock_exam_admin_force_submit
- Re-invoked mock-exam-grade-writing for <M> attempts with stale AI status
- Visibility='live' preserved
- All existing RPCs and resilience patches (commits 6172384, 0dd1390) preserved

Verification:
- Ali's attempt: 15/100 → <X>/100
- All section sum(points_awarded) now matches score_<section> column"

git push origin main
```

Go.
