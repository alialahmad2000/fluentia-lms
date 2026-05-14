# 04-FIX-PROGRESS-TRACKING — Unit completion + Speaking + Listening grading

> **Move + execute:**
> ```powershell
> Move-Item -Force "$env:USERPROFILE\Downloads\04-FIX-PROGRESS-TRACKING.md" "C:\Users\Dr. Ali\Desktop\fluentia-lms\prompts\agents\04-FIX-PROGRESS-TRACKING.md"
> ```
> ```
> Read and execute prompts/agents/04-FIX-PROGRESS-TRACKING.md
> ```

> **Independent prompt** — can run in parallel with Prompts 01–03.

---

## 🎯 MISSION

Three coupled student-facing bugs, root-cause fixed:

1. **Unit completion stuck at 95%** — student finishes every visible activity but the unit never reaches 100%. Hidden / phantom activities are counted in the denominator. Or some completion events don't write to the progress table.
2. **Speaking submissions not marking section complete** — Hawazin submitted speaking voice notes, the submission exists, but the "speaking complete" checkmark is missing on the unit.
3. **Listening MCQ submitted but no feedback shown** — student submits answers, the page hangs without revealing scores/corrections.

**Approach:** Discover → diagnose with real student data → fix the underlying calculation + write-paths → add an admin diagnostic view so future drift is detectable → write unit tests for the progress calculator.

---

## 📁 ENVIRONMENT

- **Working dir:** `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`)
- **Test subject:** Hawazin (B1 group) — known submission with broken completion. Use her actual `profile.id` from the DB for diagnostics.

---

## ⚠️ STRICT RULES

1. **Student work protection is paramount.** Do not delete, overwrite, or modify any existing submission row. Only INSERT new completion records or UPDATE `is_complete` flags on rows that should already be complete.
2. **Every UPDATE has a SELECT-confirm wrapper** — RLS silent failures must surface.
3. **Use `profile.id` not `user.id`** for student DB reads.
4. **No `vite build`.**
5. **Two-phase pattern:** Phase A (read-only diagnosis) → STOP and write findings → Phase B (build fix) → Phase C (backfill affected students). Do NOT skip the diagnosis.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Read-only diagnosis (mandatory)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Map the progress data model

```sql
-- Every table that touches "progress" or "completion"
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%progress%' OR table_name LIKE '%completion%' OR table_name LIKE '%student_%');

-- Columns for each
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('unit_progress','student_unit_progress','student_activity_completions',
                     'student_speaking_progress','student_listening_progress','student_reading_progress',
                     'student_writing_progress','student_grammar_progress','student_vocabulary_progress',
                     'submissions','listening_submissions','speaking_submissions','reading_submissions')
ORDER BY table_name, ordinal_position;
```

Print the schema as a clean Markdown table to `docs/dev-notes/progress-schema.md`.

### A.2 — Find the unit-progress calculator

```bash
grep -rln "unit_progress\|getUnitProgress\|calculateUnitProgress\|useUnitProgress" src/ supabase/ --include="*.ts" --include="*.tsx" --include="*.jsx" --include="*.js" --include="*.sql"
```

Read every match. Document:
- Where is the source of truth for "what activities count toward 100%"? Is it a DB function? A frontend hook? Both?
- Is the denominator hardcoded (e.g. always 5 activities) or dynamic (counts only activities the unit actually has)?
- Is each activity type checked correctly (reading completed → flag set, speaking submission exists → flag set, etc.)?

Write findings to `docs/dev-notes/progress-calculator-trace.md`.

### A.3 — Diagnose Hawazin's case (real data)

Find her profile.id:

```sql
SELECT id FROM profiles WHERE full_name_ar ILIKE '%هنوف%' OR full_name_ar ILIKE '%هواز%' LIMIT 5;
```

(If the search returns multiple, pick the one in B1 group based on group membership.)

For each B1 unit where she shows < 100%:

