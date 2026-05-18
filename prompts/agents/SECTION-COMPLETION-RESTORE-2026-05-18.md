# ✓ SECTION COMPLETION RESTORE — UNIT OVERVIEW BADGES (2026-05-18)

> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/SECTION-COMPLETION-RESTORE-2026-05-18.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/SECTION-COMPLETION-RESTORE-2026-05-18.md
> ```

---

## 🎯 MISSION

Restore the **"section complete" (✓ done) badges** on the **unit overview page** for **every section type** (vocabulary, reading, listening, grammar, writing, speaking, and anything else the unit has).

### Symptom

A student opens a unit. The unit overview shows a list of section cards (vocab, reading, listening, etc.). The student goes into the vocab section, completes every exercise. They come back to the unit overview — the vocab card still shows as incomplete. Same for reading, listening, etc. The student is frustrated because they did the work but the system doesn't acknowledge it.

### What is NOT this bug

- This is NOT the per-vocab-word green check (mastered_at on individual words). That's a separate fix already in flight.
- This is NOT about XP not being awarded — XP may be working fine. This is purely the **section-level "done" badge** on the unit overview UI.

### Likely root cause categories (Phase A will determine)

1. `compute_unit_progress` PL/pgSQL function broken, querying wrong table/condition, or out of sync with current section types
2. Trigger that should fire `compute_unit_progress` on submission insert isn't firing (or was dropped)
3. Realtime subscription on the unit-overview page stopped listening to the right channel
4. UI is reading from the wrong column / field / hook
5. RLS policy changed and the student can no longer SELECT their own progress row

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod via `mcp__supabase__*` tools
- **Branch:** `main`
- **Coordination:** If another prompt is rebasing migrations or refactoring hooks in `/src/pages/student/`, wait for it to push, then `git pull --rebase origin main` first. Phase A is read-only and safe to run in parallel.

---

## ⚠️ STRICT RULES

1. **No student data writes.** No editing of `submissions`, `unit_progress`, `vocab_progress`, `xp_transactions` actual ROWS. Schema-level fixes (e.g., adding a missing trigger) are allowed via reversible migration.
2. **Migrations only if necessary.** Prefer client-side or function-level fixes. If a DB migration IS necessary (e.g., recreating a dropped trigger), write a numbered idempotent migration.
3. **Hooks before guards.** React #310 rule.
4. **`.select()` after every `.update()` / `.upsert()`** (will rarely apply).
5. **`profile?.id` not `user?.id`** anywhere student-scoped.
6. **No `vite build` locally.**
7. **Mac shell.**
8. **Idempotent.** Re-runnable.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Map the section-completion data flow
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Find the unit overview component

```bash
# The page that shows section cards (vocab / reading / listening / etc.)
grep -rln "UnitOverview\|UnitPage\|UnitDetail\|unit-overview\|sections.map\|SectionCard" \
  src/pages/student src/components 2>/dev/null | head -10

# Where is each section's "done" badge rendered?
grep -rn "section.*complete\|isComplete\|sectionComplete\|completed.*section\|✓\|CheckCircle" \
  src/pages/student src/components 2>/dev/null | head -30
```

Read the unit overview component end-to-end. Note:
- How does it know what sections a unit has? (Query? Static list?)
- What field/value does it consult to decide "this section is done"?
- Is the value per-section a boolean? A percentage? An enum?
- Does it subscribe to realtime updates?

### A.2 — Find the source of truth for "section complete"

Common patterns in this codebase based on what the skill describes:

```sql
-- Is there a unit_progress table with per-section JSON?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'unit_progress'
ORDER BY ordinal_position;

-- Is there a function compute_unit_progress?
SELECT proname, prosrc
FROM pg_proc
WHERE proname ILIKE '%unit_progress%' OR proname ILIKE '%section_complete%' OR proname ILIKE '%compute_progress%';

-- What triggers exist on submissions / vocab_progress / etc.?
SELECT event_object_table, trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

If `compute_unit_progress` exists, read its full body. Note:
- What source tables does it scan? (submissions? vocab_progress? a generic activities table?)
- What condition marks a section "complete"? (count > 0? count == total? ratio threshold?)
- Does it cover ALL current section types, or was it written when only some existed?

