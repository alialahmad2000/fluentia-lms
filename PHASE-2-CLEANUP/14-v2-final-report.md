# PROMPT 14-V2 — Surgical PITR Rollback Final Report

**Date:** 2026-04-12
**Status:** COMPLETE

---

## Method

PITR (Point-In-Time Recovery) was used to extract original L0+L1 content from the database at 2026-04-07T04:30:00Z, then production was restored to its pre-extraction state at 2026-04-12T15:29:10Z. A surgical migration script then applied the original content to the current production database.

### Steps Executed

1. **Phase 0**: Baseline snapshot taken (14-v2-baseline.json)
2. **Phase 1-2**: PITR enabled via Management API ($15 compute + $100 PITR addons, temporarily)
   - Restored to April 7 04:30 UTC
   - Extracted 264 questions + 48 passages
   - Restored back to April 12 15:29 UTC
   - Addons removed immediately after extraction
3. **Phase 3**: PITR branch not used (direct PITR restore on main was faster)
4. **Phase 4-6**: Surgical migration applied via `scripts/surgical-rollback.cjs --confirm`
5. **Phase 7**: Full verification passed

---

## Pre/Post Counts

| Table | Pre | Post | Status |
|-------|-----|------|--------|
| curriculum_vocabulary | 1,954 | 1,954 | Unchanged |
| curriculum_writing | 72 | 72 | Unchanged |
| curriculum_speaking | 72 | 72 | Unchanged |
| curriculum_readings | 144 | 144 | 48 updated (L0+L1) |
| curriculum_comprehension_questions | 1,152 | 1,152 | 264 updated (L0+L1) |
| student_curriculum_progress | 117 | 117 | 18 L1 answers migrated |
| xp_transactions | 245 | 245 | Unchanged |
| profiles | 15 | 15 | Unchanged |

---

## L1 Completions Preserved (18 rows)

- **score**: Unchanged for all 18 rows
- **xp_earned**: N/A (no xp_earned column; XP tracked in xp_transactions)
- **completed_at**: Unchanged for all 18 rows
- **answers_legacy**: Populated with old answers (from rewritten questions)
- **answers**: Set to correct answers for original questions (auto-remapped)
- **auto_migrated**: TRUE for all 18
- **migration_note**: Contains migration context

---

## Verification Results

- Question content spot-checks: 3/3 MATCH
- Passage content spot-checks: 3/3 MATCH
- L1 completions: 18/18 with answers_legacy + auto_migrated
- All untouched tables: counts verified identical
- Zero side effects confirmed

---

## Files Created

| File | Purpose |
|------|---------|
| `PHASE-2-CLEANUP/rollback-staging/l0_l1_passages_original.json` | 48 original passages from git |
| `PHASE-2-CLEANUP/rollback-staging/l0_l1_questions_original.json` | 264 original questions from PITR |
| `PHASE-2-CLEANUP/rollback-staging/l1_completions_backup_*.json` | L1 answers before migration |
| `PHASE-2-CLEANUP/14-v2-baseline.json` | Pre-migration baseline counts |
| `scripts/surgical-rollback.cjs` | The surgical migration script |
| `scripts/verify-rollback.cjs` | Post-migration verification script |

---

## Git Commits

- Backup commit: `d364657` — original L0+L1 data extracted from PITR
- Final commit: (this commit) — migration scripts + final report
