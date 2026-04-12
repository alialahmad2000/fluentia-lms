# PROMPT 14 — SAFE ROLLBACK: L0 + L1 Reading Passages & Comprehension Questions

## 🎯 Goal
Restore L0 and L1 **reading passages** and **comprehension questions** to their state **before** the Session 18/19 rewrites, using the safest possible method (content restoration from old commits, NOT git revert).

**What we rollback:**
- ✅ `curriculum_readings` for L0 + L1 (48 passages: 24 L0 + 24 L1)
- ✅ `curriculum_comprehension_questions` for L0 + L1 (264 questions: 120 L0 + 144 L1)

**What we KEEP (do NOT touch):**
- ✅ Vocabulary fixes from PROMPT 12B (1,954 entries, UNIQUE constraint) — KEEP
- ✅ Student Work Protection infrastructure — KEEP
- ✅ Writing / Speaking content — NEVER TOUCH (different tables anyway)
- ✅ All L2, L3, L4, L5 content — UNTOUCHED
- ✅ `xp_transactions`, `student_curriculum_progress`, all student submissions — UNTOUCHED

---

## 📍 Working Directory
`C:\Users\Dr. Ali\Desktop\fluentia-lms`

---

## ⛔ Critical Rules

1. **NO `git revert`, NO `git reset`.** We restore content only — git history stays intact.
2. **Discovery FIRST.** Verify actual table names, column names, commit hashes before ANY write.
3. **Atomic per-level commits.** L0 rollback = 1 commit. L1 rollback = 1 commit.
4. **Verify checksums BEFORE and AFTER.** Row counts must match expected values exactly.
5. **Zero data loss for students.** Current completions in `student_curriculum_progress` must remain unchanged in count.
6. **If ANY check fails → STOP, do not proceed to next phase.**
7. **DO NOT run `vite build` or `npm run build`** — Vercel handles builds.
8. **Migrations via `npx supabase db push --linked` only.**

---

## 📋 Phases

### Phase 0 — Discovery (READ-ONLY)

Verify current state:

```bash
# 1. Confirm current HEAD and relevant commits
git log --oneline -30

# 2. Locate the LAST commit BEFORE L0 rewrite (Session 18)
#    Look for commits just before vocabulary/reading rewrites started.
#    Expected markers: commits around PROMPT 12B completion (before 162d862? verify)

# 3. Locate the LAST commit BEFORE L1 rewrite
#    Expected: the commit immediately before 86f4769 (L0 final) or the L1-FIX commits

# 4. Identify seed/migration files that seeded original L0 + L1 content
find supabase/migrations -type f | xargs grep -l "curriculum_readings" 2>/dev/null
find supabase/seeds -type f 2>/dev/null
find PHASE-2-CLEANUP -name "*.md" | head -20
```

**Query DB for current state (read-only):**

```sql
-- Current counts
SELECT 
  l.level_number,
  COUNT(DISTINCT r.id) AS passages,
  COUNT(DISTINCT q.id) AS questions
FROM curriculum_levels l
LEFT JOIN curriculum_units u ON u.level_id = l.id
LEFT JOIN curriculum_readings r ON r.unit_id = u.id
LEFT JOIN curriculum_comprehension_questions q ON q.reading_id = r.id
WHERE l.level_number IN (0, 1)
GROUP BY l.level_number
ORDER BY l.level_number;

-- Expected: L0 = 24 passages, 120 questions | L1 = 24 passages, 144 questions

-- Check student completions (for safety awareness)
SELECT 
  COUNT(*) AS completed_comprehension_for_l0_l1
FROM student_curriculum_progress scp
JOIN curriculum_readings r ON r.id = scp.reading_id
JOIN curriculum_units u ON u.id = r.unit_id
JOIN curriculum_levels l ON l.id = u.level_id
WHERE l.level_number IN (0, 1) AND scp.status = 'completed';
```

**Document findings in:** `PHASE-2-CLEANUP/14-rollback-discovery.md`

Include:
- Exact commit hash BEFORE L0 rewrite (call it `L0_PRE_COMMIT`)
- Exact commit hash BEFORE L1 rewrite (call it `L1_PRE_COMMIT`)
- Current DB counts
- Student completions count (should be 0 per Session 19 report — confirm)
- The EXACT file paths where original L0 + L1 content lives

**STOP here and print a summary before proceeding.** If student completions > 0, halt and request confirmation.

---

### Phase 1 — Extract Original Content

Use `git show` to extract original content from pre-rewrite commits — DO NOT checkout, DO NOT modify working tree.

```bash
# Create a staging directory for extracted content
mkdir -p PHASE-2-CLEANUP/rollback-staging/L0
mkdir -p PHASE-2-CLEANUP/rollback-staging/L1

# Extract L0 originals (replace <L0_PRE_COMMIT> with hash from Phase 0)
git show <L0_PRE_COMMIT>:<path-to-L0-seed-file> > PHASE-2-CLEANUP/rollback-staging/L0/original-readings.sql
# (repeat for each relevant file — seeds, migrations, whatever seeded original L0)

# Extract L1 originals (replace <L1_PRE_COMMIT>)
git show <L1_PRE_COMMIT>:<path-to-L1-seed-file> > PHASE-2-CLEANUP/rollback-staging/L1/original-readings.sql
```

