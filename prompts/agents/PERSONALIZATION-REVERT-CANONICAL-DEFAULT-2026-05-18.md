# 🔄 PERSONALIZATION REVERT → CANONICAL CURRICULUM AS SINGLE DEFAULT (2026-05-18)

> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/PERSONALIZATION-REVERT-CANONICAL-DEFAULT-2026-05-18.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/PERSONALIZATION-REVERT-CANONICAL-DEFAULT-2026-05-18.md
> ```

---

## 🎯 MISSION

Make the **unified canonical curriculum** the single default for **every student**, across **every skill type** (reading, listening, vocabulary, grammar, writing, speaking, anything else that has skill-specific content). Personalization (reading variants, interest-based content, anything that branches by student interest) is **permanently demoted** to optional secondary content — it MUST NEVER replace, hide, override, or outweigh the canonical content.

This decision is **permanent and product-level**. It is not up for re-architecture, not a feature flag toggle, not an A/B test. Canonical is the default. Period.

### Concrete symptoms to eliminate

1. Two students in the same unit see different reading articles, different listening dialogues, etc.
2. A student reads an article on screen, but the audio player plays a different (canonical) article — text/audio/karaoke mismatch
3. A student who never picked interests has a different experience than a student who did
4. Any UI element implies that the personalized variant is the primary curriculum

### Allowed final state

- Every student sees identical curriculum content by default
- Personalization may remain in the codebase as an **opt-in secondary surface** — a clearly-labelled "محتوى إضافي حسب اهتماماتك" / "Bonus content for your interests" area that the student must explicitly enter. If no such surface exists yet, **hide the personalization UI entirely** for this pass — building the opt-in surface is a separate future task.
- Personalization data (variant tables, interest tags, generated variants) **stays in the database** — no destructive migrations. We only stop consulting it on the default read path.

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`, Frankfurt Pro) via `mcp__supabase__*` tools
- **Branch:** `main`
- **Coordination:** If a LISTENING-VOCAB-FIX or similar prompt is mid-run in another Claude Code tab, **wait for it to complete and push to `origin/main`**, then `git pull --rebase origin main` before starting Phase B. Phase A (read-only) can run in parallel safely.

---

## ⚠️ STRICT RULES

1. **Read path only.** This prompt changes how content is FETCHED. No DB schema changes, no dropped tables, no dropped columns. Variant tables stay intact.
2. **No student data writes.** No `submissions`, `unit_progress`, `vocab_progress`, `xp_transactions`, `student_*` touched.
3. **No personalization UI removed permanently.** Hide it (CSS or early return) — do not delete files. The decision to surface it as opt-in later requires its code to still exist.
4. **Hooks before guards** in any component touched.
5. **`.select()` after every `.update()` / `.upsert()`** (will rarely apply — this prompt is mostly read-path).
6. **`profile?.id` not `user?.id`** for any student-scoped query touched.
7. **No `vite build` locally.** ESLint only for self-check.
8. **Mac shell.** `mv`, `export`, `/Users/dr.ali/Projects/fluentia-lms/`.
9. **Idempotent.** Re-runnable. If a flag/condition is already disabled, leave it.
10. **Verify after every change** that text + audio + karaoke for a given section all resolve to the same canonical row id.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Map every personalization read path
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Inventory personalization-related tables

```sql
-- Find tables related to variants / interests / personalization
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%variant%'
    OR table_name ILIKE '%personali%'
    OR table_name ILIKE '%interest%'
    OR table_name ILIKE '%adaptive%'
    OR table_name ILIKE '%student_curric%')
ORDER BY table_name;

-- For each candidate, get columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (<list from above>)
ORDER BY table_name, ordinal_position;

-- Also: find any columns named *_variant_id, *_personalized, interest_*
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name ILIKE '%variant%'
    OR column_name ILIKE '%personali%'
    OR column_name ILIKE '%interest%');
```

### A.2 — Find all code paths that consult personalization

