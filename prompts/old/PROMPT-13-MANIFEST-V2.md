# PROMPT 13 — Reading Passage Rewrites — MASTER MANIFEST V2

> **This is MANIFEST V2**, created in Session 19 to fix the table name bug
> discovered during L0 batch. V1 silently skipped 120 questions because it
> referenced `passage_questions` (non-existent) instead of `curriculum_comprehension_questions`.
> V2 ensures questions are updated for every rewritten passage.
> **Use V2 for L1, L2, L3, L4, L5 batches. DO NOT use V1 for any future batch.**

## Mission
Rewrite reading passages that fail length/FKGL/vocabulary targets. Process **one unit at a time**, commit after each, then move to the next file.

## Working Directory
`C:\Users\Dr. Ali\Desktop\fluentia-lms`

## Mandatory References
- `PHASE-2-CLEANUP/anti-mistake-playbook.md` -- Rules 3, 4, 12, 13, 14, 15, 16
- `CURRICULUM-QUALITY-AUDIT-REPORT.md` -- current passage data
- `PHASE-2-CLEANUP/13-FIX-schema.json` -- verified table/column names

## Correct Table Names (VERIFIED)

| Prompt V1 assumed | Actual table name |
|---|---|
| `reading_passages` | `curriculum_readings` |
| `passage_questions` | `curriculum_comprehension_questions` |
| `units` | `curriculum_units` |
| `levels` | `curriculum_levels` |
| `vocabulary` | `curriculum_vocabulary` |

## Correct Column Names

**curriculum_readings:**
- `id`, `unit_id`, `reading_label` (A/B), `title_en`, `passage_content` (JSONB: `{"paragraphs": [...]}`), `passage_word_count`, `reading_skill_name_en`, `reading_skill_exercises` (JSONB), `updated_at`

**curriculum_comprehension_questions:**
- `id`, `reading_id` (FK to curriculum_readings.id), `section`, `question_type` (main_idea/detail/vocabulary/inference), `question_en`, `question_ar`, `choices` (JSONB array), `correct_answer`, `explanation_en`, `explanation_ar`, `sort_order`, `created_at`

## Quality Targets (Adjust per level)

| Metric | L0 Target | L1 Target | L2 Target | L3 Target | L4 Target | L5 Target |
|---|---|---|---|---|---|---|
| Word count | 80-150 | 120-200 | 150-250 | 200-350 | 300-500 | 400-700 |
| FKGL | 0.5-2.5 | 2.0-4.0 | 3.5-5.5 | 5.0-7.0 | 7.0-9.0 | 9.0-12.0 |
| Avg sent len | 5-10 | 8-12 | 10-15 | 12-18 | 15-20 | 15-25 |

---

## Phase 0 -- One-Time Discovery

```sql
-- Schema discovery (Rule 12: NEVER assume column names)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'curriculum_readings' ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'curriculum_comprehension_questions' ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'curriculum_units' ORDER BY ordinal_position;

-- Locate target level ID
SELECT id, cefr, level_number FROM curriculum_levels;
-- Cache as $LEVEL_ID

-- Locate level units in order
SELECT id, title_en, unit_number FROM curriculum_units
WHERE level_id = $LEVEL_ID ORDER BY unit_number;

-- Cache vocabulary allowlist
SELECT LOWER(word) AS word, part_of_speech FROM curriculum_vocabulary
WHERE level_id = $LEVEL_ID;

-- Count questions per passage (baseline)
SELECT cr.id, cr.reading_label, cu.unit_number, COUNT(ccq.id) as q_count
FROM curriculum_readings cr
JOIN curriculum_units cu ON cu.id = cr.unit_id
LEFT JOIN curriculum_comprehension_questions ccq ON ccq.reading_id = cr.id
WHERE cu.level_id = $LEVEL_ID
GROUP BY cr.id, cr.reading_label, cu.unit_number
ORDER BY cu.unit_number, cr.reading_label;
```

---

## Per-Unit Workflow (Phases A-H)

