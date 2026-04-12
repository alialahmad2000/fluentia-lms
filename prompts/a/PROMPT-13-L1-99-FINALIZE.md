# PROMPT 13 — L1 FINALIZE

## Mission
Final verification for L1 reading passage + question rewrites. Confirms all 12 units processed, quality targets met, student work protected, and updates the audit baseline.

## Prerequisite
All 12 L1 unit files (U01-U12) must be processed. Verify:
```bash
grep -c "^\[L1-U" PHASE-2-CLEANUP/13-L1-progress.log
# Expected: 12
```

If less than 12, **STOP** and report missing units.

---

## Phase A — Level-Wide Database Verification

```sql
-- L1 still has 12 units
SELECT COUNT(*) FROM curriculum_units WHERE level_id = $L1_ID;
-- Expected: 12

-- All L1 passages still exist
SELECT COUNT(*) FROM curriculum_readings
WHERE unit_id IN (SELECT id FROM curriculum_units WHERE level_id = $L1_ID);
-- Expected: 24

-- All L1 questions still exist
SELECT COUNT(*) FROM curriculum_comprehension_questions
WHERE reading_id IN (
  SELECT id FROM curriculum_readings
  WHERE unit_id IN (SELECT id FROM curriculum_units WHERE level_id = $L1_ID)
);
-- Expected: 144 (or baseline from Phase 0)

-- System-wide unit count
SELECT COUNT(*) FROM curriculum_units;
-- Expected: 72

-- Vocabulary untouched
SELECT COUNT(*) FROM curriculum_vocabulary;
-- Should match post-PROMPT-12B count (1954)
```

---

## Phase B — Quality Re-Analysis

For all 24 L1 passages, calculate word_count, FKGL, avg_sentence_length, out_of_vocab_count.

Build table and save to `PHASE-2-CLEANUP/13-L1-final-report.md`:

```
| Unit | Part | Word Count | FKGL | Avg Sent | OOV | Status |
|------|------|------------|------|----------|-----|--------|
```

---

## Phase C — Student Work Protection Audit

```sql
-- Count total student comprehension records on L1
SELECT COUNT(*) AS total,
       COUNT(DISTINCT student_id) AS students
FROM student_curriculum_progress
WHERE reading_id IN (
  SELECT id FROM curriculum_readings
  WHERE unit_id IN (SELECT id FROM curriculum_units WHERE level_id = $L1_ID)
)
AND section_type = 'comprehension'
AND status = 'completed';

-- How many were auto-completed today (by our protection logic)
SELECT COUNT(*) FROM student_curriculum_progress
WHERE reading_id IN (
  SELECT id FROM curriculum_readings
  WHERE unit_id IN (SELECT id FROM curriculum_units WHERE level_id = $L1_ID)
)
AND section_type = 'comprehension'
AND status = 'completed'
AND updated_at >= CURRENT_DATE;
```

Log results. If any student records were protected, verify their answers JSONB is non-null and non-empty.

---

## Phase D — Pass Rate

```
Total passages: 24
Passing all targets: <N>
Pass rate: <N>%
```

If pass rate < 90%, recommend follow-up. Proceed to Phase E regardless.

---

## Phase E — Update Audit Baseline

Edit `CURRICULUM-QUALITY-AUDIT-REPORT.md`, add section:

```markdown
## Session 19 — PROMPT 13 L1 Reading Rewrites

**Date:** <today>
**Scope:** 24 reading passages + 144 comprehension questions in L1 (A1)

### Before
- Average word count: <baseline>
- Passages out of FKGL range: <baseline>

### After
- Average word count: <new>
- Passages out of FKGL range: <new>
- Pass rate: <N>/24 (<N>%)
- Vocabulary compliance: 100% (L0+L1 pure)

### Student Work Protection
- Total student records checked: <N>
- Records auto-completed: <N>
- Students affected: <N>
- Writing/speaking submissions: untouched ✓

### Rules Applied
- Rule 3: Reading passage length ✓
- Rule 4: Reading FKGL ✓
- Rule 12: Discovery first ✓
- Rule 13: Student work protection ✓
- Rule 14: Atomic per-unit commits ✓
- Rule 16: Rowcount assertions ✓
```

---

## Phase F — Final Commit

```bash
git add -A
git commit -m "chore(L1): finalize reading rewrites + update audit baseline

- All 12 L1 units processed
- 24 passages analyzed, <N> rewritten
- 144 questions verified
- Student records protected: <N>
- Pass rate: <N>/24
- L0+L1 vocab compliance: 100%
- Audit baseline updated

Refs: PROMPT 13 L1 FINALIZE"

git push origin main

git fetch origin
LOCAL=$(git log --oneline -1 HEAD)
REMOTE=$(git log --oneline -1 origin/main)
[ "$LOCAL" = "$REMOTE" ] || { echo "PUSH FAILED"; exit 1; }
echo "✓ L1 batch complete"
```

---

## Output to Ali

```
========================================
PROMPT 13 — L1 BATCH COMPLETE
========================================

UNITS PROCESSED: 12/12
PASSAGES ANALYZED: 24
PASSAGES REWRITTEN: <N>
PASSAGES SKIPPED: <N>
PASSAGES FAILED: <N>
QUESTIONS UPDATED: <N>/144

STUDENT WORK PROTECTION:
- Records checked: <N>
- Records auto-completed: <N>
- Students affected: <N>
- Writing/speaking: untouched ✓

PASS RATE: <N>/24 (<N>%)

QUALITY METRICS:
- Avg word count: <N> (target 120-200)
- Avg FKGL: <N> (target 2.0-4.0)
- Avg sentence length: <N> (target 8-12)
- Vocabulary compliance: 100%

COMMITS: 13 (12 unit + 1 finalize)
ALL PUSHES VERIFIED: ✓

NEXT: PROMPT 13 L2 batch
========================================
```

---

## ⛔ DO NOT
- Do NOT proceed if any unit was skipped without explanation
- Do NOT skip student protection audit (Phase C)
- Do NOT touch non-L1 content