```bash
# Hooks / queries / utilities that branch on personalization
grep -rn "variant\|Variant\|personali\|interest_tag\|interest_id\|student_interest\|adaptive\|reading_variant\|listening_variant" \
  src/ supabase/functions/ 2>/dev/null | grep -v "test\|\.md:" | head -100

# Direct table reads
grep -rn "from.*reading_variant\|from.*listening_variant\|from.*curriculum_variant\|from.*personalized\|from.*student_curriculum" \
  src/ supabase/functions/ 2>/dev/null | head -50

# Branches in render code (e.g., if hasInterests then variant else canonical)
grep -rn "hasInterests\|userInterests\|profileInterests\|selectedInterests\|interests?.length" \
  src/ 2>/dev/null | head -50
```

For each match, record:
- File + line
- Direction (READ / WRITE / RENDER)
- Effect (e.g., "swaps canonical reading row for variant if student has matching interest")
- Skill type affected (reading / listening / vocab / grammar / writing / speaking / unit-level / dashboard-level)

### A.3 — Find personalization-driving UI

```bash
# Onboarding / setup screens that capture interests
grep -rn "InterestPicker\|InterestSelector\|onboarding.*interest\|choose.*interest\|اهتمامات" src/ 2>/dev/null | head -30

# Toggles / settings that control personalization in-flight
grep -rn "togglePersonalization\|usePersonalized\|personalizationEnabled\|VariantToggle" src/ 2>/dev/null | head -20

# Banner / hero / promotional UI for the personalization feature
grep -rn "Personali\|تخصيص\|محتوى مخصص\|اختر اهتماماتك" src/ 2>/dev/null | head -30
```

### A.4 — Find where text + audio + karaoke diverge

For the reading section specifically (the audio/text mismatch bug):

```bash
# Reading rendering — what data source supplies the text on screen?
grep -rn "ReadingArticle\|ReadingSection\|ReadingPassage\|ReadingTab" src/components src/pages 2>/dev/null | head -20

# Reading audio rendering — what data source supplies audio_url?
grep -rn "reading.*audio_url\|ReadingPlayer\|reading_audio" src/ 2>/dev/null | head -20

# Karaoke / word-timing rendering
grep -rn "karaoke\|word_timings\|wordTimings\|highlight.*word\|currentWordIndex" src/ 2>/dev/null | head -30
```

For one specific reading section that's known to be broken (Phase B will pick a real example), trace:
- Where does the TEXT come from? (table + row id)
- Where does the AUDIO URL come from? (table + row id)
- Where do the KARAOKE TIMINGS come from? (table + row id)

If any two of these resolve to different `id`s for the same logical "reading section" → that is the mismatch bug, and the personalization read path is the cause.

### A.5 — Phase A report

Write `docs/audits/personalization-revert/PHASE-A-REPORT.md`:

```markdown
# Phase A — Personalization Read Path Inventory

## Tables involved
| Table | Role | Status |
|-------|------|--------|
| curriculum_reading | canonical reading rows | KEEP-AS-PRIMARY |
| reading_variants (or actual name) | personalized variants | KEEP-IN-DB, STOP-READING |
| ... | ... | ... |

## Read paths to flatten
| File:line | Skill | Current logic | New logic |
|-----------|-------|---------------|-----------|
| src/hooks/useReading.js:42 | reading | "if interests → variant, else canonical" | "always canonical" |
| ... | ... | ... | ... |

## UI to hide
| File | What it is | Action |
|------|-----------|--------|
| src/components/InterestPicker.jsx | onboarding interest picker | hide from onboarding flow, keep file |
| ... | ... | ... |

## Text/audio/karaoke divergence sample
| Reading section (canonical id) | Text source | Audio source | Karaoke source | Diverged? |
| ... | ... | ... | ... | ... |

## Diagnosis
Personalization branches at these N entry points: <list of entry points>.
After Phase B, all N must resolve to canonical regardless of student interest state.
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Flatten every read path to canonical
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each entry point identified in Phase A:

### B.1 — Hook / query level (preferred — single point of fix)

If a hook like `useReading(unitId)` branches:

```javascript
// BEFORE
const useReading = (unitId) => {
  const interests = useInterests();
  if (interests.length > 0) {
    // fetch from reading_variants matching interest
    ...
  }
  // else fetch from curriculum_reading
  ...
};