### A.3 — Probe a real student who completed sections recently

Pick a known active student:

```sql
-- Find a student with recent activity (use a real student profile_id from active groups)
-- Replace <profile_id> with an actual ID from groups A1 or B1
SELECT s.id, s.activity_id, s.created_at, a.section_type, a.unit_id
FROM submissions s
JOIN activities a ON a.id = s.activity_id
WHERE s.profile_id = '<profile_id>'
  AND s.created_at > NOW() - INTERVAL '7 days'
ORDER BY s.created_at DESC
LIMIT 30;
```

(Adjust table/column names to match the actual schema discovered in A.2.)

Then for the same student + a unit they recently completed sections in:

```sql
-- What does unit_progress (or equivalent) show for that student + unit?
SELECT * FROM unit_progress
WHERE profile_id = '<profile_id>' AND unit_id = '<unit_id>';
```

Compare:
- Are there submissions for vocab activities? YES
- Does `unit_progress` say vocab is complete? <answer>
- Same for reading, listening, grammar, etc.

If submissions exist for a section but `unit_progress` doesn't reflect it → the COMPUTE step is broken.
If `unit_progress` reflects completion but the UI doesn't show it → the READ step is broken.

### A.4 — Test the COMPUTE step manually

If a `compute_unit_progress` function exists, invoke it directly for the test student + unit:

```sql
SELECT compute_unit_progress('<profile_id>', '<unit_id>');
SELECT * FROM unit_progress WHERE profile_id = '<profile_id>' AND unit_id = '<unit_id>';
```

If the function exists but returns wrong results → the LOGIC is broken.
If the function doesn't exist → it was dropped or never created; check migration history.
If the function exists and works correctly when called manually → the TRIGGER that should auto-invoke it is broken.

### A.5 — Test the trigger

```sql
-- After inserting a submission, does unit_progress update?
-- Look for triggers on the submission table that call compute_unit_progress
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('submissions', 'vocab_progress', 'activities')
  AND action_statement ILIKE '%unit_progress%';
```

If a trigger should exist but doesn't → write a migration to recreate it.
If a trigger exists but is silently disabled → re-enable.

### A.6 — Test the READ / UI step

Once we know `unit_progress` has the right data, check that the UI reads it:

```bash
grep -rn "unit_progress\|useUnitProgress\|fetchUnitProgress" src/ 2>/dev/null | head -20
```

