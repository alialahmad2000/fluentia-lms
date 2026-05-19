# 🧹 HIDE PRONUNCIATION + RESTORE SECTION COMPLETION BADGES (2026-05-19)

> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/HIDE-PRONUNCIATION-RESTORE-COMPLETION-BADGES-2026-05-19.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> git pull --rebase origin main
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/HIDE-PRONUNCIATION-RESTORE-COMPLETION-BADGES-2026-05-19.md
> ```

---

## 🎯 MISSION

Two independent UX fixes in one autonomous run:

### 1. Hide the pronunciation section

It causes more problems than it helps. Hide it everywhere students see it. **Do NOT delete code or data** — archive cleanly so the team can revive it later if needed. Treat it like a feature being shelved, not destroyed.

### 2. Restore section-completion badges (✓ done) on the unit overview

Students finish a section's tasks (vocab exercises, reading questions, listening questions, grammar drills, etc.) — but on the unit overview, the section card still shows as incomplete. The badge isn't lighting up.

A previous prompt attempt (`SECTION-COMPLETION-RESTORE-2026-05-18`) addressed this but either didn't ship or didn't fix the actual cause. This run re-diagnoses with REAL student data and fixes the root cause.

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod via `mcp__supabase__*`
- **Branch:** `main`. Pull-rebase before starting.
- **Coordination:** Safe to run in parallel with the listening fix prompt. Different files (listening section vs pronunciation + unit overview).

---

## ⚠️ STRICT RULES

1. **No data destruction.** Archive pronunciation code, don't `rm`. Comment out imports, hide JSX, leave the files.
2. **Test section completion with REAL student data**, not assumptions. Pick a student who recently submitted to a section and verify their unit_progress reflects it.
3. **All-section coverage.** The completion badge must work for vocab, reading, listening, grammar, writing, speaking — every section type that exists in the codebase. Phase A inventories which ones exist.
4. **No student data writes** to `submissions`, `vocab_progress`, `xp_transactions` content. Recomputing `unit_progress` via the proper function is allowed (it's a derived table).
5. **`.select()` after every `.update()` / `.upsert()`.**
6. **Hooks before guards.**
7. **`profile?.id` not `user?.id`.**
8. **No `vite build` locally.**
9. **Mac shell.**
10. **Idempotent.**

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 1 — HIDE PRONUNCIATION
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1.1 — Inventory pronunciation

```bash
# Component files
find src -name "*ronunciation*" -o -name "*Pronunciation*" 2>/dev/null

# All references
grep -rln "Pronunciation\|pronunciation\|نطق\|التلفظ\|التلفّظ" src/ 2>/dev/null | head -40

# Routes / pages
grep -rn "/pronunciation\|pronunciation.*route\|route.*pronunciation" src/ 2>/dev/null | head -20

# Nav / menu items linking to pronunciation
grep -rn "pronunciation" src/components/Navigation src/components/Sidebar src/layouts 2>/dev/null | head -20

# DB tables related to pronunciation
```

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%pronunc%' OR table_name ILIKE '%phoneme%')
ORDER BY table_name;
```

Record everything in `docs/audits/hide-pronunciation/INVENTORY.md`.

### 1.2 — Hide each surface

For each pronunciation entry point found:

**Components/JSX:** Wrap the imports and JSX render with comment blocks:

```jsx
// PRONUNCIATION-HIDDEN 2026-05-19: feature shelved due to UX issues.
// Files preserved for future revival. To re-enable: uncomment + remove the wrapper.
//
// import PronunciationSection from './PronunciationSection';
// import PronunciationTab from './PronunciationTab';

// ...in render:
{/* PRONUNCIATION-HIDDEN 2026-05-19
<PronunciationSection ... />
*/}
```

**Routes:** Remove pronunciation routes from the router config (keep the page file). Or wrap the route element in `null`:

```jsx
// PRONUNCIATION-HIDDEN 2026-05-19
// <Route path="/pronunciation" element={<PronunciationPage />} />
```

**Nav links / menu items:** Same treatment.