**If original content is not in seed files** (i.e. it was inserted via ad-hoc prompts with inline SQL), search prompt files:

```bash
git show <L0_PRE_COMMIT> -- 'prompts/agents/*.md' | head -200
# Find the prompt files that contained the original L0 INSERT statements
```

**Extract and verify:**
- 24 L0 passages with original content
- 120 L0 comprehension questions
- 24 L1 passages with original content
- 144 L1 comprehension questions

Save verified extracts as JSON:
- `PHASE-2-CLEANUP/rollback-staging/L0/passages.json`
- `PHASE-2-CLEANUP/rollback-staging/L0/questions.json`
- `PHASE-2-CLEANUP/rollback-staging/L1/passages.json`
- `PHASE-2-CLEANUP/rollback-staging/L1/questions.json`

Each JSON record must include: `unit_number`, `sub_unit` (A/B), `title`, `content`, `word_count`, original FKGL, and all question fields (stem, options, correct_answer, question_type).

**Print count verification:** Must match expected (24/120 for L0, 24/144 for L1) or STOP.

---

### Phase 2 — Build Rollback Migration (L0 first)

Create migration file:
`supabase/migrations/<timestamp>_rollback_L0_content.sql`

Migration structure (atomic, wrapped in transaction):

```sql
BEGIN;

-- Step 1: Capture current state for audit trail
CREATE TABLE IF NOT EXISTS _rollback_audit_L0 AS
SELECT 
  r.*, 
  NOW() AS snapshot_at,
  'pre-rollback-L0-session-19-content' AS snapshot_label
FROM curriculum_readings r
JOIN curriculum_units u ON u.id = r.unit_id
JOIN curriculum_levels l ON l.id = u.level_id
WHERE l.level_number = 0;

CREATE TABLE IF NOT EXISTS _rollback_audit_L0_questions AS
SELECT 
  q.*,
  NOW() AS snapshot_at,
  'pre-rollback-L0-session-19-content' AS snapshot_label
FROM curriculum_comprehension_questions q
JOIN curriculum_readings r ON r.id = q.reading_id
JOIN curriculum_units u ON u.id = r.unit_id
JOIN curriculum_levels l ON l.id = u.level_id
WHERE l.level_number = 0;

-- Step 2: Delete questions FIRST (FK dependency), then passages
DELETE FROM curriculum_comprehension_questions
WHERE reading_id IN (
  SELECT r.id FROM curriculum_readings r
  JOIN curriculum_units u ON u.id = r.unit_id
  JOIN curriculum_levels l ON l.id = u.level_id
  WHERE l.level_number = 0
);

-- Rowcount assertion (Rule 16): expect exactly 120 rows deleted
DO $$
DECLARE deleted_count INT;
BEGIN
  SELECT COUNT(*) INTO deleted_count FROM _rollback_audit_L0_questions;
  IF deleted_count <> 120 THEN
    RAISE EXCEPTION 'L0 questions rollback: expected 120 pre-rollback rows, got %', deleted_count;
  END IF;
END $$;

DELETE FROM curriculum_readings
WHERE unit_id IN (
  SELECT u.id FROM curriculum_units u
  JOIN curriculum_levels l ON l.id = u.level_id
  WHERE l.level_number = 0
);

-- Step 3: Re-insert original L0 readings (from extracted JSON, rendered as INSERT statements)
-- [INSERT statements generated from PHASE-2-CLEANUP/rollback-staging/L0/passages.json]
-- Keep original UUIDs where possible to preserve any FK references

-- Step 4: Re-insert original L0 comprehension questions
-- [INSERT statements generated from PHASE-2-CLEANUP/rollback-staging/L0/questions.json]

-- Step 5: Final verification within transaction
DO $$
DECLARE 
  passage_count INT;
  question_count INT;
BEGIN
  SELECT COUNT(*) INTO passage_count 
  FROM curriculum_readings r
  JOIN curriculum_units u ON u.id = r.unit_id
  JOIN curriculum_levels l ON l.id = u.level_id
  WHERE l.level_number = 0;
  
  SELECT COUNT(*) INTO question_count
  FROM curriculum_comprehension_questions q
  JOIN curriculum_readings r ON r.id = q.reading_id
  JOIN curriculum_units u ON u.id = r.unit_id
  JOIN curriculum_levels l ON l.id = u.level_id
  WHERE l.level_number = 0;
  
  IF passage_count <> 24 THEN
    RAISE EXCEPTION 'L0 rollback FAILED: expected 24 passages, got %', passage_count;
  END IF;
  
  IF question_count <> 120 THEN
    RAISE EXCEPTION 'L0 rollback FAILED: expected 120 questions, got %', question_count;
  END IF;
  
  RAISE NOTICE 'L0 rollback verified: % passages, % questions', passage_count, question_count;
END $$;

COMMIT;
```

