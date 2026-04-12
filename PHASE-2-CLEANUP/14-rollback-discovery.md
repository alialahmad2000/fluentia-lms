# PROMPT 14 — Rollback Discovery Report

**Date:** 2026-04-12
**Status:** HALTED — two blocking issues identified

---

## Commit References

| Label | Hash | Description |
|-------|------|-------------|
| L0_PRE_COMMIT | `162d862` | Last commit before L0 rewrites (fix(vocab): PROMPT 12B) |
| L1_PRE_COMMIT | `1f87f23` | Last commit before L1 rewrites (fix(manifest): Student Work Protection V2) |
| L0 passage rewrites | `92a09a9`..`8627320` | feat(L0-U02..U12): rewrite reading passages |
| L0 question rewrites | `5cf7404`..`7e8ebfa` | fix(L0-U01..U12): rewrite comprehension questions |
| L1 full rewrites | `23412dd`..`28daf55` | L1 U01..U12: rewrite passages + questions |
| Current HEAD | `dec08b3` | chore(L1): finalize reading rewrites |

---

## Current DB Counts

| Level | Passages | Questions | Student Completions |
|-------|----------|-----------|---------------------|
| L0 | 24 | 120 | 0 |
| L1 | 24 | 144 | **18** |
| L2 | 24 | 168 | — |
| L3 | 24 | 192 | — |
| L4 | 24 | 240 | — |
| L5 | 24 | 288 | — |
| **System** | **72 units** | — | — |
| **Vocabulary** | — | **1,954** | — |

---

## Original Content Availability

### Passages (L0 + L1)
**AVAILABLE** — `audit-scripts/data/readings_full.json` at commit `162d862`
- Contains all 144 readings (24 per level × 6 levels)
- Fields: id, level_number, passage_content, passage_word_count, reading_label, title_en, title_ar, unit_id, unit_number, etc.
- L0: 24 passages with original content ✓
- L1: 24 passages with original content ✓

### Questions (L0 + L1)
**NOT AVAILABLE** — Original question content was never dumped to any file in git history.

- The curriculum-generator inserted questions directly into the DB via Supabase API
- No `questions_full.json` or equivalent was ever created
- `_l0_questions_all.json` (created at `5cf7404`) contains only metadata (id, question_type, reading_id, sort_order) — NOT full content (no question_en, question_ar, choices, correct_answer, explanation_en, explanation_ar)
- `13-FIX-new-questions.json` contains the REWRITTEN L0 questions (new content), not originals
- `PHASE-2-CLEANUP/l1-content/u01-u12.json` contain REWRITTEN L1 questions, not originals
- The original question content in the DB was overwritten during Sessions 18 and 19

---

## Blocking Issues

### Issue 1: Original Question Content Not Recoverable
- L0: 120 original questions — content lost (overwritten, never backed up to file)
- L1: 144 original questions — content lost (overwritten, never backed up to file)
- Only passage content is recoverable from `readings_full.json`
- Rollback of questions requires either:
  - (a) Supabase PITR (Point-in-Time Recovery) to restore DB state from before Apr 8
  - (b) Re-generation of questions from original passages (would NOT be the same content)
  - (c) Accept partial rollback (passages only, keeping current rewritten questions)

### Issue 2: L1 Has 18 Student Completions
- 18 completed reading records across 4 students (section_type='reading')
- Dates range from 2026-04-03 to 2026-04-12 (active today)
- Per PROMPT 14 rules: "If it returns > 0, STOP and halt — do not proceed. Ali must be notified."
- These records reference reading_id (UUIDs preserved), so the rows themselves would survive content replacement
- However, students completed readings with the REWRITTEN content — rolling back changes what they read

---

## L1 Student Completion Details

| Student (prefix) | Count | Date Range |
|-------------------|-------|------------|
| e5528ced | 1 | Apr 3 |
| cad66f17 | 4 | Apr 4–11 |
| f9ecb220 | 4 | Apr 4–11 |
| af56ca47 | 5 | Apr 5–12 |
| d1a3b497 | 4 | Apr 5–12 |

All are section_type='reading', scores 50–100.
