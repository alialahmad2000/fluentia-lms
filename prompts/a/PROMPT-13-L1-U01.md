# PROMPT 13 — L1 Unit 1

## Prerequisite
You must have already read:
1. `prompts/agents/PROMPT-13-MANIFEST-V2.md` (master rules)
2. `PROMPT-13-L1-00-WRAPPER.md` (L1-specific config)
3. Completed **Phase 0 discovery** (cached schema, L1 level ID, unit list, L0+L1 vocab allowlist, student completions baseline)

If not, **STOP and read the WRAPPER first**.

## This Unit
- **Level:** L1 (A1)
- **Unit number:** 1
- **Position in cached unit list:** index 0 (zero-indexed)
- **Student Work Protection:** ACTIVE

Pull the unit ID from your cached list:
```
unit_id = cached_L1_units[1-1].id
unit_title = cached_L1_units[1-1].title_en
```

## Workflow
Apply **Phases A → H** from MANIFEST V2 to this single unit.

### Critical Reminders for L1
- **Phase A.5 is MANDATORY** — check student_curriculum_progress for comprehension completions on this unit's passages BEFORE any modification
- Process **Reading A first**, then **Reading B**
- Each passage analyzed independently
- Use **L0 + L1 combined vocabulary allowlist** (not just L1)
- L1 targets: word count 120-200, FKGL 2.0-4.0, avg sentence length 8-12
- Questions per passage: **6** (verify against Phase 0 baseline)
- Rowcount assertions on every UPDATE (Rule 16)

### If Student Work Protection Triggers
- Log: `[PROTECTION] L1-U1: <N> student records found`
- After rewriting questions in Phase E, build new correct `answers` JSONB
- Update student_curriculum_progress inside Phase F transaction
- Preserve score, completed_at, time_spent_seconds, status
- Verify count matches in Phase G

## Commit Message Template
```
feat(L1-U1): rewrite reading passages + questions to meet A1 targets

- Unit: <unit_title>
- Reading A: <action> (wc=<N>, fkgl=<F>)
- Reading B: <action> (wc=<N>, fkgl=<F>)
- Questions updated: <N>
- Student records protected: <N>
- L0+L1 vocab compliance: 100%

Refs: PROMPT 13 L1 Unit 1
```

## After Successful Commit + Push Verification
Read the next file: **`PROMPT-13-L1-U02.md`**

## Failure Handling
- If Phase A returns 0 passages → log "L1-U1: NO PASSAGES FOUND", proceed to next file
- If a passage fails 3 rewrite attempts → log to `13-L1-failures.log`, skip, continue
- If student protection verification fails (count mismatch) → **STOP ENTIRELY** and report
- If git push fails → STOP and report
- If any UPDATE returns rowcount 0 when rows expected → ROLLBACK passage, log `[ROWCOUNT FAIL]`, continue

## ⛔ DO NOT
- Do NOT touch any other unit
- Do NOT skip Phase A.5 (student protection)
- Do NOT skip Phase B re-analysis after rewriting
- Do NOT proceed to PROMPT-13-L1-U02.md without successful commit + push verification
- Do NOT modify writing or speaking submissions (they use separate FKs)
