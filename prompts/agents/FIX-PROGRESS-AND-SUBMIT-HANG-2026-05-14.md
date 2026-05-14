# 🎯 FIX-PROGRESS-AND-SUBMIT-HANG — Curriculum Submission Resilience + Live Progress Bars

> **Move + execute (PowerShell):**
> ```powershell
> Move-Item -Force "$env:USERPROFILE\Downloads\FIX-PROGRESS-AND-SUBMIT-HANG-2026-05-14.md" `
>           "C:\Users\Dr. Ali\Desktop\fluentia-lms\prompts\agents\FIX-PROGRESS-AND-SUBMIT-HANG-2026-05-14.md"
> ```
> Then inside Claude Code (`--dangerously-skip-permissions`):
> ```
> Read and execute prompts/agents/FIX-PROGRESS-AND-SUBMIT-HANG-2026-05-14.md
> ```

---

## 🔥 MISSION

Students are reporting **two coupled bugs** RIGHT NOW (May 14, 2026):

> **Bug 1 — Submit hangs:** «أحلّ أقسام الوحدة (قراءة، قواعد، مفردات، استماع …) وأضغط زر "تسليم" — يعلّق ولا يسلّم بشكل طبيعي.»
>
> **Bug 2 — Progress bar lies:** «الشريط اللي خارج الوحدة (في صفحة المستوى) ما يعكس تقدّمي الحقيقي حتى لو سلّمت أقسام داخل الوحدة.»

These are not two separate bugs — they have **one shared root cause**. When the submit handler hangs:
1. The submission row may or may not have reached the DB
2. The `unit_progress` row never gets recomputed
3. The progress bar stays stale (or shows 0) on the level browser AND inside the unit tabs header
4. The student is now stuck — can't retry (handler still "loading"), and the UI lies about her state

**This prompt fixes the root cause, not the symptom.** Approach:

1. **Discover** what's actually in production right now (did `04-FIX-PROGRESS-TRACKING` from May 13 ship? Did `UNIVERSAL-RETRY` from May 9 ship? Which submit handlers are still raw?)
2. **Build a bulletproof submit primitive** (`useResilientActivitySubmit` hook) — one source of truth for every activity type's submission flow with 15s abort timeout, guaranteed `finally` cleanup, `.select()` RLS-guard wrapper, online/offline detection, and explicit cache invalidation
3. **Migrate every activity submit handler** to use the hook (Reading A, Reading B, Grammar, Vocabulary Quiz, Listening MCQ, Writing, Speaking, Pronunciation, Unit Assessment)
4. **Lock in progress correctness at the DB layer** — `compute_unit_progress()` PL/pgSQL function + triggers on every source table so progress recompute is **impossible to forget** from any code path
5. **Realtime broadcast** — the level browser progress bar and the unit header bar subscribe to `unit_progress` changes so they update **without reload**
6. **Backfill** — every student × unit pair recomputed once after triggers are live
7. **Admin diagnostic view** — per-activity breakdown so future "why is X stuck at N%?" complaints are debuggable in 30 seconds

---

## 📁 ENVIRONMENT

| | |
|---|---|
| Working dir | `C:\Users\Dr. Ali\Desktop\fluentia-lms` |
| Skill (auto-load) | `/mnt/skills/user/fluentia-lms/SKILL.md` |
| Repo | `alialahmad2000/fluentia-lms` (branch `main`) |
| Supabase ref | `nmjexpuycmqcxuxljier` (Frankfurt, Pro) |
| Direction | RTL Arabic-first, dark theme |
| Model | Opus, `--dangerously-skip-permissions` |
| Deploy | Auto on push to `main` via Vercel — **no `vite build` locally** |
| Test subject | Hawazin (B1 group) — `profile.id` to be looked up; has both bugs reproducible |

---

## ⚠️ STRICT RULES — NON-NEGOTIABLE

1. **No student work deletion or overwrite.** Existing submission rows are immutable. We only INSERT new completion records or UPDATE `is_complete` flags that should already be true.
2. **`.select()` after EVERY `.upsert()` and `.update()`** — Supabase + RLS = silent failure if rows blocked. The `.select()` makes that fatal instead of silent.
3. **`profile.id` not `user.id`** for any student DB read (admin impersonation safety).
4. **Schema discovery is mandatory.** Before any new query, run `information_schema.columns` for every table touched + a Node script that runs the exact filter against prod printing row count. Column names drift in this DB.
5. **Migrations include rowcount assertions.** Zero rows returned by an UPDATE is never OK unless expected.
6. **Single source of truth for progress** — compute it in the DB function only. Frontend and edge functions just READ from `unit_progress` table. No parallel recompute.
7. **No `npm run build` / `vite build`** — Vercel handles builds, local machine OOMs.
8. **Two-phase pattern:** Phase A is read-only discovery. **Stop and write `docs/dev-notes/progress-submit-DIAGNOSIS-2026-05-14.md` before any write.** Then Phase B builds the fix.
9. **No `.catch()` on Supabase query builders** — they return `{data, error}`. Always destructure.
10. **Idempotent migrations** — `CREATE OR REPLACE FUNCTION`, `IF NOT EXISTS` on triggers/indexes, `ON CONFLICT … DO UPDATE` on backfill.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — DISCOVERY (READ-ONLY · MANDATORY · STOP AT END)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — What's already deployed?

Check whether previous fixes landed in production. We do NOT want to duplicate or conflict.

```bash
# Did 04-FIX-PROGRESS-TRACKING from May 13 land?
git log --all --oneline --grep="compute_unit_progress\|single-source-of-truth unit progress\|progress.*triggers" | head -20