```sql
-- Her unit progress row(s)
SELECT * FROM unit_progress WHERE student_id = '<hawazin-id>' AND unit_id = '<unit-id>';

-- Her submissions for that unit
SELECT type, status, submitted_at, grade_numeric FROM submissions
WHERE student_id = '<hawazin-id>' AND assignment_id IN (
  SELECT id FROM assignments WHERE unit_id = '<unit-id>'
);

-- Speaking submissions (might be in separate table)
SELECT * FROM speaking_submissions WHERE student_id = '<hawazin-id>' AND unit_id = '<unit-id>';

-- Listening submissions
SELECT * FROM listening_submissions WHERE student_id = '<hawazin-id>' AND unit_id = '<unit-id>';

-- Per-activity completion flags
SELECT * FROM student_activity_completions WHERE student_id = '<hawazin-id>' AND unit_id = '<unit-id>';
```

For each unit stuck under 100%, write the exact gap:

```markdown
## Unit B1-7 (Hawazin)
- Reported: 95%
- Source: getUnitProgress hook, denominator=20, numerator=19
- Missing activity: speaking_topic_4 (no row in student_speaking_progress despite submission existing in submissions table with status='graded')
- Root cause: submissions table is the canonical record; student_speaking_progress was never written because the post-submit handler returns early on Z condition.
```

Save to `docs/dev-notes/hawazin-diagnosis.md`.

### A.4 — Diagnose listening "no feedback" bug

Find the listening MCQ submission flow:

```bash
grep -rln "listening.*answer\|listening.*submit\|listening.*grade\|listening_questions" src/ supabase/functions/ --include="*.tsx" --include="*.jsx" --include="*.ts"
```

Read the flow. Look for:
- Does the submit handler set `loading=true` and never unset it on error?
- Is there an `await` inside a `useEffect` without a try/catch?
- Does the grading edge function exist and respond, or is it returning silently?
- Does the RLS policy on `listening_submissions` (or equivalent) block the SELECT after INSERT?

Write findings to `docs/dev-notes/listening-grading-trace.md`.

### A.5 — Phase A summary

Write `docs/dev-notes/progress-tracking-DIAGNOSIS.md`:

```markdown
# Progress Tracking — Diagnosis (Phase A)

## Root causes (one per bug)

### Bug 1: Unit completion stuck at 95%
ROOT CAUSE: <one sentence>
EVIDENCE: <line references, queries, sample data>
FIX STRATEGY: <one sentence>

### Bug 2: Speaking submission not marking complete
ROOT CAUSE: <one sentence>
EVIDENCE: ...
FIX STRATEGY: ...

### Bug 3: Listening submitted, no feedback
ROOT CAUSE: <one sentence>
EVIDENCE: ...
FIX STRATEGY: ...

## Affected students (estimate)
Run query for each bug to count rows that need backfill.
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Fixes
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Single source of truth for unit progress

Create (or refactor existing) DB function `compute_unit_progress(p_student_id uuid, p_unit_id uuid)` that:

1. **Reads the unit's actual activity inventory dynamically:**
   - Does the unit have reading passages? (count `curriculum_reading_passages WHERE unit_id=p_unit_id`)
   - Does it have a grammar lesson? (1 or 0 from `curriculum_grammar_lessons`)
   - Does it have listening items? (count)
   - Does it have speaking topics? (count)
   - Does it have a writing prompt? (1 or 0)
   - Does it have vocabulary mastery target? (1 if `curriculum_vocabulary` has rows for the unit, else 0)
   - Does it have an end-of-unit assessment? (1 or 0)

2. **For each activity type, checks completion against canonical source:**
   - Reading: `student_reading_progress.completed = true` for every passage in the unit
   - Grammar: `student_grammar_progress.completed = true`
   - Listening: every listening item has a graded `listening_submissions` row (or `submissions` of type 'listening' with status='graded')
   - Speaking: every speaking topic has a `submissions` row of type 'speaking' with status IN ('submitted','graded') OR a `speaking_submissions` row
   - Writing: a graded writing submission exists
   - Vocabulary: `vocabulary_word_mastery.mastery_score >= threshold` for X% of unit vocab
   - Assessment: passing score recorded

3. **Returns** `{ numerator, denominator, percentage, breakdown jsonb }`.

The breakdown JSONB enables the admin diagnostic view (Phase B.5).

**Why a DB function:** front-end & multiple back-end paths all read from one place. No drift.

Migration: `supabase/migrations/YYYYMMDDHHMMSS_compute_unit_progress_function.sql`.

### B.2 — Fix Speaking submission → completion

The submit handler for speaking voice notes must:
1. INSERT into `submissions` (or `speaking_submissions`) with status='submitted'.
2. **Immediately** call `compute_unit_progress()` and UPSERT the result into `unit_progress` (with `.select()` after upsert to catch RLS).
3. Realtime channel emit so the unit page re-reads progress.

Edit the speaking submission handler at the location found in A.2. Wrap in try/catch, log failures, never swallow errors silently.

Add a unit test: `tests/speaking-submission-completion.test.js` that simulates the flow with a test student and asserts the unit_progress row updates.

### B.3 — Fix Listening grading + feedback display

The listening submission flow must:
1. INSERT submission with answers.
2. Call grading edge function (or compute inline if simple MCQ — compare against `correct_answer` per question).
3. UPDATE submission with grade + per-question correctness JSONB.
4. **Return the graded result to the client in the same request** so the UI can show the results page immediately.
5. The UI shows: total score, per-question correct/wrong breakdown, the right answer for any wrong question.

If the current flow waits for an async grading job that never fires → switch to synchronous grading inside the submit handler. MCQ grading is fast (no Claude needed).

Add try/catch around the network call. On error, surface a toast and unset the loading state — never let the page hang.

### B.4 — Audit all activity → progress write-paths

Grep for every place that creates a submission or marks an activity complete:

```bash
grep -rn "from('submissions').insert\|markComplete\|setComplete\|completed.*true" src/ --include="*.tsx" --include="*.jsx"
```

For every one, verify it ALSO calls `compute_unit_progress` (or the recomputer triggers via DB trigger). If a write-path is missing the recompute → add it.

**Alternative (recommended):** add a DB trigger on `submissions`, `student_reading_progress`, `student_grammar_progress`, etc. that calls `compute_unit_progress` and upserts into `unit_progress` whenever any source row changes. This makes drift impossible.

```sql
CREATE OR REPLACE FUNCTION trigger_recompute_unit_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_unit_id uuid;
  v_student_id uuid;
BEGIN
  v_unit_id := COALESCE(NEW.unit_id, OLD.unit_id);
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  IF v_unit_id IS NOT NULL AND v_student_id IS NOT NULL THEN
    INSERT INTO unit_progress (student_id, unit_id, ...)
    SELECT v_student_id, v_unit_id, ...
    FROM compute_unit_progress(v_student_id, v_unit_id)
    ON CONFLICT (student_id, unit_id) DO UPDATE SET ...;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to each table that contributes to progress
CREATE TRIGGER recompute_unit_progress_on_submission
  AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION trigger_recompute_unit_progress();
-- ...repeat for every source table
```

### B.5 — Admin diagnostic view

**`src/pages/admin/StudentProgressDiagnostic.jsx`**

Admin selects a student + a unit → page renders:

```
[Hawazin] · Unit B1-7
Overall: 19/20 = 95%

Activities breakdown:
✓ Reading passage A         — completed 2026-05-01
✓ Reading passage B         — completed 2026-05-02
✓ Grammar: Past Simple      — completed 2026-05-03
✓ Listening: Conversation 1 — graded 2026-05-04 (8/10)
✓ Listening: Lecture 1      — graded 2026-05-04 (7/10)
✓ Speaking topic 1          — submitted 2026-05-05
✓ Speaking topic 2          — submitted 2026-05-05
✓ Speaking topic 3          — submitted 2026-05-06
❌ Speaking topic 4          — submission exists (id=xyz) but student_speaking_progress missing
✓ Writing prompt            — graded 2026-05-07
✓ Vocabulary mastery 12/15  — threshold 80%
✓ Unit assessment           — passed 2026-05-08