### Phase A -- Load This Unit
```sql
SELECT id, title_en, unit_number FROM curriculum_units WHERE id = $unit_id;

SELECT id, reading_label, title_en, passage_content, passage_word_count
FROM curriculum_readings WHERE unit_id = $unit_id ORDER BY reading_label;
-- Expect 2 passages: Reading A, Reading B
```

### Phase A.5 — Student Work Protection (L1/L3 ONLY)

**Skip this phase for L0, L2, L4, L5 (zero students — no data to protect).**

**Philosophy (Ali's explicit policy):**
- 🔴 Writing + Speaking = CREATIVE WORK → never delete, never touch (they use `writing_id`/`speaking_id`, not `reading_id` — NOT affected by passage rewrites)
- 🟡 Comprehension = MECHANICAL WORK → if student completed it, auto-complete the new version on their behalf so they don't see their progress erased

**Step 1: Check for student completions on this unit's passages**

```sql
SELECT scp.id, scp.student_id, scp.reading_id, scp.section_type,
       scp.status, scp.score, scp.answers, scp.completed_at,
       scp.time_spent_seconds
FROM student_curriculum_progress scp
WHERE scp.reading_id IN ($passage_ids)
AND scp.section_type = 'comprehension'
AND scp.status = 'completed';
```

If count = 0 → no protection needed, proceed to Phase B.

If count > 0 → **protection required.** Cache these records as `$protected_records`. Log:
```
[PROTECTION] L<X>-U<N>: <count> student completion records found for <N> students
```

**Step 2: After Phase E rewrites questions (but BEFORE Phase F commits)**

For each `$protected_record`:
1. Read the NEW questions for this passage (from Phase E output)
2. Build a new `answers` JSONB object with the correct answer for each new question:
   ```json
   {
     "<new_question_id_1>": "<correct_answer_1>",
     "<new_question_id_2>": "<correct_answer_2>",
     ...
   }
   ```
   (Match the format of the student's original `answers` JSONB — check a sample record first)

3. Inside the same Phase F transaction, UPDATE the student's progress:
   ```sql
   UPDATE student_curriculum_progress
   SET answers = $new_correct_answers::jsonb,
       updated_at = NOW()
   WHERE id = $protected_record_id
   RETURNING id;
   -- Rowcount MUST be 1
   ```

**Step 3: Preserve everything else untouched**
- `score` → keep original (student earned it)
- `completed_at` → keep original (reflects when student actually did it)
- `time_spent_seconds` → keep original
- `status` → keep 'completed'
- `ai_feedback` → keep original (if any)

**Step 4: Verify after commit**
```sql
SELECT COUNT(*) FROM student_curriculum_progress
WHERE reading_id IN ($passage_ids)
AND section_type = 'comprehension'
AND status = 'completed';
-- Must equal original count from Step 1
```

If count changed → **ABORT remaining units and report to Ali.**

### Phase B -- Analyze Each Passage
Same FKGL/word count/OOV analysis as V1. Use `passage_content->'paragraphs'` to extract text.

### Phase C -- Decision Per Passage
Same criteria as V1 (per-level targets).

### Phase D -- Rewrite (If Needed)
Same as V1. Generate new passage, re-run Phase B analysis, max 3 attempts.

### Phase E -- Rewrite Comprehension Questions (CORRECTED)

```sql
SELECT id, question_en, question_type, correct_answer, choices, sort_order
FROM curriculum_comprehension_questions
WHERE reading_id = $passage_id
ORDER BY sort_order;
```

For each existing question, rewrite `question_en`, `correct_answer`, and `choices` to match the NEW passage content. Keep:
- Same `question_type`
- Same `sort_order`
- Same number of choices
- Same `section` value

**Vocabulary in questions must match level allowlist.**

### Phase F -- Apply Changes (Atomic per Passage)

```sql
BEGIN;

-- Update passage
UPDATE curriculum_readings
SET passage_content = $new_content::jsonb,
    passage_word_count = $wc,
    updated_at = NOW()
WHERE id = $passage_id
RETURNING id;
-- ASSERTION (Rule 16): If rowcount = 0, this means the target row doesn't exist.
-- This is the EXACT bug that caused V1 to silently skip 120 questions.
-- If ANY update returns 0 rows → ROLLBACK this passage and log:
--   "[ROWCOUNT FAIL] passage_id=X, table=curriculum_readings, expected=1, got=0"
-- Then SKIP this passage and continue to next. Do NOT silently succeed.

-- Update each question
UPDATE curriculum_comprehension_questions
SET question_en = $new_q,
    correct_answer = $new_a,
    choices = $new_choices::jsonb
WHERE id = $question_id
RETURNING id;
-- ASSERTION (Rule 16): If rowcount = 0, this means the target row doesn't exist.
-- This is the EXACT bug that caused V1 to silently skip 120 questions.
-- If ANY update returns 0 rows → ROLLBACK this passage and log:
--   "[ROWCOUNT FAIL] passage_id=X, table=curriculum_comprehension_questions, expected=1, got=0"
-- Then SKIP this passage and continue to next. Do NOT silently succeed.

-- Student Work Protection (L1/L3 only — from Phase A.5)
-- For each $protected_record cached in Phase A.5 Step 1:
UPDATE student_curriculum_progress
SET answers = $new_correct_answers::jsonb,
    updated_at = NOW()
WHERE id = $protected_record_id
RETURNING id;
-- ASSERTION (Rule 16): If rowcount = 0, this means the target row doesn't exist.
-- This is the EXACT bug that caused V1 to silently skip 120 questions.
-- If ANY update returns 0 rows → ROLLBACK this passage and log:
--   "[ROWCOUNT FAIL] passage_id=X, table=student_curriculum_progress, expected=1, got=0"
-- Then SKIP this passage and continue to next. Do NOT silently succeed.

COMMIT;
```

### Phase G -- Per-Unit Verification (ENHANCED)

```sql
-- Re-query passages
SELECT id, passage_word_count FROM curriculum_readings WHERE unit_id = $unit_id;

-- Re-query questions and verify count matches baseline
SELECT COUNT(*) FROM curriculum_comprehension_questions
WHERE reading_id IN (SELECT id FROM curriculum_readings WHERE unit_id = $unit_id);
-- Must match baseline from Phase 0

-- Spot-check: first question for each passage
SELECT ccq.question_en, ccq.correct_answer, cr.reading_label
FROM curriculum_comprehension_questions ccq
JOIN curriculum_readings cr ON cr.id = ccq.reading_id
WHERE cr.unit_id = $unit_id AND ccq.sort_order = 0;

-- Student protection verification (L1/L3 only)
-- If protection was triggered in Phase A.5:
SELECT COUNT(*) FROM student_curriculum_progress
WHERE reading_id IN (SELECT id FROM curriculum_readings WHERE unit_id = $unit_id)
AND section_type = 'comprehension'
AND status = 'completed'
AND updated_at >= CURRENT_DATE;
-- Must match the number of protected records from Phase A.5
-- If mismatch → log WARNING but do not abort (student may have new activity)
```

If question count changed or any verification fails -> ROLLBACK and log.

### Phase H -- Commit
Same as V1. One commit per unit. Push + verify.

Log format:
```
[LX-U<N>] <theme>
  Reading A (id <id>): <action> | wc=<N> fkgl=<F> oov=<N>
  Reading B (id <id>): <action> | wc=<N> fkgl=<F> oov=<N>
  Questions updated: <N>
```

---

## DO NOT
- Do NOT use V1 manifest for any future level
- Do NOT touch units outside the target level
- Do NOT touch the vocabulary table
- Do NOT call external AI APIs
- Do NOT skip Phase E question rewrites
- Do NOT skip Phase G question count verification
- Do NOT batch multiple units in one commit
- Do NOT add or delete passages or questions -- only rewrite existing content
- Do NOT modify `reading_skill_exercises` JSONB -- it is separate from comprehension questions

---

## Rule 16 — Rowcount Assertions (NEW — Session 19)
Any SQL UPDATE or DELETE must verify rowcount > 0 after execution.
If rowcount = 0 and rows were expected, this indicates a schema mismatch or filter bug.
NEVER treat 0 affected rows as "nothing to do" — treat it as an error.
This rule was created because PROMPT 13 V1 silently skipped 120 questions
when the table name was wrong and all UPDATEs returned 0 rows.
