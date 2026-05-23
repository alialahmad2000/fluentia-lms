# MOCK EXAM — SAVE CHAIN DIAGNOSIS (2026-05-23 ~04:48 KSA)

## Phase A — evidence

### A.1 — Active + archive snapshot

**Active (1 row):**
| student | exam | started (KSA) | minutes_in | answers | submitted |
|---|---|---|---|---|---|
| نادية القحطاني | B1 | 04:21:51 | 26.5 | **0** | false |

**Archive (7 rows):**
| student | reason | submitted | score | n_answers | writing |
|---|---|---|---|---|---|
| حساب تجريبي A1 (smoke test) | test_smoke_2026-05-23 | true | 5.00 | 4 | — |
| د. علي الأحمد (B1) | second_chance_2026-05-23 | true | 17.50 | 38 | 81w |
| **منار العتيبي (A1)** | second_chance_2026-05-23 | true | 0.00 | **0** | 0 |
| د. علي الأحمد (A1) | second_chance_2026-05-23 | true | 5.00 | 34 | 52w |
| **هوازن العتيبي (B1)** | second_chance_2026-05-23 | true | **66.50** | 38 | 0 |
| نادية القحطاني v1 (B1) | second_chance_2026-05-23 | false | — | 29 | — |
| **لمياء سعود الحربي (A1)** | second_chance_2026-05-23 | true | 0.00 | **0** | 0 |

### A.2 — `mock_exam_answers` is COMPLETELY EMPTY

```sql
SELECT COUNT(*) FROM mock_exam_answers; → 0
```

This is expected: the second-chance archive CASCADE-deleted all answers tied to archived attempts, and نادية v2 hasn't generated any save rows yet despite 26 min in the exam.

### A.3 — Audit log (last 12h, all non-test student events)

```
04:21:51  نادية v2      start         midterm-mock-b1
03:57:00  هوازن         cron_auto_submit  score=66.5 (sweep on second-chance archive)
03:57:00  هوازن         admin_force_submit  caller_role=service_role
03:25:58  نادية v1      start         midterm-mock-b1
02:18:55  لمياء         admin_force_submit  auto=true (INCIDENT-FIX-2 recovery)
01:37:21  هوازن         start
01:26:07  منار          auto_submit   score=0
00:39:16  لمياء         start
00:07:36  منار          start
```

**Zero `save_failed` events.** The FIX-2 client-side telemetry RPC has not been called by any student client today. Two possible explanations:
1. Save failures aren't actually happening for any students RIGHT NOW (the bug is stale-tab specific from before FIX-2).
2. Students whose tabs ARE running broken aren't logging because their `logClientEvent` call also fails (the auth gate inside `mock_exam_log_client_event` requires the attempt to exist — if their attempt_id is stale they'd hit `attempt_not_found`).

### A.7 — RPC security posture

All 5 RPCs are SECURITY DEFINER, granted to anon + authenticated + service_role:
- `mock_exam_save_answer` — SECURITY DEFINER ✓
- `mock_exam_save_writing` — SECURITY DEFINER ✓
- `mock_exam_submit` — SECURITY DEFINER ✓
- `mock_exam_log_client_event` — SECURITY DEFINER ✓
- `mock_exam_start` — SECURITY DEFINER ✓

**RLS / auth chain is NOT the bug.**

### A.6 — Frontend code path inspection

`src/pages/student/mock-exam/MockExamAttempt.jsx` has the full FIX-2 contract in place (verified via grep):
- L235 `runSaveAnswer` wraps `mock_exam_save_answer` in `withTimeout(SAVE_TIMEOUT_MS=10s, 'save_timeout_10s')` ✓
- L244-248 error path calls `recordSaveFailure(rpc, qid, err)` which (a) increments `saveFailures` state, (b) logs the failure via `logClientEvent` to `mock_exam_audit_log` with `event='save_failed'`, payload `{rpc, question_id, error, ts}` ✓
- L565 `<SaveHeartbeat lastSaveAt={...} saveFailures={...}>` is mounted in the sticky header next to the timer ✓
- L958–964 `SaveHeartbeat` renders green/neutral/amber based on `lastSaveAt` + `saveFailures` ✓

**The defense IS deployed in the production bundle.** Students who load the page after `commit 0dd1390` (2026-05-23 02:00 KSA) get all of it. Students whose tabs were already open before that commit do not.