// AFTER
const useReading = (unitId) => {
  // CANONICAL ONLY — personalization reverted 2026-05-18.
  // See docs/audits/personalization-revert/PHASE-A-REPORT.md
  const { data, error } = useQuery({
    queryKey: ['reading', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_reading')
        .select('...')  // preserve existing select columns
        .eq('unit_id', unitId)
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });
  return { data, error };
};
```

The branch is removed entirely. No conditional. No "if personalization enabled". Just canonical.

### B.2 — Component level (only if hook-level isn't feasible)

If a component itself reads from variants:

```jsx
// BEFORE
const article = student.hasInterests ? variant : canonical;

// AFTER
const article = canonical;
```

Remove the unused branch. Do NOT leave `variant` floating as dead code — delete the variable, the fetch, and the import.

### B.3 — Edge function level

If any edge function (e.g., one that generates audio for personalized content, or selects passages for a session) consults interests/variants:

```bash
ls supabase/functions/
grep -rn "variant\|interest" supabase/functions/ 2>/dev/null
```

Audit each. Either:
- Edge function is deprecated → remove its callers in `src/`, leave the function deployed (no destructive ops)
- Edge function is canonical-aware → flatten its branch the same way as B.1

### B.4 — Apply EVERY entry point Phase A found

Track each fix in the Phase A report by adding a "Fixed in" column. Every row must have a commit reference or "no change needed" note.

### B.5 — Idempotency

Re-read each modified file: if a personalization branch already disabled in a previous run, leave it. The goal is "no read path consults personalization", not "every read path was modified by this run".

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Hide personalization UI from the default flow
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Onboarding interest picker

If onboarding currently asks students to pick interests:

```jsx
// In the onboarding flow component
// SKIP the interest-picker step. Component file stays — just don't route to it.
```

Find the onboarding step list (likely an array of steps) and remove the interest-picker step from it. Do NOT delete the InterestPicker component file.

### C.2 — In-flight personalization toggles

Anywhere there's a "personalize my curriculum" button, banner, modal, or settings toggle that's visible by default:

```jsx
// Wrap in an early return or feature flag
return null;  // PERSONALIZATION_UI_HIDDEN_2026-05-18
```

OR — preferred — comment out the import in its parent and leave a TODO:

```jsx
// import PersonalizationToggle from './PersonalizationToggle';
// PERSONALIZATION-REVERT 2026-05-18: hidden from default flow.
// To re-introduce as opt-in secondary surface later: see docs/audits/personalization-revert/.
```

### C.3 — Banners / promotional UI

Same approach. Hide the surface, keep the file.

### C.4 — Settings screen entries

If there's a "Curriculum settings" or "Preferences" page with a personalization section, hide that section. Other settings unaffected.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Verify text + audio + karaoke all resolve to canonical
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Pick 5 random reading sections + 5 random listening sections

```sql
SELECT id, unit_id, title_ar FROM curriculum_reading ORDER BY RANDOM() LIMIT 5;
SELECT id, unit_id, title_ar FROM curriculum_listening ORDER BY RANDOM() LIMIT 5;
```

### D.2 — For each, trace what the new (post-Phase B) read path returns

Write a small Node script `scripts/audits/verify-canonical-only.cjs` that:
1. Connects with two simulated student profiles: one with zero interests, one with multiple interests
2. For each of the 10 sample sections, invokes the same data-loading path the app uses (call the hook's query function directly, or replicate its query)
3. Asserts: same `reading.id` / `listening.id` returned regardless of which student is reading
4. Asserts: `audio_url`, `transcript`, `word_timings` (if present) all reference the same row
5. Prints a pass/fail table

```bash
node scripts/audits/verify-canonical-only.cjs
```

### D.3 — Spot-check the audio/text mismatch is gone

For one reading section, confirm:
- Text rendered to the screen comes from `curriculum_reading.body_ar` (or whatever the canonical text column is)
- Audio player's `audio_url` points to a file generated from THAT SAME text (audit `audio_path` or a transcript field if present)
- Karaoke `word_timings` were computed against THAT SAME text

If any of the three references a different `curriculum_reading.id` → the revert is incomplete. Loop back to Phase A and find the missing entry point.

### D.4 — Sanity: no student data damage

```sql
-- Confirm row counts on student data tables unchanged
SELECT COUNT(*) FROM submissions;
SELECT COUNT(*) FROM unit_progress;
SELECT COUNT(*) FROM vocab_progress;
SELECT COUNT(*) FROM xp_transactions;
```

Compare to known-good baseline if available. These should match pre-run numbers exactly (this prompt does no writes to those tables).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Self-check + commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### E.1 — Self-check assertions

1. `grep -rn "from.*reading_variant\|from.*listening_variant\|from.*curriculum_variant" src/` → **ZERO matches** (no read paths still query variant tables)
2. `grep -rn "hasInterests\|userInterests.*length\|interests?.length" src/` → either zero matches OR every match is in dead code that's never invoked (verify by tracing imports)
3. `node scripts/audits/verify-canonical-only.cjs` → PASS for all 10 samples
4. `npx eslint src/ --max-warnings=0` → clean
5. No DB migration applied during this run (`mcp__supabase__list_migrations` shows no new migration)
6. `git status` shows changes only in `src/`, `docs/`, `scripts/audits/` — NOT in `supabase/migrations/`

### E.2 — Final report

Write `docs/audits/personalization-revert/FINAL-REPORT.md`:

```markdown
# Personalization Revert — Final Report (2026-05-18)

## Entry points flattened
<from Phase A table with all "Fixed in" populated>

## UI hidden
<from Phase C — list of components / banners / toggles that are no longer rendered>

## Verification
- verify-canonical-only.cjs: 10/10 PASS
- Audio/text/karaoke divergence: ELIMINATED for sample
- Student data tables: untouched

## What still exists (intentionally)
- All variant tables in DB — NOT dropped
- All personalization component files — NOT deleted
- Edge functions related to personalization — NOT undeployed
- Interest tags on student profiles — NOT cleared

These are preserved so a future "opt-in personalization as secondary surface" feature can reuse them.

## Follow-ups
- Build opt-in secondary surface for personalization (separate task)
- Decide UX for "explore content matching your interests" entry point
```

### E.3 — Commit + push

```bash
git add src/ docs/audits/personalization-revert/ scripts/audits/

git commit -m "refactor(curriculum): revert personalization, canonical curriculum is the single default

PRODUCT DECISION (permanent):
Every student sees the same canonical curriculum across all skill types
(reading, listening, vocab, grammar, etc.). Personalization is demoted
to optional secondary content and is hidden from the default flow.

WHAT CHANGED:
- Read paths flattened — N hooks/queries/components no longer branch on
  student interests. Canonical curriculum_* tables are the single source.
- Personalization UI hidden — onboarding interest picker, in-flight
  toggles, banners. Files NOT deleted (will be reused for the future
  opt-in secondary surface).

WHAT DID NOT CHANGE:
- No DB schema changes, no migrations applied.
- Variant tables, interest tags, and personalization edge functions
  remain in place for future use.
- No student data tables touched (submissions, unit_progress,
  vocab_progress, xp_transactions).

DOWNSTREAM EFFECT:
- Reading section audio/text/karaoke mismatch is eliminated — all three
  now resolve to the same canonical row.
- Two students in the same unit now see the same content."

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ Drop, alter, or rename any variant / interest / personalization table
- ❌ Delete the InterestPicker, PersonalizationToggle, or related component files
- ❌ Apply any DB migration
- ❌ Touch student data tables
- ❌ Clear interest tags from existing student profiles
- ❌ Disable / undeploy any edge function
- ❌ Run `vite build` locally

## ✅ FINISH LINE

- 10/10 verify-canonical-only samples PASS
- All personalization UI is hidden from the default student flow
- One commit pushed to `origin/main`
- `docs/audits/personalization-revert/FINAL-REPORT.md` exists and is pushed

End of prompt.
