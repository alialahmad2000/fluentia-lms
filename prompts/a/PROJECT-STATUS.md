# FLUENTIA LMS — PROJECT STATUS
# Last updated: April 12, 2026 (End of Session 19 — FINAL)
# ⚠️ Replace this file in Project Knowledge after every chat session

---

## WHAT IS THIS

Ali is building Fluentia LMS — a premium Arabic-first Learning Management System for his English language academy in Saudi Arabia.

**Session 19 (April 8-12, 2026)** — Massive multi-day session. Complete achievements:
1. **PROMPT 12B** ✅ (commit `162d862`) — resolved 229 flagged vocab groups + UNIQUE constraint
2. **PROMPT 13 L0 passages** ✅ (12 commits + `86f4769`) — 24/24 rewritten, 100% pass
3. **PROMPT 13-DIAG** ✅ — discovered table name bug (V1 used wrong names)
4. **PROMPT 13-FIX-L0-Q** ✅ (12 commits + `839b2b0`) — rewrote 120 L0 questions + created MANIFEST V2
5. **PROMPT 13-V2-PATCH** ✅ (commit `1f87f23`) — added Student Work Protection + rowcount assertions + Rule 16
6. **L1 batch written** (14 files) — ready to execute

**This chat's role:** Planning + prompt generation.

---

## ⚠️ CURRICULUM TRUTH (Verified)

### Vocabulary (after PROMPT 12 + 12B)
| Level | Entries |
|-------|---|
| **Total** | **1,954** (exact, verified via git log) |
- UNIQUE constraint: ✓ applied (commit `162d862`)
- Mastery records: 158 (0 orphans)
- Unit count: 72 ✓

### Reading Content Status
| Level | Passages | Questions | Passages Status | Questions Status |
|-------|----------|-----------|-----------------|------------------|
| L0 | 24 | 120 (5/passage) | ✅ All rewritten | ✅ All rewritten |
| L1 | 24 | 144 (6/passage) | ⏸ Batch ready | ⏸ Batch ready |
| L2 | 24 | 168 (7/passage) | ❌ Not started | ❌ Not started |
| L3 | 24 | 192 (8/passage) | ❌ Not started | ❌ Not started |
| L4 | 24 | 240 (10/passage) | ❌ Not started | ❌ Not started |
| L5 | 24 | 288 (12/passage) | ❌ Not started | ❌ Not started |
| **Total** | **144** | **1,152** | | |

### Schema Truths (VERIFIED — use in all prompts)
| Table | Actual Name |
|---|---|
| Levels | `curriculum_levels` |
| Units | `curriculum_units` |
| Readings | `curriculum_readings` |
| Questions | `curriculum_comprehension_questions` |
| Vocabulary | `curriculum_vocabulary` |
| Student Progress | `student_curriculum_progress` |

Key columns:
- `curriculum_readings`: `passage_content` (JSONB `{"paragraphs": [...]}`)
- `curriculum_comprehension_questions`: `reading_id` (FK), `question_en`, `choices` (JSONB), `correct_answer`, `question_type`, `sort_order`
- `student_curriculum_progress`: `student_id`, `reading_id`, `section_type`, `status`, `score`, `answers` (JSONB), `completed_at`, UNIQUE(student_id, reading_id, section_type)
- Writing uses `writing_id` FK, Speaking uses `speaking_id` FK — both independent of `reading_id`

---

## 🎯 STUDENT WORK PROTECTION PHILOSOPHY (LOCKED)

### Core Split
- 🔴 **Creative work (writing/speaking):** NEVER delete. But these use separate FKs (`writing_id`, `speaking_id`) — passage rewrites don't touch them at all.
- 🟡 **Mechanical work (comprehension):** Auto-complete new questions on student's behalf. Preserve score, timestamp, status.

### Current State
- 0 completed comprehension records in DB (as of V2-PATCH execution)
- Protection logic is in MANIFEST V2 Phase A.5 as insurance

---

## 📋 SESSION 19 COMMITS (Full Chain)