# Did UNIVERSAL-RETRY from May 9 land?
git log --all --oneline --grep="universal.*retry\|phantom.*submission\|auto-submit\|useActivitySubmit\|useActivityAutoSave" | head -20

# Did the April 16 perf + auto-submit fix land?
git log --all --oneline --grep="useActivityAutoSave\|useActivitySubmit\|085c2e7\|supabase.*timeout" | head -20

# Are the hooks already present?
find src/hooks -name "useActivity*" -o -name "useResilient*" -o -name "useUnitProgress*" 2>/dev/null

# Is the DB function present?
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const { data, error } = await s.rpc('compute_unit_progress', { p_student_id: '00000000-0000-0000-0000-000000000000', p_unit_id: '00000000-0000-0000-0000-000000000000' });
  console.log(error ? 'FUNCTION MISSING or signature differs: ' + error.message : 'FUNCTION EXISTS — sample:', data);
})();
"

# Are progress triggers attached?
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const { data, error } = await s.rpc('execute_sql', { query: \"SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%unit_progress%' OR trigger_name LIKE '%recompute%' ORDER BY 1;\" });
  console.log(error || data);
})();
"
```

If `execute_sql` RPC doesn't exist, fall back to a Node script that hits Postgres directly via `pg` package, or query `information_schema.triggers` through the Supabase REST API.

### A.2 — Full inventory of submit handlers (where the hang happens)

Every place that handles a student "submit" click in curriculum activities — find them all:

```bash
# Find every component that submits curriculum work
grep -rln "section_type\|section_key\|activity_id\|submitAnswers\|handleSubmit\|onSubmit" src/pages/student/curriculum src/components/curriculum src/components/student --include="*.jsx" --include="*.tsx" 2>/dev/null

# Find every place that does an insert/upsert into a *_progress or submissions table
grep -rln "from('student_.*progress\|from('submissions\|from('speaking_submissions\|from('listening_submissions\|from('writing_submissions\|from('reading_submissions\|from('vocabulary_quiz_attempts\|from('grammar_attempts\|from('pronunciation_attempts" src/ --include="*.jsx" --include="*.tsx" 2>/dev/null

# Find places that set loading state — and confirm each has a finally that unsets it
grep -rn "setLoading(true)\|setSubmitting(true)\|setIsSubmitting(true)\|isLoading.*=.*true" src/pages/student src/components/curriculum --include="*.jsx" --include="*.tsx" 2>/dev/null | head -40
```

For each submit handler found, check it for these **failure-mode smells**:

| Smell | Symptom |
|---|---|
| `setLoading(true)` without `finally { setLoading(false) }` | Page hangs forever on error |
| `await supabase…` without try/catch | Unhandled promise rejection eats the toast |
| `.catch(...)` on Supabase query builder | This is a bug — builders don't reject, they return `{error}` — the catch never fires |
| `.upsert()` without `.select()` | RLS silent failure: the row never inserts but no error surfaces |
| `await fetch(...)` to edge function without `AbortController` | Hangs on cold-start when function takes 30+ seconds |
| Submission completes but no `queryClient.invalidateQueries(['unit-progress', …])` | UI doesn't refresh after success |
| Submission writes to `submissions` but doesn't trigger `unit_progress` recompute | Progress bar stays stale |

List every handler + its smell(s) in `docs/dev-notes/submit-handlers-audit-2026-05-14.md`.

### A.3 — Reproduce both bugs with Hawazin's real data

```bash
# Find Hawazin
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const { data: p } = await s.from('profiles').select('id, full_name_ar').or('full_name_ar.ilike.%هواز%,full_name_ar.ilike.%هنوف%').limit(5);
  console.log('Candidates:', p);
  // Pick the B1 one based on group_members
})();
"
```

For her `profile.id`, dump everything for one B1 unit where she shows < 100%:

```sql
-- Her latest unit_progress rows (if any exist)
SELECT unit_id, percentage, numerator, denominator, breakdown, updated_at
FROM unit_progress
WHERE student_id = '<hawazin-id>'
ORDER BY updated_at DESC LIMIT 10;

-- For one stuck unit, dump every potential source-of-completion row:
WITH unit AS (SELECT id FROM curriculum_units WHERE id = '<unit-id>')
SELECT 'submissions' AS source, type, status, submitted_at, grade_numeric
  FROM submissions WHERE student_id = '<hawazin-id>' AND unit_id = '<unit-id>'
UNION ALL
SELECT 'reading', section_key, CASE WHEN is_complete THEN 'complete' ELSE 'incomplete' END, completed_at, NULL
  FROM student_reading_progress WHERE student_id = '<hawazin-id>' AND unit_id = '<unit-id>'
UNION ALL
SELECT 'grammar', NULL, CASE WHEN is_complete THEN 'complete' ELSE 'incomplete' END, completed_at, score
  FROM student_grammar_progress WHERE student_id = '<hawazin-id>' AND unit_id = '<unit-id>'