[Recompute now] button (admin-only) → calls compute_unit_progress() and updates the row
```

This view is the canonical debugger for any future "why is X stuck at N%?" complaint.

### B.6 — Backfill all affected students (Phase C below)

(Implemented as a one-time script in Phase C.)

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Backfill
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After triggers are live, run a one-time recompute for every student × unit combination:

```bash
node scripts/backfill-unit-progress.cjs
```

Script:
1. SELECT every (student_id, unit_id) where the student has at least one submission or reading_progress row for that unit.
2. For each: call `compute_unit_progress()` and UPSERT.
3. Print summary: N rows updated, N students affected, time taken.
4. Save report to `docs/audits/backfill-unit-progress-{timestamp}.md`.

**Idempotent.** Safe to re-run.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Verification (mandatory)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Hawazin's units

Re-run the diagnostic on Hawazin. Every unit she has completed every visible activity for → must now show 100%.

### D.2 — Listening grading round-trip

Pick a listening item that has not been submitted by an existing student. As admin, simulate submission via SQL inserting answers → trigger fires → unit_progress recomputes. Verify the row updates.

### D.3 — Test student creates fresh submission

If a test/staging student account exists, log in as that student via impersonation and submit a listening MCQ. Confirm:
- Page does not hang.
- Score appears immediately.
- Per-question correctness shown.

### D.4 — Row counts

```sql
-- Students at 100% on at least one unit
SELECT COUNT(DISTINCT student_id) FROM unit_progress WHERE percentage = 100;

-- Students with submissions but no progress row
SELECT COUNT(*) FROM submissions s
LEFT JOIN unit_progress up
  ON up.student_id = s.student_id
  AND up.unit_id = (SELECT unit_id FROM assignments WHERE id = s.assignment_id)
WHERE up.id IS NULL;
-- Expected after backfill: 0
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
git add supabase/migrations/*_compute_unit_progress* \
        supabase/migrations/*_progress_triggers* \
        src/pages/admin/StudentProgressDiagnostic.jsx \
        src/components/admin/   # any new admin UI files
        src/hooks/useUnitProgress.js \
        scripts/backfill-unit-progress.cjs \
        tests/speaking-submission-completion.test.js \
        docs/dev-notes/

git commit -m "fix(progress): single-source-of-truth unit progress with DB triggers + admin diagnostic

Root causes (per docs/dev-notes/progress-tracking-DIAGNOSIS.md):
- Unit stuck at 95%: hardcoded denominator + missing speaking completion row
- Speaking submission silent fail: handler never wrote student_speaking_progress
- Listening grading hang: async job never fired; loading state never unset

Fixes:
- compute_unit_progress(student, unit) PL/pgSQL function: dynamic denominator from actual unit contents
- DB triggers on submissions, *_progress tables: auto-recompute on every change
- Speaking handler now writes progress synchronously with .select() RLS guard
- Listening grading: synchronous MCQ grading inline in submit handler; result returned in response; UI unblocks immediately
- Admin StudentProgressDiagnostic page: per-activity breakdown + manual recompute
- Backfill script: idempotent recompute for all (student, unit) pairs

Verification:
- Hawazin's units recomputed to 100%
- Submissions-without-progress count: 0
- Test student listening submission: feedback shown immediately

Refs: student complaints from 2026-05-13 chat"

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

---

## ⛔ DO NOT

- ❌ Delete or overwrite any existing submission
- ❌ Hardcode the unit denominator
- ❌ Compute progress in multiple places (frontend + backend + DB) — one source of truth only
- ❌ Skip the diagnosis phase (Phase A)
- ❌ Backfill before triggers are live (could create stale rows)
- ❌ Use `user.id` for student reads
- ❌ Run vite build

## ✅ FINISH LINE

Every visible activity counted. Speaking submission marks complete. Listening shows feedback immediately. Admin can diagnose any student-unit combo. Backfill applied. Commit pushed.

End of prompt.