```
1f87f23 fix(manifest): add Student Work Protection + rowcount assertions to V2
839b2b0 docs: add PROMPT-13-MANIFEST-V2
7e8ebfa → 5cf7404 (12 commits) fix(L0-U12→U01): rewrite comprehension questions
e0eb625 perf: fix major performance issues
86f4769 chore(L0): finalize reading rewrites
92123a4 docs: update audit report
8627320 → [U01] (12 commits) feat(L0-U12→U01): rewrite reading passages
162d862 fix(vocab): resolve 229 flagged duplicate groups + add UNIQUE constraint
```

---

## 🎯 IMMEDIATE NEXT STEPS

### 1. Run L1 Batch (14 files, ~1-2 hours)

Upload all 14 L1 files to `prompts/agents/`:
- `PROMPT-13-L1-00-WRAPPER.md`
- `PROMPT-13-L1-U01.md` through `U12.md`
- `PROMPT-13-L1-99-FINALIZE.md`

Then in Claude Code:
```
Read prompts/agents/PROMPT-13-MANIFEST-V2.md first, then read and execute prompts/agents/PROMPT-13-L1-00-WRAPPER.md. After Phase 0 discovery, proceed through all unit files in order (U01 → U12), then execute PROMPT-13-L1-99-FINALIZE.md.
```

### 2. After L1 → write L2 batch (same structure, no student protection needed)

### 3. Level order: L0 ✅ → L1 ⏸ → L2 → L3 (student protection) → L4 → L5

### 4. Pending prompts (not blocking)
- 09G — PWA install funnel (HIGH for adoption)
- 09H — Linux subscription investigation
- 09I — Hard refresh button
- 09J — Show all roles + delete سيرين

---

## 📋 ROADMAP

```
Phase 2.0 — Cleanup & Hardening
├── PROMPT 11 ✅ Investigation
├── PROMPT 12 ✅ Cleanup (67824ae)
├── PROMPT 12B ✅ 229 flagged + UNIQUE (162d862)
└── PROMPT 13 — Reading + question rewrites
    ├── L0 ✅ DONE (passages + questions + finalize)
    ├── V2-PATCH ✅ DONE (1f87f23)
    ├── L1 ⏸ BATCH READY (14 files written)
    ├── L2 — next after L1
    ├── L3 — needs student protection
    ├── L4
    └── L5

Phase 2.1 — Infrastructure (PROMPT 14-15)
Phase 2.2 — Content Generation Framework (PROMPT 16)
Phase 2.3 — Content Expansion (PROMPTS 17-88)
Phase 2.4 — Polish + 2.5 — Verification
```

---

## 🔒 MANDATORY RULES

1. **Discovery first** — never assume table or column names (Rule 12)
2. **Student work protection** — L1 + L3 have students (Rule 13)
3. **Integration test required**
4. **RLS verification** — `.select()` after `.update()`
5. **No silent failures** (Rule 16 — rowcount assertions)
6. **No local build**
7. **Git push verification**
8. **Unit count = 72** sacred
9. **Audio deferred**
10. **Migrations via `npx supabase db push --linked`**

### Anti-Mistake Playbook: `PHASE-2-CLEANUP/anti-mistake-playbook.md` (16 rules)

---

## ⚙️ INFRASTRUCTURE (UNCHANGED)

- LMS: React 18 + Vite + Tailwind + Supabase (Frankfurt `nmjexpuycmqcxuxljier`) + Claude API + Vercel
- Working dir: `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- Admin: admin@fluentia.academy / Fluentia2025!
- المجموعة 4: 5 students, L3/B1, trainer = Ali
- المجموعة 2: 7 students, L1/A1, trainer = د. محمد شربط
- VAPID: `BOMthBAKoLDTWerMaRgcm8d_sO4OEZRRfwppIHoyMEJMZws-lR1VVoQ9Z3yRxhzF_YbIhWnelO8DvQiXtke0SnE`

---

*End of status file. Next: Run L1 batch → L2 → L3 → L4 → L5*