-- repeat for: student_listening_progress, student_speaking_progress, student_writing_progress,
-- student_pronunciation_progress, vocabulary_word_mastery (aggregated)
ORDER BY 1;
```

Adjust table names based on what `information_schema.columns` actually returns — schema drift is real here. Document any naming discrepancies in the diagnosis file.

### A.4 — Reproduce the submit hang on a test account

If there's a staging/test student account, log in (via admin impersonation) and:
1. Open any unit, navigate to a section that already has saved answers
2. Open DevTools Network tab
3. Click "تسليم"
4. Record:
   - Which network request fires?
   - Does it complete (status 200/201) or hang (still pending after 15s)?
   - Does the UI loading state ever clear?
   - Is there a console error?

Write the trace to `docs/dev-notes/submit-hang-trace-2026-05-14.md`. **Categorize the hang:**
- **Type 1 — Network never returns** (edge function cold start / timeout): solved by `AbortController` + retry
- **Type 2 — Network returns 200 but UI stuck** (forgot `setLoading(false)`): solved by `finally` block
- **Type 3 — Network returns 200, UI clears, but progress bar stale** (no cache invalidation): solved by trigger + Realtime
- **Type 4 — `.upsert()` silent RLS block** (no `.select()` wrapper): solved by `.select()` + error throw

### A.5 — Phase A summary file

Write `docs/dev-notes/progress-submit-DIAGNOSIS-2026-05-14.md`:

```markdown
# Diagnosis — May 14, 2026

## What's already deployed?
- compute_unit_progress function: YES/NO
- Progress triggers: list which tables / NONE
- useActivityAutoSave / useActivitySubmit hooks: YES/NO  + which activities use them
- Universal retry: YES/NO + which activities

## Submit handlers found (N total)
| Handler file | Activity type | Smells | Uses useActivitySubmit? |
|---|---|---|---|

## Hawazin's stuck unit (real numbers)
Unit: ...
Reported %: ...
DB activity inventory: N reading, N grammar, ...
Completion rows present: ...
Missing rows: ...
Root cause: ...

## Submit hang reproduction
Type: 1/2/3/4
Evidence: ...
Fix strategy: ...

## Estimated blast radius
- Students with at least one < 100% unit despite all activities completed: N
- Submissions that didn't trigger progress recompute: N
- Activities still on raw submit handlers (not hook): N
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — BUILD THE FIX
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — `useResilientActivitySubmit` hook (the new primitive)

Create `src/hooks/useResilientActivitySubmit.js`. **This is the only submit primitive we use from now on.**

```javascript
// src/hooks/useResilientActivitySubmit.js
import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

/**
 * Bulletproof submit primitive for every curriculum activity.
 *
 * Guarantees:
 *  1. `submitting` ALWAYS returns to false (finally block)
 *  2. Hard 15s abort — no infinite hangs
 *  3. `.select()` after upsert — RLS silent failures throw instead of swallow
 *  4. Network errors → toast + retry button (NOT silent)
 *  5. After success: invalidates ['unit-progress', unitId] + ['student-curriculum-progress', studentId]
 *  6. Realtime trigger fires DB-side → progress bar updates everywhere live
 *
 * Usage:
 *   const { submit, submitting, lastError } = useResilientActivitySubmit({
 *     activityType: 'grammar',
 *     unitId,
 *     studentId, // profile.id, not user.id
 *   });
 *   await submit({ answers, score, ... });
 */
export function useResilientActivitySubmit({ activityType, unitId, studentId, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState(null);
  const abortRef = useRef(null);
  const queryClient = useQueryClient();

  const submit = useCallback(async (payload) => {
    if (submitting) return; // double-click guard
    if (!studentId || !unitId) {
      const msg = 'Missing studentId or unitId — cannot submit';
      setLastError(msg);
      toast({ title: 'خطأ', description: 'بيانات الجلسة ناقصة، حدّث الصفحة وحاول مرة أخرى', variant: 'destructive' });
      return { ok: false, error: msg };
    }

    setSubmitting(true);
    setLastError(null);

    // Hard timeout — abort if anything takes > 15s
    abortRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortRef.current.abort(), 15000);

    try {
      // 1. Insert/upsert the submission row — table chosen by activityType
      const tableMap = {
        reading_a:     'student_reading_progress',
        reading_b:     'student_reading_progress',
        grammar:       'student_grammar_progress',
        listening:     'student_listening_progress',
        vocabulary:    'vocabulary_quiz_attempts',
        writing:       'submissions',       // type='writing'
        speaking:      'submissions',       // type='speaking'
        pronunciation: 'student_pronunciation_progress',
        assessment:    'submissions',       // type='assessment'
      };
      const table = tableMap[activityType];
      if (!table) throw new Error(`Unknown activityType: ${activityType}`);

      const row = {
        student_id: studentId,
        unit_id: unitId,
        ...payload,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      };

      // .select() at the end is CRITICAL — without it, RLS denies are silent
      const { data, error } = await supabase
        .from(table)
        .upsert(row, {
          onConflict: payload.conflictKey || 'student_id,unit_id,activity_id',
          ignoreDuplicates: false,
        })
        .select()
        .abortSignal(abortRef.current.signal);

      if (error) {
        // Distinguish RLS / constraint / network
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw new Error(`RLS denied write to ${table} — student likely missing group membership or wrong studentId`);
        }
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error(`Upsert returned 0 rows — RLS silently blocked. Check policies on ${table}.`);
      }

      // 2. Invalidate progress caches — triggers will have updated DB, this re-fetches it
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['unit-progress', unitId, studentId] }),
        queryClient.invalidateQueries({ queryKey: ['student-curriculum-progress', studentId] }),
        queryClient.invalidateQueries({ queryKey: ['level-progress', studentId] }),
      ]);

      toast({ title: 'تم التسليم ✓', description: 'تم حفظ إجاباتك بنجاح' });

      if (onSuccess) onSuccess(data[0]);
      return { ok: true, data: data[0] };
    } catch (err) {
      console.error(`[submit:${activityType}]`, err);
      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      const userMsg = isAbort
        ? 'انتهت مهلة التسليم — تحقّقي من الاتصال وحاولي مرة أخرى'
        : 'فشل التسليم — اضغطي إعادة المحاولة';
      setLastError(err.message || String(err));
      toast({ title: 'خطأ في التسليم', description: userMsg, variant: 'destructive' });
      return { ok: false, error: err.message || String(err) };
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false); // ← THIS is the line that fixes the hang
    }
  }, [submitting, activityType, unitId, studentId, onSuccess, queryClient]);

  return { submit, submitting, lastError };
}
```