**Section type registry:** If there's a list of section types like `['vocabulary', 'reading', 'listening', 'pronunciation', ...]` somewhere driving the unit overview tabs, REMOVE `pronunciation` from the displayed list, but KEEP it in any backend-facing definitions (so existing pronunciation activities in the DB don't break).

### 1.3 — Hide pronunciation activities in the curriculum data

If `activities` (or whatever table) has rows with `section_type = 'pronunciation'`, the student should not see them in their unit overview. Two options:

- **Option A (recommended):** add a column `is_hidden_from_curriculum BOOLEAN DEFAULT false` to `activities`. Set it `true` for all pronunciation rows. The unit-overview query filters `is_hidden_from_curriculum = false`.
- **Option B (simpler):** in the unit-overview hook/query, hard-code an exclusion: `.neq('section_type', 'pronunciation')`. Less data-driven but ships immediately.

Pick Option A if there's already a similar pattern in the codebase; Option B otherwise. Document choice in the report.

### 1.4 — Preserve the data

```sql
-- Confirm preserved (not deleted)
SELECT COUNT(*) FROM activities WHERE section_type = 'pronunciation';
-- Should match the count from before this run
```

No DELETE statements. No DROP. The data is archived, not destroyed.

### 1.5 — Add a top-level marker

`docs/PRONUNCIATION-SHELVED.md`:

```markdown
# Pronunciation feature — SHELVED on 2026-05-19

## Reason
UX issues caused more friction for students than the feature was worth.
Reactivation requires fresh design + product decision.

## Where the code lives
<list of files from 1.1>

## How to re-enable
1. Search the codebase for "PRONUNCIATION-HIDDEN 2026-05-19" — every hidden surface is marked
2. Un-comment the imports + JSX in each marked location
3. Re-add the route to the router
4. If Option A was used: set `is_hidden_from_curriculum = false` for the pronunciation activity rows
5. Re-add to the section-type registry if you removed it
6. Smoke test

## What's preserved
- All component files
- All DB rows (N pronunciation activities, N pronunciation submissions if any)
- All audio files in storage
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 2 — RESTORE SECTION COMPLETION BADGES
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 2.1 — Map the data flow

```bash
# Unit overview component
grep -rln "UnitOverview\|UnitPage\|UnitDetail\|sections\.map\|SectionCard" src/pages/student src/components 2>/dev/null | head -10

# "Done" indicator rendering
grep -rn "isComplete\|isMastered\|sectionComplete\|completed.*section\|CheckCircle" src/pages/student src/components 2>/dev/null | head -30

# unit_progress consumers
grep -rn "unit_progress\|useUnitProgress\|fetchUnitProgress" src/ 2>/dev/null | head -20
```

Read each end-to-end. Document the data flow in `docs/audits/section-completion/PHASE-A-MAP.md`.

### 2.2 — Source of truth in DB

```sql
-- What table holds per-section completion?
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'unit_progress'
ORDER BY ordinal_position;

-- Functions that compute it
SELECT proname, pg_get_function_arguments(oid), pg_get_functiondef(oid)
FROM pg_proc WHERE pronamespace = 'public'::regnamespace
  AND (proname ILIKE '%unit_progress%' OR proname ILIKE '%section_complete%' OR proname ILIKE '%compute_progress%');

-- Triggers
SELECT event_object_table, trigger_name, action_statement, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### 2.3 — Probe a real student who recently completed a section

Find one (do NOT use Lamia — she was the listening reproducer; pick someone else):

```sql
-- Active students with recent submissions
SELECT s.profile_id, p.email, p.full_name, COUNT(*) AS submission_count, MAX(s.created_at) AS last_submission
FROM submissions s
JOIN profiles p ON p.id = s.profile_id
WHERE s.created_at > NOW() - INTERVAL '7 days'
GROUP BY s.profile_id, p.email, p.full_name
ORDER BY submission_count DESC
LIMIT 10;
```

Pick one student. Pick one unit they were active in. Check:

```sql
-- Submissions in that unit (by section type)
SELECT a.section_type, COUNT(*) AS submission_count
FROM submissions s
JOIN activities a ON a.id = s.activity_id
WHERE s.profile_id = '<id>' AND a.unit_id = '<unit_id>'
GROUP BY a.section_type;

-- What unit_progress says
SELECT * FROM unit_progress WHERE profile_id = '<id>' AND unit_id = '<unit_id>';
```

