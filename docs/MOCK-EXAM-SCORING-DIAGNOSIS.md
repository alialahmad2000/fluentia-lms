# MOCK EXAM — SCORING DIAGNOSIS (2026-05-23 ~02:55 KSA)

## TL;DR

**There is no scoring bug.** The seed `correct_index` values are correctly authored across every question I hand-verified. The `mock_exam_submit` RPC's UPDATE…JOIN scoring math produces consistent results: every attempt's section sums equal the `score_<section>` columns to the penny.

**There is one real bug** that explains Ali's "15/100 with ai_writing_status='pending'": his A1 attempt was submitted on 2026-05-22 04:27 KSA, **before commit `1d8d8c3` (FIX-3) shipped at 14:11 KSA the same day**. The pre-FIX-3 submit RPC defaulted `score_writing=10` whenever `writing_word_count >= min`, and the pre-FIX-3 frontend did NOT invoke the AI grading edge function after submit. So his attempt is stranded with a legacy 10/10 writing default that was never re-graded by Claude.

**Fix:** invoke `mock-exam-grade-writing` for that one attempt. Claude will fall through to the fallback path (the writing is "off fff ggg hhh" × 13), score it 0/10, the apply RPC will overwrite `score_writing` 10→0 and recompute `score_total` 15→5.

## Phase A evidence

### A.1 — Ali's A1 attempt row (the one in the screenshot)

```
id:                  f907b031-bbaa-4ddb-a347-8cb3f209bd9d
exam_id:             4a6b42fe-...  (midterm-mock-a1)
student_id:          e5528ced-... (admin@fluentia.academy)
started_at:          2026-05-22 00:33:33 UTC  (= 03:33 KSA)
submitted_at:        2026-05-22 01:27:00 UTC  (= 04:27 KSA)
is_submitted:        true
is_auto_submitted:   false
is_revealed:         true (Ali revealed his own attempt at 13:22 UTC)
writing_word_count:  52
score_grammar:       0.00
score_reading:       5.00     (2 lucky right of 10 × 2.5)
score_vocabulary:    0.00
score_spelling:      0.00
score_writing:       10.00    (LEGACY default — pre-FIX-3)
score_total:         15.00    (= 5 + 10)
ai_writing_status:   pending  (frontend never invoked the grader)
ai_writing_score:    null
manual_writing_score: null
writing_response (first 200 chars):
  "off fff ggg hhh off fff ggg hhh off fff ggg hhh
   off fff ggg hhh off fff ggg hhh off fff ggg hhh ..."
```

**Reading this attempt:** Ali was stress-testing the exam. He typed `off fff ggg hhh` × 13 = 52 nonsense words to clear the min-word gate. He clicked option D (`got_index=3`) on basically every MCQ. He typed `kllkl` / `klkkl` / `lklkl` for every fill_blank.

### A.2 — Every saved answer side-by-side with the question

I pulled all 34 answers + their question definitions. The pattern is unmistakable:

| Section | Q | type | expected | got | matched? | points |
|---|---|---|---|---|---|---|
| reading | 1 | mcq | 1 | **1** | ✓ | 2.50 |
| reading | 2 | mcq | 2 | 3 | ✗ | 0 |
| reading | 3 | mcq | 2 | 3 | ✗ | 0 |
| reading | 4 | t/f | 1 | 0 | ✗ | 0 |
| reading | 5 | t/f | 0 | 1 | ✗ | 0 |
| reading | 6 | mcq | 2 | 1 | ✗ | 0 |
| reading | 7 | mcq | 1 | 2 | ✗ | 0 |
| reading | 8 | mcq | 1 | 3 | ✗ | 0 |
| reading | 9 | t/f | 1 | **1** | ✓ | 2.50 |
| reading | 10 | t/f | 0 | 1 | ✗ | 0 |
| **reading total** | — | — | — | — | **2/10** | **5.00 / 25** |
| vocab 1-8 | every MCQ → got_index=3 (option D), every fill_blank → "kllkl"/"klkkl" | — | — | — | 0/8 | **0.00 / 20** |
| spelling 1-6 | MCQ → option C or D, fill_blanks → "lklkl" "kllklk" "lkl" | — | — | — | 0/6 | **0.00 / 15** |
| grammar 1-10 | MCQ → mostly option D (got_index=3), fill_blanks → "kkk"/"kllkkl" | — | — | — | 0/10 | **0.00 / 30** |
| writing | gibberish 52 words | — | — | — | (default) | **10.00 / 10** (pre-FIX-3 default) |