### B.2 — Migrate every submit handler

For every handler found in A.2, replace its raw submit code with this hook. Concrete examples (file paths to be confirmed in Phase A):

**Grammar tab:**
```jsx
const { submit, submitting } = useResilientActivitySubmit({
  activityType: 'grammar',
  unitId,
  studentId: profile.id, // NOT user.id
});

<Button disabled={submitting || !allAnswered} onClick={() => submit({ answers, score, is_complete: true })}>
  {submitting ? 'جاري التسليم…' : 'تسليم'}
</Button>
```

**Listening tab:**
```jsx
const { submit, submitting } = useResilientActivitySubmit({
  activityType: 'listening',
  unitId,
  studentId: profile.id,
});

// MCQ grading: compute score INLINE (no async edge function for simple MCQ — that's where the hang was)
const handleSubmit = async () => {
  const scored = questions.map(q => ({ ...q, correct: q.studentAnswer === q.correctAnswer }));
  const score = scored.filter(q => q.correct).length;
  const total = scored.length;
  await submit({ answers: scored, score, total, percentage: (score/total)*100, is_complete: true });
};
```

**Speaking tab** (writes to `submissions` not `*_progress`):
```jsx
const { submit, submitting } = useResilientActivitySubmit({
  activityType: 'speaking',
  unitId,
  studentId: profile.id,
});

// Upload audio first, then submit
const handleSubmit = async () => {
  const audioUrl = await uploadAudio(blob); // separate concern, has its own retry
  await submit({
    type: 'speaking',
    audio_url: audioUrl,
    duration_seconds: duration,
    topic_id: topicId,
    is_complete: true,
    conflictKey: 'student_id,unit_id,topic_id',
  });
};
```

**Writing tab:**
```jsx
const { submit, submitting } = useResilientActivitySubmit({
  activityType: 'writing',
  unitId,
  studentId: profile.id,
});

const handleSubmit = async () => {
  await submit({
    type: 'writing',
    content_text: essay,
    word_count: wordCount,
    is_complete: true,
    conflictKey: 'student_id,unit_id,prompt_id',
  });
};
```

**Reading A / Reading B** (split by `section_key`):
```jsx
const { submit, submitting } = useResilientActivitySubmit({
  activityType: 'reading_a',
  unitId,
  studentId: profile.id,
});

await submit({
  section_key: 'a',
  answers,
  score,
  is_complete: true,
  conflictKey: 'student_id,unit_id,section_key',
});
```

**Apply same pattern to:** Vocabulary Quiz, Pronunciation, Unit Assessment.

### B.3 — DB function: `compute_unit_progress`

Create `supabase/migrations/<timestamp>_compute_unit_progress.sql`:

```sql
-- Single source of truth for unit progress.
-- Dynamically reads the unit's actual activity inventory, then checks completion against canonical source.
-- Returns numerator, denominator, percentage, breakdown jsonb.

CREATE OR REPLACE FUNCTION compute_unit_progress(p_student_id uuid, p_unit_id uuid)
RETURNS TABLE(numerator int, denominator int, percentage int, breakdown jsonb)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_inventory jsonb := '{}'::jsonb;
  v_completion jsonb := '{}'::jsonb;
  v_num int := 0;
  v_den int := 0;
  v_count int;
BEGIN
  -- ─────────────────────────────────────
  -- 1. Build the unit's activity inventory dynamically
  -- ─────────────────────────────────────

  -- Reading passages (A + B)
  SELECT COUNT(*) INTO v_count FROM curriculum_reading_passages WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('reading', v_count);
    v_den := v_den + v_count;
  END IF;

  -- Grammar lesson (0 or 1)
  SELECT COUNT(*) INTO v_count FROM curriculum_grammar_lessons WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('grammar', 1);
    v_den := v_den + 1;
  END IF;

  -- Listening items
  SELECT COUNT(*) INTO v_count FROM curriculum_listening WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('listening', v_count);
    v_den := v_den + v_count;
  END IF;

  -- Speaking topics
  SELECT COUNT(*) INTO v_count FROM curriculum_speaking_topics WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('speaking', v_count);
    v_den := v_den + v_count;
  END IF;

  -- Writing prompt (0 or 1)
  SELECT COUNT(*) INTO v_count FROM curriculum_writing_prompts WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('writing', 1);
    v_den := v_den + 1;
  END IF;

  -- Vocabulary (counted as 1 slot, completion = % mastered above threshold)
  SELECT COUNT(*) INTO v_count FROM curriculum_vocabulary WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('vocabulary_total', v_count);
    v_den := v_den + 1;
  END IF;

  -- Pronunciation (counted as 1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_pronunciation WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('pronunciation', 1);
    v_den := v_den + 1;
  END IF;

  -- Unit assessment (0 or 1)
  SELECT COUNT(*) INTO v_count FROM curriculum_unit_assessments WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('assessment', 1);
    v_den := v_den + 1;
  END IF;

  -- ─────────────────────────────────────
  -- 2. Tally completions against canonical sources
  -- ─────────────────────────────────────

  -- Reading
  SELECT COUNT(*) INTO v_count
  FROM student_reading_progress
  WHERE student_id = p_student_id AND unit_id = p_unit_id AND is_complete = true;
  v_num := v_num + LEAST(v_count, COALESCE((v_inventory->>'reading')::int, 0));
  v_completion := v_completion || jsonb_build_object('reading_done', v_count);

  -- Grammar
  IF (v_inventory ? 'grammar') THEN
    SELECT COUNT(*) INTO v_count
    FROM student_grammar_progress
    WHERE student_id = p_student_id AND unit_id = p_unit_id AND is_complete = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('grammar_done', LEAST(v_count, 1));
  END IF;

  -- Listening
  SELECT COUNT(*) INTO v_count
  FROM student_listening_progress
  WHERE student_id = p_student_id AND unit_id = p_unit_id AND is_complete = true;
  v_num := v_num + LEAST(v_count, COALESCE((v_inventory->>'listening')::int, 0));
  v_completion := v_completion || jsonb_build_object('listening_done', v_count);

  -- Speaking — check BOTH submissions (canonical) AND student_speaking_progress
  SELECT COUNT(DISTINCT topic_id) INTO v_count
  FROM submissions
  WHERE student_id = p_student_id AND unit_id = p_unit_id AND type = 'speaking'
    AND status IN ('submitted', 'graded');
  v_num := v_num + LEAST(v_count, COALESCE((v_inventory->>'speaking')::int, 0));
  v_completion := v_completion || jsonb_build_object('speaking_done', v_count);

  -- Writing
  IF (v_inventory ? 'writing') THEN
    SELECT COUNT(*) INTO v_count
    FROM submissions
    WHERE student_id = p_student_id AND unit_id = p_unit_id AND type = 'writing'
      AND status IN ('submitted', 'graded');
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('writing_done', LEAST(v_count, 1));
  END IF;

  -- Vocabulary (% mastered)
  IF (v_inventory ? 'vocabulary_total') THEN
    SELECT COUNT(*) INTO v_count
    FROM vocabulary_word_mastery vwm
    JOIN curriculum_vocabulary cv ON cv.id = vwm.vocabulary_id
    WHERE vwm.student_id = p_student_id
      AND cv.unit_id = p_unit_id
      AND vwm.status IN ('learning', 'mastered'); -- learning counts as effort
    -- Award the vocab slot if ≥80% engaged
    IF v_count >= (COALESCE((v_inventory->>'vocabulary_total')::int, 1) * 0.8) THEN
      v_num := v_num + 1;
    END IF;
    v_completion := v_completion || jsonb_build_object('vocabulary_engaged', v_count);
  END IF;

  -- Pronunciation
  IF (v_inventory ? 'pronunciation') THEN
    SELECT COUNT(*) INTO v_count
    FROM student_pronunciation_progress
    WHERE student_id = p_student_id AND unit_id = p_unit_id AND is_complete = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('pronunciation_done', LEAST(v_count, 1));
  END IF;

  -- Assessment
  IF (v_inventory ? 'assessment') THEN
    SELECT COUNT(*) INTO v_count
    FROM submissions
    WHERE student_id = p_student_id AND unit_id = p_unit_id AND type = 'assessment'
      AND status = 'graded' AND grade_numeric >= 60;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('assessment_passed', LEAST(v_count, 1));
  END IF;

  -- ─────────────────────────────────────
  -- 3. Return result
  -- ─────────────────────────────────────
  RETURN QUERY SELECT
    v_num,
    v_den,
    CASE WHEN v_den = 0 THEN 0 ELSE ROUND((v_num::numeric / v_den::numeric) * 100)::int END,
    jsonb_build_object('inventory', v_inventory, 'completion', v_completion);
END;
$$;
```

**IMPORTANT:** Phase A must verify each `curriculum_*` and `student_*_progress` table name actually exists in this DB. If naming differs, adapt the SQL — do NOT guess.