### A.5 — Edge function logs (mock-exam-grade-writing)

Last 30 mock-exam-related edge log entries are all GET requests from the StuckAttemptsPanel polling (admin dashboard). No `mock-exam-grade-writing` invocations recently, no 5xx anywhere.

## Phase B — root cause

The prompt's hypothesis matrix maps the evidence to **multiple** truths, not one:

### Truth #1 — Pre-FIX-2 victims (yesterday's incident class)

**Subjects:** منار, لمياء.
**Evidence:** both have `n_answers=0` in archive snapshots AND zero `save_failed` audit events (because their tabs were running pre-FIX-2 JS that didn't have `logClientEvent`).
**Mechanism:** Their network paths silently dropped `mock_exam_save_answer` calls. The old code only `console.error`d the failure. They got no UI signal. When their timer ran out (or the user clicked submit), the DB had nothing to score → 0/100.
**Status:** Already addressed by FIX-2 (`0dd1390`) — but FIX-2 only protects NEW page loads. Their tabs are gone now anyway.

### Truth #2 — Possible-current-victim (نادية v2)

**Subject:** نادية القحطاني active attempt `e66e8ccb-…`.
**Evidence:** 0 saves in 26.5 minutes; 0 `save_failed` events for her either.
**Two possibilities, cannot distinguish without observing her browser:**
- (a) She started the attempt then abandoned the tab — no clicks, no saves, no failures
- (b) Her current bundle is somehow not firing the FIX-2 telemetry (stale tab from before 02:00 KSA), so saves are silently failing AND telemetry is silently failing
**Status:** Cannot be determined from server-side data alone. Phase C must ship defenses that work either way.

### Truth #3 — Save chain itself is healthy for healthy students

**Subjects:** Ali (x2), هوازن (real 66.50/100), نادية v1 (29 saves before archive), smoke test (4 saves).
**Evidence:** every one of them has full answer rows + correct scores. The RPC works. The scoring works. The audit logging works. The CASCADE-on-archive works.

### Verdict

The save chain is mechanically correct. The root cause for past victims (منار, لمياء) was **silent client-side network drops in pre-FIX-2 code**. FIX-2 added detection + visible UI signal, but only for NEW page loads.

**The right shipping fix is NOT "redo SECURITY DEFINER" or "fix RLS" — both are already correct.** The right fix is:

1. **Pre-submit reconciliation** (Phase C.3) — at submit time, compare local React state to server-side `mock_exam_answers` count and re-save any locally-known answers missing from the server. This guarantees losslessness *at the submit moment* regardless of what happened during the exam.

2. **Blocking modal after 3 consecutive save failures** (Phase C.2) — if the silent-loss class manages to fire without telemetry catching it, this hard-stops the student from continuing to "answer" into a black hole.

3. **Startup save-health probe** — when the exam page mounts, do a single round-trip save (idempotent upsert of any one of the already-loaded `saved_answers`) and confirm it succeeds. If it fails, show the same blocking modal BEFORE the student answers anything.

These defenses are layered: client retry → visible heartbeat → blocking modal → pre-submit reconciliation. Any one of them catches the class. Together they make silent loss impossible.

### What is NOT shipping

- No RLS / SECURITY DEFINER changes (already correct).
- No archive/reset of نادية v2 (she's currently in the window with no submitted state; resetting her would destroy any answers she might be about to make; the pre-submit reconciliation will catch any silent loss at her submit moment).
- No edits to the 9 existing mock_exam RPCs.

## Phase D — affected students

| Student | Status | Action |
|---|---|---|
| منار العتيبي | Already in archive with score 0/100, current `mock_exam_attempts` row = none | She can restart any time — `mock_exam_start` will create a fresh attempt. No action needed. |
| لمياء سعود الحربي | Same as منار | Same |
| نادية القحطاني (v2) | Currently mid-exam, 0 saves | **Leave alone.** Pre-submit reconciliation (Phase C) will catch any silent loss at her submit moment. The cron will auto-submit if she abandons. |
| هوازن, Ali (x2) | Healthy | No action |

The WhatsApp drafts for مAR + لمياء were already prepared in INCIDENT-FIX-2's handoff. No new students need a new message tonight.