Total: 5 + 0 + 0 + 0 + 10 = **15.00 / 100**. The math is exact.

### A.3 — Hand-verified seeded `correct_index` values (sample of 12)

| Section | Stem | options | expected | hand-check verdict |
|---|---|---|---|---|
| vocab | "celebrate" Arabic | [يحلم, يحتفل, يبكي, ينام] | 1 | ✓ يحتفل = celebrate |
| vocab | Many families ___ together for Eid | [finish, gather, leave, forget] | 1 | ✓ gather |
| vocab | "traditional" means | [expensive, "passed down…", for children, weekends] | 1 | ✓ |
| vocab | whale ___ deep songs | [sings, writes, draws, cooks] | 0 | ✓ sings |
| vocab | "discover" Arabic | [يكتشف, يصف, يقرر, يدمر] | 0 | ✓ |
| spelling | beautiful | [beautiful, beutiful, beautifull, beatuful] | 0 | ✓ |
| spelling | traditional | [tradisional, traditional, tradtional, traditionall] | 1 | ✓ |
| grammar | She ___ from Saudi Arabia | [am, is, are, be] | 1 | ✓ is |
| grammar | My brother and I ___ students | [am, is, are, be] | 2 | ✓ are |
| grammar | He eats ___ apple | [a, an, the, —] | 1 | ✓ an (vowel sound rule) |
| grammar | error detection: My sister [like] to watch | [My sister, like, to, watch movies] | 1 | ✓ "like" → should be "likes" |
| grammar | Sara doesn't ___ coffee | [drink, drinks, drinking, drank] | 0 | ✓ drink (after doesn't → bare infinitive) |

**12 / 12 PASS.** Zero seed bugs in the spot-check. The seed authors did the work correctly.

### A.4 — Section sum cross-check

| Section | sum_points_awarded | score_<section> | match? |
|---|---|---|---|
| grammar | 0 | 0.00 | ✓ |
| reading | 5 | 5.00 | ✓ |
| vocabulary | 0 | 0.00 | ✓ |
| spelling | 0 | 0.00 | ✓ |
| writing (out-of-band) | — | 10.00 (legacy default) | n/a |

The UPDATE…JOIN scoring query in `mock_exam_submit` worked exactly as advertised. The SELECT…SUM aggregation worked. There is no RPC bug.

### A.5 — AI grading log for Ali's A1 attempt

```
SELECT * FROM mock_exam_ai_writing_log WHERE attempt_id = 'f907b031-...';
→ []
```

**Empty.** The edge function was never invoked for this attempt — because the frontend code that invokes it post-submit didn't exist yet at 04:27 KSA on 2026-05-22 (that wiring shipped in FIX-3 at 14:11 KSA).

### A.6 — All submitted attempts rollup

| Student | Exam | Answers / Correct | sum_points_non_writing | score_total | score_writing | ai_status | Verdict |
|---|---|---|---|---|---|---|---|
| لمياء (recovered) | A1 | 0 / 0 | 0 | 0.00 | 0.00 | fallback | Empty — no save data (network issue, fixed in INCIDENT-FIX-2) |
| منار | A1 | 0 / 0 | 0 | 0.00 | 0.00 | fallback | Empty — same as لمياء |
| Ali (B1 test) | B1 | 38 / 7 | 17.50 | 17.50 | 0.00 | graded | Healthy — submitted post-FIX-3, AI ran (gibberish → 0/10 fallback) |
| **Ali (A1 test)** | **A1** | **34 / 2** | **5.00** | **15.00** | **10.00** | **pending** | **Stranded pre-FIX-3 — needs AI re-trigger** |

**Only 1 attempt across the entire system needs intervention.**

## Phase B — Root cause categorization