### B.4 — `unit_progress` table + triggers

```sql
-- The materialized progress (read-only from frontend)
CREATE TABLE IF NOT EXISTS unit_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  numerator int NOT NULL DEFAULT 0,
  denominator int NOT NULL DEFAULT 0,
  percentage int NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_progress_student ON unit_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_unit_progress_unit ON unit_progress(unit_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE unit_progress;

-- The single recompute helper that triggers call
CREATE OR REPLACE FUNCTION recompute_unit_progress_for(p_student_id uuid, p_unit_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_num int; v_den int; v_pct int; v_breakdown jsonb;
BEGIN
  IF p_student_id IS NULL OR p_unit_id IS NULL THEN RETURN; END IF;

  SELECT numerator, denominator, percentage, breakdown
    INTO v_num, v_den, v_pct, v_breakdown
  FROM compute_unit_progress(p_student_id, p_unit_id);

  INSERT INTO unit_progress (student_id, unit_id, numerator, denominator, percentage, breakdown, updated_at)
  VALUES (p_student_id, p_unit_id, v_num, v_den, v_pct, v_breakdown, now())
  ON CONFLICT (student_id, unit_id) DO UPDATE SET
    numerator = EXCLUDED.numerator,
    denominator = EXCLUDED.denominator,
    percentage = EXCLUDED.percentage,
    breakdown = EXCLUDED.breakdown,
    updated_at = now();
END;
$$;

-- Generic trigger function — extracts (student_id, unit_id) from NEW/OLD and recomputes
CREATE OR REPLACE FUNCTION trg_recompute_unit_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_id uuid;
  v_unit_id uuid;
BEGIN
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  v_unit_id := COALESCE(NEW.unit_id, OLD.unit_id);

  -- For submissions table (unit_id may need lookup via assignment_id if not direct)
  IF v_unit_id IS NULL AND TG_TABLE_NAME = 'submissions' THEN
    SELECT unit_id INTO v_unit_id FROM assignments WHERE id = COALESCE(NEW.assignment_id, OLD.assignment_id);
  END IF;

  -- For vocabulary_word_mastery (no unit_id directly — look up via vocabulary_id)
  IF v_unit_id IS NULL AND TG_TABLE_NAME = 'vocabulary_word_mastery' THEN
    SELECT unit_id INTO v_unit_id FROM curriculum_vocabulary WHERE id = COALESCE(NEW.vocabulary_id, OLD.vocabulary_id);
  END IF;

  PERFORM recompute_unit_progress_for(v_student_id, v_unit_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to every source table — IF EXISTS guard so this migration is idempotent
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'submissions',
    'student_reading_progress',
    'student_grammar_progress',
    'student_listening_progress',
    'student_speaking_progress',
    'student_writing_progress',
    'student_pronunciation_progress',
    'vocabulary_word_mastery',
    'vocabulary_quiz_attempts'
  ] LOOP
    -- Skip if table doesn't exist (handles schema drift)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS recompute_unit_progress_%I ON %I', t, t);
      EXECUTE format(
        'CREATE TRIGGER recompute_unit_progress_%I
         AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION trg_recompute_unit_progress()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- RLS on unit_progress — students read their own, admins/trainers read assigned
ALTER TABLE unit_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_read_own_unit_progress" ON unit_progress
  FOR SELECT USING (student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));
```

### B.5 — Frontend: live progress bars via Realtime

Create `src/hooks/useUnitProgress.js`:

```javascript
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Single source of truth for unit progress in the UI.
 * - Reads from unit_progress table (computed DB-side)
 * - Subscribes to Realtime for live updates after any submission anywhere
 *
 * Used by: LevelBrowser (unit cards), UnitPage header bar, AdminProgressDiagnostic
 */
export function useUnitProgress({ studentId, unitId }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unit-progress', unitId, studentId],
    queryFn: async () => {
      if (!studentId || !unitId) return null;
      const { data, error } = await supabase
        .from('unit_progress')
        .select('numerator, denominator, percentage, breakdown, updated_at')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { numerator: 0, denominator: 0, percentage: 0, breakdown: {} };
    },
    enabled: !!studentId && !!unitId,
    staleTime: 30_000,
  });

  // Realtime subscription — UI updates without reload
  useEffect(() => {
    if (!studentId || !unitId) return;
    const channel = supabase
      .channel(`unit_progress:${studentId}:${unitId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'unit_progress', filter: `student_id=eq.${studentId}` },
        () => queryClient.invalidateQueries({ queryKey: ['unit-progress', unitId, studentId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId, unitId, queryClient]);

  return query;
}

/**
 * Variant for the level browser — reads progress for ALL units in a level at once.
 */