Apply:
```bash
npx supabase db push --linked
```

If migration fails → it auto-rolls back (inside BEGIN/COMMIT). Investigate and fix. Do NOT proceed to L1 until L0 is verified.

**Post-migration verification:**
```sql
-- Must return: 24, 120
SELECT 
  (SELECT COUNT(*) FROM curriculum_readings r
   JOIN curriculum_units u ON u.id = r.unit_id
   JOIN curriculum_levels l ON l.id = u.level_id
   WHERE l.level_number = 0) AS passages,
  (SELECT COUNT(*) FROM curriculum_comprehension_questions q
   JOIN curriculum_readings r ON r.id = q.reading_id
   JOIN curriculum_units u ON u.id = r.unit_id
   JOIN curriculum_levels l ON l.id = u.level_id
   WHERE l.level_number = 0) AS questions;
```

**Commit L0 rollback:**
```bash
git add supabase/migrations/ PHASE-2-CLEANUP/
git commit -m "rollback: restore L0 readings + comprehension questions to pre-Session-18 state

- Preserves vocab fixes (1,954 entries)
- Preserves student protection infrastructure
- Audit snapshots saved in _rollback_audit_L0* tables
- Verified: 24 passages, 120 questions restored"
git push origin main

# Verify push success
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
# Both must match
```

---

### Phase 3 — L1 Rollback (same pattern)

Repeat Phase 2 for L1:
- Migration file: `<timestamp>_rollback_L1_content.sql`
- Expected counts: 24 passages, 144 questions
- Audit tables: `_rollback_audit_L1`, `_rollback_audit_L1_questions`
- Rowcount assertion: 144 questions pre-rollback
- Final assertion: 24 passages + 144 questions post-rollback

**⚠️ Before applying L1 migration — Student Protection check:**
```sql
SELECT COUNT(*) FROM student_curriculum_progress scp
JOIN curriculum_readings r ON r.id = scp.reading_id
JOIN curriculum_units u ON u.id = r.unit_id
JOIN curriculum_levels l ON l.id = u.level_id
WHERE l.level_number = 1 AND scp.status = 'completed';
```

Per Session 19 report, this should return 0. If it returns > 0, **STOP** and halt — do not proceed. Ali must be notified before any L1 write.

**Commit L1 rollback:**
```bash
git add supabase/migrations/ PHASE-2-CLEANUP/
git commit -m "rollback: restore L1 readings + comprehension questions to pre-86f4769 state

- Preserves vocab fixes + student protection
- Audit snapshots in _rollback_audit_L1* tables
- Verified: 24 passages, 144 questions restored"
git push origin main

git fetch origin && git log --oneline -1 HEAD && git log --oneline -1 origin/main
```

---

### Phase 4 — Final Report

Create `PHASE-2-CLEANUP/14-rollback-final-report.md` containing:

1. Pre-rollback state (counts + commit references)
2. Post-rollback state (counts verified)
3. Audit table names + row counts (for future reference if anything needs recovery)
4. Student completions untouched: confirmed 0 affected
5. Vocabulary untouched: 1,954 entries confirmed
6. Student Protection infrastructure: intact
7. L2/L3/L4/L5: untouched (confirm counts unchanged)
8. Final commit hashes for L0 and L1 rollbacks
9. A section titled "What's next" — notes that V2 parallel infrastructure (PROMPT 15) is the next step, and that V2 will be built in `_v2` suffixed tables entirely separate from production

---

## ✅ Success Criteria (All Must Pass)

- [ ] Phase 0 discovery document created, commit hashes identified
- [ ] Original L0 content extracted, 24 passages + 120 questions verified
- [ ] Original L1 content extracted, 24 passages + 144 questions verified
- [ ] L0 rollback migration applied, DB counts match (24 / 120)
- [ ] L0 rollback committed + pushed, push verified via `git fetch`
- [ ] L1 rollback migration applied, DB counts match (24 / 144)
- [ ] L1 rollback committed + pushed, push verified
- [ ] Vocabulary count unchanged: 1,954
- [ ] L2/L3/L4/L5 counts unchanged (document before/after)
- [ ] Student completions count unchanged
- [ ] Final report at `PHASE-2-CLEANUP/14-rollback-final-report.md`
- [ ] Audit snapshot tables exist: `_rollback_audit_L0`, `_rollback_audit_L0_questions`, `_rollback_audit_L1`, `_rollback_audit_L1_questions`

---

## 🚫 If Anything Fails

- Migrations are transactional — failure = automatic DB rollback
- If extraction in Phase 1 returns wrong counts → STOP, investigate which commit truly has originals, do not guess
- If student completions > 0 at any point → STOP, notify Ali
- Do NOT force, do NOT skip assertions, do NOT proceed to next level if current level failed

---

## 📝 Command to Run

Paste into Claude Code terminal:

```
Read and execute prompts/agents/PROMPT-14-ROLLBACK-L0-L1.md. Start with Phase 0 discovery (read-only) and print the summary before proceeding. Do not skip any assertion. Commit atomically per level.
```