| Hypothesis | Evidence | Verdict |
|---|---|---|
| #1 Answers never persisted (UI bug) | Ali's 34 answers all show populated `selected_index` (mostly =3, his test pattern). لمياء + منار have 0 saved — but that's the previously-diagnosed save-path network issue, not a UI bug. | **REJECTED** for Ali's data; the save-path resilience fix from INCIDENT-2 already addresses the لمياء/منار class. |
| #2 Scoring RPC is broken | Every section's `sum_points_awarded` = `score_<section>`. Scoring math is correct for all 4 submitted attempts. | **REJECTED** |
| #3 Seeded `correct_index` is wrong | 12 / 12 hand-verified spot-check PASS. No bad indices found. | **REJECTED** |
| #4 Scoring is correct, exam is just hard (for Ali: garbage inputs) | Ali's chosen indices match a pattern of "option D for every MCQ + nonsense for fill_blank + gibberish writing" — clearly stress-testing. 2 correct in reading were lucky guesses. | **TRUE** — Ali was testing with junk, the score reflects that |
| #5 AI invocation skipped entirely (only for the stranded attempt) | `mock_exam_ai_writing_log` empty for `f907b031-…`. The frontend that fires the invoke shipped 10 hours after his submit. | **TRUE** — needs re-invoke |
| #6 AI invocation ran and failed | n/a — never invoked, not "failed" | **REJECTED** |

**Final answer:** the system is healthy. The only repair needed is one manual re-invoke of `mock-exam-grade-writing` for the pre-FIX-3 stranded attempt. That will recompute `score_writing` 10→0 (gibberish) and `score_total` 15→5 (the honest score).

## Phase C — Targeted fix

**No code change required.** No migration, no RPC modification, no seed correction. The bug is entirely in stale state, and `mock_exam_apply_ai_writing_score` (already-deployed RPC) recomputes `score_total` from existing section scores when the edge function lands.

Steps:
1. Re-invoke `mock-exam-grade-writing` for `f907b031-bbaa-4ddb-a347-8cb3f209bd9d` via service-role POST
2. Verify the resulting `score_total` is the honest value (expected: 5/100)
3. Confirm no regressions on the other 3 submitted attempts

## Phase D — Re-grade + re-trigger AI (results)

### Step 1 — Re-invoke AI grading for the stranded attempt

```bash
POST /functions/v1/mock-exam-grade-writing
body: { attempt_id: "f907b031-bbaa-4ddb-a347-8cb3f209bd9d" }
→ HTTP 200
→ {
    "success": true,
    "ai_success": true,
    "layer": "primary",
    "score": 0,
    "status": "graded",
    "apply": {
      "attempt_id": "f907b031-...",
      "ai_writing_score": 0,
      "final_writing_score": 0,
      "score_total": 5,           ← was 15, now corrected
      "passed": false,
      "status": "graded"
    }
  }
```

Claude graded the "off fff ggg hhh" × 13 gibberish at 0/10 (the primary/Claude path, not fallback — Claude looked at the actual text and rejected it for content). `mock_exam_apply_ai_writing_score` then overwrote `score_writing` 10→0 and recomputed `score_total` 15→5. `ai_writing_status` is now `'graded'`.

### Step 2 — No re-grade of non-writing sections needed

The recovery RPC `mock_exam_admin_force_submit` has an idempotency check `IF score_total > 0 → return idempotent`. That short-circuits any re-grade on the 3 attempts that currently have `score_total > 0` (Ali B1 = 17.50, Ali A1 = 5.00, both correct). The 2 zero-score attempts (لمياء + منار) have 0 saved answers, so a re-grade would still produce 0. **No further action required.**

### Step 3 — Final cross-check: section sums match per-section columns

| Student | Exam | grammar | reading | vocab | spelling | writing | total | sum non-writing | match? |
|---|---|---|---|---|---|---|---|---|---|
| لمياء | A1 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | ✓ |
| منار | A1 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | ✓ |
| Ali (B1) | B1 | 2.50 | 12.50 | 0.00 | 2.50 | 0.00 | 17.50 | 17.50 | ✓ |
| **Ali (A1)** | A1 | 0.00 | 5.00 | 0.00 | 0.00 | **0.00 ← was 10.00** | **5.00 ← was 15.00** | 5.00 | ✓ |

Every row balances. The system is fully consistent.

## ROLLUP — before / after

| Student | Exam | Old score | New score | Δ | AI status (before) | AI status (after) |
|---|---|---|---|---|---|---|
| لمياء | A1 | 0/100 | 0/100 | — | fallback | fallback |
| منار | A1 | 0/100 | 0/100 | — | fallback | fallback |
| Ali (B1 test) | B1 | 17.5/100 | 17.5/100 | — | graded | graded |
| **Ali (A1 test)** | A1 | **15/100** | **5/100** | **−10** | **pending** | **graded** |

**1 attempt corrected.** Ali's stranded A1 attempt now shows the honest 5/100 (5 reading lucky guesses + 0 everywhere else + 0 writing) instead of the inflated 15/100 (which included the legacy 10/10 writing default that was never actually evaluated).