export function useLevelUnitsProgress({ studentId, levelId }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['level-progress', studentId, levelId],
    queryFn: async () => {
      const { data: units, error: ue } = await supabase
        .from('curriculum_units')
        .select('id')
        .eq('level_id', levelId);
      if (ue) throw ue;
      const unitIds = units.map(u => u.id);

      const { data, error } = await supabase
        .from('unit_progress')
        .select('unit_id, percentage')
        .eq('student_id', studentId)
        .in('unit_id', unitIds);
      if (error) throw error;

      // Return a map: { unitId: percentage }
      return Object.fromEntries(data.map(r => [r.unit_id, r.percentage]));
    },
    enabled: !!studentId && !!levelId,
    staleTime: 30_000,
  });

  // Realtime — any unit_progress row for this student → refetch
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(`level_progress:${studentId}:${levelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'unit_progress', filter: `student_id=eq.${studentId}` },
        () => queryClient.invalidateQueries({ queryKey: ['level-progress', studentId, levelId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId, levelId, queryClient]);

  return query;
}
```

### B.6 — Wire the new hook into UI

Find and update:
- **Level browser unit cards** (most likely `src/pages/student/curriculum/LevelBrowser.jsx` or similar — confirm in Phase A): replace whatever computes the per-unit dot/bar with `useLevelUnitsProgress`
- **Unit page header bar** (most likely `src/pages/student/curriculum/UnitPage.jsx`): replace with `useUnitProgress`
- **Student dashboard "current unit" widget**: replace if it shows percentage

Remove ALL legacy frontend progress-calculation code. The DB function is the only source.

### B.7 — Admin diagnostic page

Create `src/pages/admin/StudentProgressDiagnostic.jsx`. Admin picks student + unit → page renders the breakdown JSON from `unit_progress` in a friendly Arabic table:

```
[الطالبة: هوازن] · [الوحدة: B1 - الوحدة ٧]

التقدّم الكلّي: ١٩/٢٠ = ٩٥٪
آخر تحديث: قبل ٣ ساعات

تفصيل الأنشطة:
  ✓ القراءة A           — مكتمل ٢٠٢٦/٠٥/٠١
  ✓ القراءة B           — مكتمل ٢٠٢٦/٠٥/٠٢
  ✓ القواعد             — مكتمل ٢٠٢٦/٠٥/٠٣
  ✓ الاستماع ١          — مصحّح ٢٠٢٦/٠٥/٠٤ (٨/١٠)
  ✓ المحادثة موضوع ١    — سُلّم ٢٠٢٦/٠٥/٠٥
  ✓ المحادثة موضوع ٢    — سُلّم ٢٠٢٦/٠٥/٠٥
  ❌ المحادثة موضوع ٣    — سُلّم لكن الإكمال غير مسجّل
  ✓ الكتابة             — مصحّحة ٢٠٢٦/٠٥/٠٧
  ⏳ المفردات ١٢/١٥      — العتبة ٨٠٪ (لازم ١٢)
  ⏳ التقييم النهائي     — لم تُحَلّ بعد

[إعادة الحساب الآن] (admin-only) — ينادي recompute_unit_progress_for() ويحدّث الصف
```

This is the canonical debugger for any future "progress stuck at X%" complaint. Route: `/admin/diagnostic/progress`.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — BACKFILL
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Only run AFTER triggers are live and verified.**

Create `scripts/backfill-unit-progress-2026-05-14.cjs`:

```javascript
// Idempotent recompute for every (student, unit) pair that has ANY activity rows.
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

(async () => {
  // Collect every distinct (student_id, unit_id) pair across all source tables
  const sources = [
    'student_reading_progress',
    'student_grammar_progress',
    'student_listening_progress',
    'student_speaking_progress',
    'student_writing_progress',
    'student_pronunciation_progress',
    'submissions',
  ];

  const pairs = new Set();
  for (const t of sources) {
    const { data, error } = await supabase.from(t).select('student_id, unit_id').not('unit_id', 'is', null);
    if (error) { console.error(`${t}:`, error.message); continue; }
    data.forEach(r => pairs.add(`${r.student_id}::${r.unit_id}`));
  }

  console.log(`Recomputing ${pairs.size} (student, unit) pairs...`);

  let done = 0, errs = 0;
  for (const p of pairs) {
    const [studentId, unitId] = p.split('::');
    const { error } = await supabase.rpc('recompute_unit_progress_for', {
      p_student_id: studentId,
      p_unit_id: unitId,
    });
    if (error) { errs++; console.error(`fail ${studentId}/${unitId}:`, error.message); }
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${pairs.size}...`);
  }

  console.log(`Done. ${done - errs} succeeded, ${errs} errors.`);

  // Sanity counts
  const { count: at100 } = await supabase
    .from('unit_progress').select('*', { count: 'exact', head: true }).eq('percentage', 100);
  console.log(`Students × units at 100%: ${at100}`);
})();
```

Run with: `node scripts/backfill-unit-progress-2026-05-14.cjs`

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — VERIFICATION
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Hawazin's stuck unit shows 100% (or correct partial)
Re-run the diagnostic query from A.3. The numerator/denominator must now match the actual activities she completed.

### D.2 — Round-trip test (without touching her data)
Pick a test/staging account if available, OR use admin impersonation read-only:
1. Open a unit
2. Submit one activity (grammar quiz)
3. **Watch the network tab:** request returns < 1s, no hang
4. **Watch the unit page header bar:** percentage ticks up immediately (Realtime)
5. **Go back to the level browser** (don't reload): the unit's outer progress bar matches
6. Force-reload: still matches

### D.3 — Trigger sanity SQL

```sql
-- Should be 0 after backfill
SELECT COUNT(*) FROM submissions s
LEFT JOIN unit_progress up ON up.student_id = s.student_id AND up.unit_id = s.unit_id
WHERE up.id IS NULL AND s.status IN ('submitted', 'graded');