**The bug surfaces here:**
- If `submissions` shows the student completed activities, but `unit_progress` doesn't reflect it → COMPUTE layer broken
- If `unit_progress` has correct data but UI doesn't show it → READ/RENDER layer broken
- If `unit_progress` doesn't even have a row → TRIGGER never fired

Record verdict in `docs/audits/section-completion/PHASE-A-REPORT.md`.

### 2.4 — Apply fix at the broken layer

**COMPUTE layer fix:**

Idempotent migration `supabase/migrations/<NNN>_fix_compute_unit_progress.sql`:

```sql
CREATE OR REPLACE FUNCTION compute_unit_progress(p_profile_id uuid, p_unit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sections jsonb := '{}'::jsonb;
  v_section_types text[];
  v_type text;
  v_total int;
  v_done int;
BEGIN
  -- Discover section types ACTUALLY present in this unit (no hard-coding)
  SELECT array_agg(DISTINCT section_type)
    INTO v_section_types
    FROM activities
    WHERE unit_id = p_unit_id
      AND COALESCE(is_hidden_from_curriculum, false) = false;  -- skip pronunciation if hidden

  IF v_section_types IS NULL THEN RETURN; END IF;

  FOREACH v_type IN ARRAY v_section_types LOOP
    SELECT COUNT(*) INTO v_total
      FROM activities WHERE unit_id = p_unit_id AND section_type = v_type
      AND COALESCE(is_hidden_from_curriculum, false) = false;

    SELECT COUNT(DISTINCT a.id) INTO v_done
      FROM activities a
      JOIN submissions s ON s.activity_id = a.id
      WHERE a.unit_id = p_unit_id
        AND a.section_type = v_type
        AND s.profile_id = p_profile_id
        AND COALESCE(a.is_hidden_from_curriculum, false) = false;

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

Adjust column/table names to actual schema discovered in 2.1–2.2.

**TRIGGER fix** (idempotent):

```sql
CREATE OR REPLACE FUNCTION trigger_compute_unit_progress() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_unit_id uuid; BEGIN
  SELECT a.unit_id INTO v_unit_id FROM activities a WHERE a.id = NEW.activity_id;
  IF v_unit_id IS NOT NULL AND NEW.profile_id IS NOT NULL THEN
    PERFORM compute_unit_progress(NEW.profile_id, v_unit_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS submissions_compute_unit_progress ON submissions;
CREATE TRIGGER submissions_compute_unit_progress
  AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION trigger_compute_unit_progress();
```

If vocab uses a separate progress table (`vocab_progress` perhaps), add a parallel trigger on that too.

**READ/RENDER layer fix:**

In the unit-overview hook + section-card component, adjust to:

```jsx
const isComplete = Boolean(unitProgress?.sections?.[section.type]?.complete);
```

Make sure the hook uses `profile?.id` and `.maybeSingle()` (not `.single()` — a student may not have a row yet for new units).

**RLS fix** (if needed):

```sql
DROP POLICY IF EXISTS "students read own unit_progress" ON unit_progress;
CREATE POLICY "students read own unit_progress" ON unit_progress
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
```

### 2.5 — Backfill

Recompute progress for every student who has submissions:

```javascript
// scripts/audits/section-completion/backfill.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Distinct (profile_id, unit_id) pairs with submissions
  const { data: pairs } = await sb.rpc('list_active_progress_pairs');
  // Or: build the list via SQL via mcp__supabase__execute_sql

  let done = 0, errors = 0;
  for (const { profile_id, unit_id } of pairs) {
    const { error } = await sb.rpc('compute_unit_progress', { p_profile_id: profile_id, p_unit_id: unit_id });
    if (error) { errors++; console.error(error); } else done++;
  }
  console.log(`Backfill complete: ${done} computed, ${errors} errors`);
})();
```

Run it.

### 2.6 — Verify with the probe student

Re-run the SQL from 2.3 for the probe student. The `unit_progress.sections` JSON should now show `complete: true` for sections they actually finished.

Then verify with 5 ADDITIONAL students chosen at random — same pattern. All 6 must show correctly-derived completion.

### 2.7 — All-students sanity check

```sql
-- Are there students with submissions but 0 unit_progress rows?
SELECT s.profile_id, COUNT(DISTINCT a.unit_id) AS units_active
FROM submissions s
JOIN activities a ON a.id = s.activity_id
LEFT JOIN unit_progress up ON up.profile_id = s.profile_id
WHERE up.profile_id IS NULL
GROUP BY s.profile_id;
```

Expected: 0 rows (every active student has at least one `unit_progress` row after backfill).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 3 — Verify + Commit + Push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 3.1 — Self-check

1. ESLint clean on all touched files
2. Pronunciation hidden everywhere (`grep -rn "PronunciationSection\|<Pronunciation" src/ | grep -v PRONUNCIATION-HIDDEN | grep -v "//"` → 0 active references)
3. `docs/PRONUNCIATION-SHELVED.md` exists
4. `compute_unit_progress` function exists and covers all current section types (vocab, reading, listening, grammar, writing, speaking — minus pronunciation)
5. Trigger exists and is enabled
6. RLS on `unit_progress` allows SELECT for own profile
7. Backfill completed
8. Probe student + 5 random students all show correct completion state
9. No active students have 0 `unit_progress` rows

### 3.2 — Final report

`docs/audits/section-completion/FINAL-REPORT.md`:

```markdown
# Pronunciation Hide + Section Completion — Final Report

