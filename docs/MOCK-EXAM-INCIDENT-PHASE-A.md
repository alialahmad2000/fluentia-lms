# MOCK EXAM — INCIDENT FORENSICS (Phase A)

**Date:** 2026-05-23 ~01:48 KSA
**Source:** Mid-window incident report (Ali, ~01:01 KSA).
**Branch:** `main`, base commit `6539888` (LAUNCH).
**Investigator:** Claude Code (read-only).

---

## Summary

Five mock-exam attempts exist in production. Two are Ali's own test attempts from 2026-05-22; three belong to real (non-test) students from 2026-05-23. **No attempt matches the pattern Ali described** (35/35 answered + 76 words + stuck submit). Every attempt either has 0 saved data (likely an abandoned or broken-client attempt) or already submitted cleanly.

**There is nothing to "recover" via force-submit — the underlying answer data is absent for the two candidate students.** Their `mock_exam_answers` rows show 0 rows for both منار العتيبي (already auto-submitted) and لمياء الحربي (still in window with 5 minutes left).

That said, the resilience layer (timeout + retry + admin recovery panel) MUST still ship per prompt — it's the durable preventive fix for any future incident, and the new `mock_exam_admin_force_submit` RPC is idempotent + harmless.

---

## A.1/A.2 — All non-test attempts, with answer counts

| # | Student | Exam | Started (KSA) | Submitted (KSA) | is_submitted | score_total | ai_writing | answers / total | writing chars | minutes_in / until_expiry |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | هوازن العتيبي | B1 | 01:37:21 | — | false | NULL | pending | 22/39 (all `is_correct=NULL`, in-progress) | 0 | 11.3 / +78.7 |
| 2 | لمياء سعود الحربي | A1 | 00:39:16 | — | false | NULL | pending | 0/35 | 0 | 69.4 / +5.6 |
| 3 | منار العتيبي | A1 | 00:07:36 | 01:26:07 (auto) | true | 0.00 | fallback (score 0.00) | 0/35 | 0 | 101.0 / -26.0 |
| 4 | د. علي الأحمد | B1 | 2026-05-22 15:12:40 | 15:14:35 | true | 17.50 | graded (0.00) | 38/39 (7 correct) | 540 | 636.0 / -546.0 |
| 5 | د. علي الأحمد | A1 | 2026-05-22 03:33:33 | 04:27:00 | true | 15.00 | pending | 34/35 (2 correct) | 208 | 1335.1 / -1260.1 |

## A.3 — Audit log (last 8 events, non-test)

```
01:37:21  هوازن    start         {"exam_code":"midterm-mock-b1"}
01:26:07  منار     auto_submit   {"passed":false,"score_total":0}
00:39:16  لمياء    start         {"exam_code":"midterm-mock-a1"}
00:07:36  منار     start         {"exam_code":"midterm-mock-a1"}
15:14:35  د. علي    submit        {"passed":false,"score_total":17.5}    (2026-05-22)
15:12:40  د. علي    start         {"exam_code":"midterm-mock-b1"}        (2026-05-22)
04:27:00  د. علي    submit        {"passed":false,"score_total":15}      (2026-05-22)
03:33:33  د. علي    start         {"exam_code":"midterm-mock-a1"}        (2026-05-22)
```

**No `save_answer` / `save_writing` events are written to the audit log by design** (only `start` / `submit` / `auto_submit`). Per-answer save success cannot be inferred from this log alone.

## A.4 — AI writing log

```
01:26:08  منار     fallback layer=fallback score=0.00  duration=218ms  err=fallback_used
15:14:44  د. علي    success  layer=primary  score=0.00  duration=8214ms
```

منار's auto_submit at 01:26:07 fired the AI grader 500ms later; it ran the fallback path (because writing_response was empty → no point asking Claude) and returned 0/10 in 218ms. The path is working correctly — the grade is honest given the empty input.

## A.5 — Classification

| # | Student | Bucket | Reason | Action |
|---|---|---|---|---|
| 1 | هوازن | **HEALTHY_IN_PROGRESS** | started 11 min ago, 78 min left, 22/39 answered, actively saving | Leave alone |
| 2 | لمياء | **HEALTHY_IN_PROGRESS** (effectively idle) | started 69 min ago, exam expires in 5.6 min, 0 answers, 0 writing — either student never engaged with the questions or her client session never wrote anything. The client-side timer will auto-submit when it hits zero. | Leave alone; the client expiry watchdog will close the attempt cleanly |
| 3 | منار | **SUBMITTED_OK** | Auto-submitted at 01:26 (4 min after timer expiry); ai grader ran (fallback, score 0). All her saved state was already empty BEFORE auto-submit, so there is no recovery to perform — there are 0 `mock_exam_answers` rows for her attempt to re-grade. | Leave alone |
| 4 | د. علي (B1) | **SUBMITTED_OK** | Submitted cleanly yesterday; admin test data | Leave alone |
| 5 | د. علي (A1) | **SUBMITTED_AI_PENDING** | submitted 22h ago, `ai_writing_status='pending'` — never re-triggered. Admin test attempt | Optional re-trigger; not required since this is Ali's own data |

### Bucket distribution

- HEALTHY_IN_PROGRESS: **2** (هوازن, لمياء)
- STUCK_NEEDS_SUBMIT: **0**
- STUCK_EXPIRED: **0**
- SUBMITTED_NOT_SCORED: **0**
- SUBMITTED_AI_PENDING: **1** (Ali's own A1 test attempt; not a real student)
- SUBMITTED_OK: **2** (Ali's B1 test, منار)

---

## Why Ali's narrative doesn't match the data

Ali described: *"one real student finished her exam (35/35 answered, 76 words written), clicked submit, page hung, score shows 0/100."*

Closest candidate in the data is **منار العتيبي** (A1, score=0.00) — but her `mock_exam_answers` count is 0 and `writing_response` is empty. So her saved state was already empty at the moment her client called `mock_exam_submit` (or her client never called it at all and the timer-driven auto-submit fired). The fact that `is_auto_submitted=true` strongly suggests **her browser-side timer fired the auto-submit**, not a manual submit — which means her client was still on the page when the timer hit zero but had never managed to persist any data through `mock_exam_save_answer` / `mock_exam_save_writing`.

Two hypotheses (cannot be distinguished from server-side data alone):
1. **Client session lost auth** mid-exam → every subsequent `mock_exam_save_answer` RPC returned a 401 → student saw no UI feedback (the code silently `console.error`s on save failures) → student kept "answering" what was just local React state that never persisted.
2. **Student answered offline / on a flaky connection** → save_answer RPCs timed out at the network layer → same outcome.

This is exactly the failure mode Phase D's resilience layer (timeout + retry + reassuring messaging + WhatsApp link) is designed to surface to the student so they can react instead of unknowingly losing data.

---

## End of Phase A

```
=== PHASE A COMPLETE ===
Buckets: HEALTHY_IN_PROGRESS=2, STUCK_NEEDS_SUBMIT=0, STUCK_EXPIRED=0, SUBMITTED_NOT_SCORED=0, SUBMITTED_AI_PENDING=1, SUBMITTED_OK=2
Auto-continuing to Phase B (ship the admin recovery RPC + frontend resilience).
```