Read the hook / query. Confirm:
- It selects the fields the UI consumes
- It filters by `profile?.id` (not `user?.id`)
- The query returns expected fields when run manually
- The UI checks the right field (e.g., `unitProgress.sections.vocab.complete` not `unitProgress.vocab_complete` if those don't match)

### A.7 — RLS check

```sql
SELECT * FROM pg_policies WHERE tablename = 'unit_progress';
```

Confirm the student can SELECT their own `unit_progress` rows. If RLS is too restrictive, the UI gets back nothing and silently renders "incomplete".

### A.8 — Phase A report

Write `docs/audits/section-completion-restore/PHASE-A-REPORT.md`:

```markdown
# Phase A — Section Completion Diagnosis

## Source of truth
- Table: <unit_progress or equivalent>
- Compute function: <name> (or NONE FOUND)
- Trigger(s): <list> (or NONE FOUND)

## Probe student
- profile_id: <id>
- Recent submissions count by section: vocab=N, reading=N, ...
- unit_progress row state: <verbatim row>

## Diagnosis
The bug is at: <COMPUTE | TRIGGER | READ | RLS | UI>
Specifically: <one-line root cause>

## Section types not covered (if compute function exists but doesn't cover all types)
- <list>

## Required fix
<exact change needed>
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Fix the broken layer
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply the minimum fix that matches Phase A's diagnosis.

### B.1 — If COMPUTE function logic is broken or missing a section type

Write an idempotent migration that REPLACES the function. Include every current section type. Use `LATERAL` or per-section CTEs cleanly:

```sql
-- supabase/migrations/<NNN>_fix_compute_unit_progress.sql
CREATE OR REPLACE FUNCTION compute_unit_progress(p_profile_id uuid, p_unit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sections jsonb := '{}'::jsonb;
  -- adjust to actual section types in this codebase, discovered in Phase A
  v_section_types text[] := ARRAY['vocabulary', 'reading', 'listening', 'grammar', 'writing', 'speaking'];
  v_type text;
  v_total int;
  v_done int;
BEGIN
  FOREACH v_type IN ARRAY v_section_types LOOP
    -- adjust the source query to actual schema
    SELECT COUNT(*) INTO v_total
      FROM activities
      WHERE unit_id = p_unit_id AND section_type = v_type;

    SELECT COUNT(DISTINCT a.id) INTO v_done
      FROM activities a
      JOIN submissions s ON s.activity_id = a.id
      WHERE a.unit_id = p_unit_id
        AND a.section_type = v_type
        AND s.profile_id = p_profile_id;

    v_sections := v_sections || jsonb_build_object(v_type, jsonb_build_object(
      'total', v_total,
      'done', v_done,
      'complete', (v_total > 0 AND v_done >= v_total)
    ));
  END LOOP;

  INSERT INTO unit_progress (profile_id, unit_id, sections, updated_at)
  VALUES (p_profile_id, p_unit_id, v_sections, now())
  ON CONFLICT (profile_id, unit_id)
  DO UPDATE SET sections = EXCLUDED.sections, updated_at = EXCLUDED.updated_at;
END;
$$;
```

**Adjust to match the actual schema** — the snippet above is illustrative. Use the real table/column names from Phase A.

Apply via `mcp__supabase__apply_migration`.

### B.2 — If TRIGGER is missing or disabled

Write an idempotent migration:

```sql
-- supabase/migrations/<NNN>_ensure_section_progress_trigger.sql

CREATE OR REPLACE FUNCTION trigger_compute_unit_progress() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_unit_id uuid;
  v_profile_id uuid;
BEGIN
  -- adjust join path to find unit_id from NEW.activity_id
  SELECT a.unit_id INTO v_unit_id FROM activities a WHERE a.id = NEW.activity_id;
  v_profile_id := NEW.profile_id;
  IF v_unit_id IS NOT NULL AND v_profile_id IS NOT NULL THEN
    PERFORM compute_unit_progress(v_profile_id, v_unit_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_compute_unit_progress ON submissions;
CREATE TRIGGER submissions_compute_unit_progress
  AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION trigger_compute_unit_progress();
```

Apply the same way. Also recreate triggers on `vocab_progress` if vocab completion isn't routed through `submissions`.

### B.3 — If READ / UI is broken

Update the hook to select the right field. Update the UI conditional. Example:

```jsx
// Hook
const useUnitProgress = (unitId) => {
  const profile = useProfile();
  return useQuery({
    queryKey: ['unit-progress', unitId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase
        .from('unit_progress')
        .select('sections, updated_at')
        .eq('profile_id', profile.id)
        .eq('unit_id', unitId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(profile?.id && unitId),
  });
};

// Component
const SectionCard = ({ section, unitProgress }) => {
  const isComplete = Boolean(unitProgress?.sections?.[section.type]?.complete);
  return (
    <Card>
      <h3>{section.title_ar}</h3>
      {isComplete && <span className="text-emerald-400">✓</span>}
    </Card>
  );
};
```

### B.4 — If RLS is too restrictive

Add (or fix) a policy:

```sql
-- supabase/migrations/<NNN>_unit_progress_rls.sql
DROP POLICY IF EXISTS "students read own unit_progress" ON unit_progress;
CREATE POLICY "students read own unit_progress" ON unit_progress
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());
```

### B.5 — Backfill (compute progress for existing students who completed sections before the fix)

After fixing COMPUTE and TRIGGER, run a one-shot backfill so existing students immediately see correct badges:

```sql
-- Find every (profile_id, unit_id) that has submissions, and recompute
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT s.profile_id, a.unit_id
    FROM submissions s
    JOIN activities a ON a.id = s.activity_id
    WHERE a.unit_id IS NOT NULL AND s.profile_id IS NOT NULL
  LOOP
    PERFORM compute_unit_progress(r.profile_id, r.unit_id);
  END LOOP;
END;
$$;
```

Run this manually via `mcp__supabase__execute_sql` — NOT in a migration (one-time data refresh, not a schema change).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Verify across all section types
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Pick test scenarios

For 3 different units, each with multiple section types:

```sql
-- For a unit with completed sections, after backfill:
SELECT
  jsonb_pretty(sections) AS sections
FROM unit_progress
WHERE profile_id = '<test_profile_id>' AND unit_id = '<unit_id>';
```

Expected: every section type the unit has appears in `sections`, with `complete: true` for sections the student actually completed.

### C.2 — End-to-end flow on a fresh action

Simulate a new submission and verify the cascade:

```sql
-- Note the current state
SELECT sections FROM unit_progress WHERE profile_id = '<test_id>' AND unit_id = '<unit_id>';

-- Insert a test submission (use a real activity in this unit, real profile)
-- ROLLBACK at the end so this is non-destructive
BEGIN;
INSERT INTO submissions (profile_id, activity_id, ...) VALUES (...);
SELECT sections FROM unit_progress WHERE profile_id = '<test_id>' AND unit_id = '<unit_id>';
ROLLBACK;
```

The second SELECT should show updated `sections`. If it shows the OLD value, the trigger isn't firing.

### C.3 — UI render check

Read the unit overview page rendering with the test data. Verify in code that:
- Every section card has access to `unitProgress.sections[section.type]?.complete`
- The check icon renders when `complete: true`
- The icon does NOT render when `complete: false`

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Self-check + commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Self-check

1. `compute_unit_progress` function exists and covers every current section type
2. Trigger on submissions (and `vocab_progress` if separate) exists and is enabled
3. RLS on `unit_progress` allows authenticated students to SELECT their own rows
4. The unit overview hook uses `profile?.id` not `user?.id`
5. Backfill executed; sample student's `unit_progress.sections` matches their actual submissions
6. `npx eslint src/ --max-warnings=0`
7. `git status` clean

### D.2 — Final report

Write `docs/audits/section-completion-restore/FINAL-REPORT.md`:

```markdown
# Section Completion Restore — Final Report

## Diagnosis
<from Phase A>

## Fix applied
- Layer: <COMPUTE | TRIGGER | READ | UI | RLS>
- Files changed: <list>
- Migrations applied: <list of migration files, or NONE>

## Backfill
- Rows recomputed: N
- Sample student verification: PASS

## Section types now covered
<list>

## Verified end-to-end
- New submission triggers compute → unit_progress updates → UI shows ✓
```

### D.3 — Commit

```bash
git add src/ supabase/migrations/ docs/audits/section-completion-restore/

git commit -m "fix(progress): restore section-complete (✓) badges on unit overview across all skill types

ROOT CAUSE:
<from Phase A>

FIX:
- <layer fixed>
- All current section types (vocab, reading, listening, grammar, writing,
  speaking) covered by compute_unit_progress
- Trigger ensures unit_progress recomputes after every submission
- RLS verified: students can read their own unit_progress
- Hook uses profile?.id (impersonation-safe)
- Backfill applied — existing students with prior completions now see ✓

NOT TOUCHED:
- No submission rows mutated
- No xp_transactions touched
- Per-vocab-word mastered_at logic untouched (separate fix)"

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ Mutate `submissions`, `vocab_progress`, or `xp_transactions` row data
- ❌ Recompute by modifying student-data row contents (only `unit_progress` is rewritten, via the proper function)
- ❌ Run `vite build` locally
- ❌ Touch personalization / variant code (separate prompt)
- ❌ Touch the per-vocab-word mastered check (separate fix)
- ❌ Drop or rename existing tables

## ✅ FINISH LINE

- A student who completes a section sees the ✓ badge on the unit overview
- Works for every section type the unit has
- Existing students with prior completions also see correct badges (backfilled)
- One commit pushed to `origin/main`
- `docs/audits/section-completion-restore/FINAL-REPORT.md` exists

End of prompt.