-- Triggers actually attached?
SELECT event_object_table, trigger_name FROM information_schema.triggers
WHERE trigger_name LIKE 'recompute_unit_progress%'
ORDER BY event_object_table;
```

### D.4 — Hook coverage check
Grep should return ZERO matches outside `useResilientActivitySubmit.js` itself:
```bash
grep -rn "setLoading.*true.*supabase.*from\|setSubmitting(true).*await supabase" src/ --include="*.jsx" --include="*.tsx"
```

If anything remains, that handler is still on the raw pattern — migrate it.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — COMMIT + PUSH
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
git add supabase/migrations/*_compute_unit_progress* \
        supabase/migrations/*_unit_progress_triggers* \
        src/hooks/useResilientActivitySubmit.js \
        src/hooks/useUnitProgress.js \
        src/pages/student/curriculum/ \
        src/components/curriculum/ \
        src/pages/admin/StudentProgressDiagnostic.jsx \
        scripts/backfill-unit-progress-2026-05-14.cjs \
        docs/dev-notes/

git commit -m "fix(curriculum): resilient submit + live unit progress (closes submit-hang & stale-progress complaints)

Two coupled student-facing bugs, root-cause fixed:

ROOT CAUSE — submit hang:
  Raw submit handlers across activity types had: missing finally{} cleanup,
  no AbortController, no .select() after upsert (RLS silent failures), and
  inconsistent cache invalidation. When the network slowed or RLS denied,
  the loading state never cleared. Student saw 'submit' button stuck forever.

ROOT CAUSE — stale progress bars:
  Progress was computed in multiple places (frontend hook + edge function +
  scattered SQL). When a submission succeeded but one of the recompute paths
  was missed, unit_progress drifted. Level browser and unit header showed
  different numbers from reality.

FIXES:
  1. useResilientActivitySubmit hook — single submit primitive with:
     - 15s AbortController timeout
     - finally{} guarantees setSubmitting(false)
     - .select() on upsert exposes RLS silent failures
     - online/offline toast
     - explicit query invalidation on success
  2. All activity submit handlers migrated to the hook
     (Reading A/B, Grammar, Vocab, Listening, Writing, Speaking,
      Pronunciation, Assessment)
  3. compute_unit_progress(student, unit) PL/pgSQL function — dynamic
     denominator from actual unit inventory, completion checked against
     canonical sources
  4. Triggers on every progress source table — drift impossible
  5. useUnitProgress + useLevelUnitsProgress hooks with Realtime —
     UI updates without reload after any submission
  6. Admin /diagnostic/progress page — per-activity breakdown, manual recompute
  7. Backfill script — every existing student×unit recomputed once

VERIFICATION:
  - Hawazin's stuck B1 unit now matches her actual activity completion
  - Submissions without progress row: 0
  - Triggers attached to all 9 source tables (or however many exist in this DB)
  - Test student submit → < 1s response → progress bar tick up live

Refs: chat 2026-05-13 (04-FIX-PROGRESS-TRACKING design),
      chat 2026-05-09 (UNIVERSAL-RETRY phantom submission cleanup),
      student complaint 2026-05-14"

git push origin main

# Verify push reached remote
git fetch origin
echo "LOCAL : $(git rev-parse HEAD)"
echo "REMOTE: $(git rev-parse origin/main)"
# Both must match

# Now run the backfill (DB-only, no Vercel involvement)
node scripts/backfill-unit-progress-2026-05-14.cjs
```

Vercel auto-deploys on push. No `vite build` here.

---

## ⛔ DO NOT

- ❌ Delete or modify any existing `submissions` row
- ❌ Compute progress in the frontend — the DB function is the only source
- ❌ Skip Phase A discovery — schema drift is real, table names may differ
- ❌ Run backfill before triggers are live (would create rows that drift again)
- ❌ Use `user.id` for student reads — always `profile.id`
- ❌ Add `.catch()` to Supabase query builders — they don't reject
- ❌ Run `npm run build` / `vite build` locally
- ❌ Hardcode unit denominators anywhere
- ❌ Touch the speaking evaluation logic (separate fix in flight per memory)
- ❌ Touch the per-unit assessment single-attempt rule (assessment is exempt from retry by design)

---

## ✅ FINISH LINE

When all of these are true, ship it:

- [ ] `git rev-parse HEAD` == `git rev-parse origin/main`
- [ ] Vercel latest deploy = SUCCESS (check via `npx vercel ls --count 3`)
- [ ] Hawazin's B1 stuck unit shows the correct percentage
- [ ] Submitting any activity from a test account takes < 2s end-to-end (no hang)
- [ ] After that submit, the level browser unit bar reflects the new percentage **without a page reload**
- [ ] Phase D.3 query returns 0 submissions-without-progress rows
- [ ] Phase D.4 grep returns 0 raw submit handlers

Done — report back with the commit SHA, the backfill output (pairs count + at-100 count), and any handlers found in A.2 that were too tangled to migrate cleanly (so I can write a targeted follow-up).

End of prompt.