## Pronunciation
- Surfaces hidden: <list>
- Code files preserved: <list>
- DB rows preserved: N pronunciation activities, N submissions
- Re-enable guide: docs/PRONUNCIATION-SHELVED.md

## Section completion diagnosis
- Layer broken: <COMPUTE | TRIGGER | READ | RLS | UI>
- Root cause: <one-line>

## Fix
- Files changed: <list>
- Migrations applied: <list>
- Section types covered: vocab, reading, listening, grammar, writing, speaking
- Backfilled rows: N
- Probe student verification: PASS
- 5 random students verification: PASS

## Commit SHA: <filled after>
```

### 3.3 — Commit + push

```bash
git add src/ supabase/migrations/ scripts/ docs/

git commit -m "feat: shelve pronunciation section + restore section-completion badges across all skills

PRONUNCIATION SHELVED:
- Hidden from student-facing UI (navigation, tabs, unit overview, routes)
- Code files preserved (not deleted) — marked with PRONUNCIATION-HIDDEN comments
- DB data preserved (activities + submissions intact)
- Re-enable guide: docs/PRONUNCIATION-SHELVED.md

SECTION COMPLETION RESTORED:
- Root cause: <from FINAL-REPORT>
- compute_unit_progress now discovers section types dynamically per unit
  (no hard-coding — automatically handles current types: vocab, reading,
  listening, grammar, writing, speaking)
- Pronunciation section excluded from completion calculation (matches the shelved status)
- Trigger on submissions ensures unit_progress recomputes on every new completion
- RLS verified — students can read their own progress rows
- Backfilled N rows so existing students with prior completions see correct badges now
- Verified against 6 real students (1 probe + 5 random): all show correct completion

NOT TOUCHED:
- No submission rows mutated
- No xp_transactions touched
- No pronunciation data deleted"

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ DELETE pronunciation code or data
- ❌ Mutate `submissions` / `xp_transactions` rows
- ❌ Hard-code the list of section types — discover them from `activities`
- ❌ Verify with only one student
- ❌ Run `vite build` locally
- ❌ Skip the backfill (existing students must see their prior completions)

## ✅ FINISH LINE

- Pronunciation is invisible to students
- Pronunciation code and data preserved + documented
- Section completion badges work for vocab + reading + listening + grammar + writing + speaking
- Backfill complete — existing students see correct state without re-doing work
- Probe + 5 random students all verified
- One commit pushed to `origin/main`
- `docs/audits/section-completion/FINAL-REPORT.md` exists

End of prompt.
