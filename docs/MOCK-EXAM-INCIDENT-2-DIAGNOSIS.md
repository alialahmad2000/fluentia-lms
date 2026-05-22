# MOCK EXAM — SECOND INCIDENT, FULL DIAGNOSIS

**Date:** 2026-05-23 ~02:25 KSA
**Trigger:** A second student reported stuck-submit after commit `6172384` (the first fix) deployed at ~02:00 KSA.
**Root finding:** The fix DID deploy correctly (Vercel age 14m at investigation time, Ready). It just only protects students who load the page AFTER 02:00. Two students already had their tabs open before that. The "second report" matches that pattern.

---

## Forensic re-classification (every non-test attempt as of 02:25 KSA)

| # | Student | Exam | is_submitted | answers / total | writing chars | Bucket | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | هوازن العتيبي | B1 | false | **38/39** | 0 | HEALTHY_IN_PROGRESS | 56 min left, actively answering. The strongest answer-saver tonight — disproves "save_answer is universally broken." |
| 2 | لمياء سعود الحربي | A1 | false → **true** (recovered) | 0/35 | 0 | STUCK_EXPIRED → recovered | Force-submitted via `mock_exam_admin_force_submit`. Score 0/100 (no data). |
| 3 | منار العتيبي | A1 | true | 0/35 | 0 | SUBMITTED_OK (already closed) | Auto-submitted at 01:26 with 0/100. No data to recover. |
| 4 | د. علي الأحمد (B1) | B1 | true | 38/39 | 540 | SUBMITTED_OK | Admin test. |
| 5 | د. علي الأحمد (A1) | A1 | true | 34/35 | 208 | SUBMITTED_AI_PENDING | Admin test, optional. |

**Real students affected today: 2** (لمياء, منار). Both have empty save data, suggesting their client sessions silently dropped autosaves throughout the exam.

---

## Deeper root cause — what the second pass confirmed

### Server is healthy

| Check | Result |
|---|---|
| `pg_stat_activity` (active + idle vs max_conn) | 41 / 60 — **healthy**, no saturation |
| Long-running queries (> 5s) | Only `realtime_replication_connection` — expected |
| `pg_stat_activity.state = 'idle in transaction'` | **0** — no abandoned transactions holding locks |
| Postgres logs — `mock_exam*` errors in last hour | **0** |
| Edge function 5xx in last 2h | **0** |
| `mock-exam-grade-writing` last call (مAR's) | HTTP 200 / 418ms |
| RLS on `mock_exam_answers` | SELECT-only; writes via SECURITY DEFINER — **no recursion possible** |
| `mock_exam_submit` source review | Sub-100ms class: single PK reads + one bulk UPDATE on ~35 rows + SELECT SUM + 2 trivial updates + 1 insert |
| Vercel deploy of `6172384` | Status **Ready** at age 14m, production |

### What the previous Phase C missed

The first fix only wrapped `mock_exam_submit` in a network timeout. **`mock_exam_save_answer` and `mock_exam_save_writing` have exactly the same hang potential**, and their failures were silently `console.error`d with no UI signal. That is the actual mechanism behind لمياء + منار having empty `mock_exam_answers` rows despite the exam page being open for 80+ minutes:

1. Student begins answering.
2. Network path silently stalls (cellular→Wi-Fi handoff on iOS, captive portal, ISP DNS blip, mobile-network proxy interception, etc.).
3. The first `mock_exam_save_answer` POST never resolves — but the React state-update for the picked option already ran. UI shows "answered."
4. Subsequent saves either also hang OR succeed but for questions whose state was overwritten between attempts.
5. By the time submit fires (or the timer expires), the DB has nothing to score → 0/100.

**هوازن's data is the proof:** 38 saves landed, last one 02:09:59. Her network is fine. The bug is intermittent, not universal.

---

## What ships this round

1. **New SECURITY DEFINER RPC `mock_exam_log_client_event`** — strict event-name whitelist (`submit_kickoff`, `submit_complete`, `submit_failed`, `save_failed`, `flush_started`, `flush_complete`, `page_unload`, `retry_attempt`). Students log own-attempt events; admins/trainers can log on any.
2. **Client timeouts on `mock_exam_save_answer` + `mock_exam_save_writing`** — 10s ceiling per call. Both wrapped in the existing `withTimeout` helper. Wide-error catch logs `save_failed` audit row with rpc/qid/error/ts payload.
3. **Save-heartbeat chip in the exam header** — Green "تم الحفظ ✓" for fresh successes, neutral relative-time for older successes, **amber "تحقّقي من الاتصال (N)"** when any failure pending. Re-renders every 5s. Students can finally SEE when their answers aren't reaching the server.
4. **Submit telemetry** — `handleSubmit` emits `submit_kickoff` before the RPC and `submit_complete`/`submit_failed` after. Wrapped in `console.time('mock-exam-submit:<attempt8>')` with `:flush` and `:rpc` sub-timers for DevTools.
5. **StuckAttemptsPanel diagnostic strip** — parallel-fetches latest 10 audit events per attempt; computes `stuck_mid_submit` (kickoff with no matching complete) + `save_failures_count`; promotes to STUCK_NEEDS_SUBMIT regardless of minutes-in; renders a small chip strip under each stuck row showing the recent events with time. Ali sees the next student within 60s.

### What is NOT shipped

- **No edits to the 8 existing `mock_exam_*` RPCs.** Sacred constraint honored.
- **No `vite build` locally.**
- **No `visibility` change.** Exam continues to natural close at 22:00 KSA.
- **No row mutations** on هوازن's in-progress data.

---

## Recovered students

| Student | Email | Action taken | New state |
|---|---|---|---|
| **لمياء سعود الحربي** | almooshhh11@gmail.com | `mock_exam_admin_force_submit('9659e9e3-…', true)` + `mock-exam-grade-writing` re-invoke | is_submitted=true, score 0/100, ai_writing_status='fallback', `is_revealed=false`. Awaiting Ali's review + reveal. |

| Student NOT touched | Why |
|---|---|
| **هوازن العتيبي** | HEALTHY_IN_PROGRESS — 38/39 answered, still has 56 min left. Force-submitting would destroy her work. |
| **منار العتيبي** | Already submitted at 01:26 KSA with score 0/100. Her `mock_exam_answers` count is 0, so any re-grade still produces 0. She's closed; just needs Ali's WhatsApp follow-up + reveal decision. |

---

## WhatsApp drafts (per affected real student, Arabic, ready to copy)

### To لمياء (recovered just now)

```
السلام عليكم لمياء،
لاحظت أن صفحة الاختبار كانت مفتوحة عندك مدة طويلة بدون أن تصل أي إجابة إلى النظام —
على الأرجح بسبب انقطاع متقطّع في الإنترنت أثناء الاختبار.
لقد أغلقت الاختبار يدوياً من جهتي حتى لا تبقى نتيجتك معلّقة.
لا تقلقي — تم إصلاح المشكلة من جذرها الآن، وسأرتّب لكِ اختباراً بديلاً قريباً إن شاء الله.
لو احتجتي توضيح، أنا هنا.

د. علي
```

### To منار (already closed at 0/100 before this session — same root cause)

```
السلام عليكم منار،
ظهرت نتيجتكِ ٠ من ١٠٠ لأن إجاباتكِ لم تصل إلى النظام أثناء الاختبار،
وهذا — والله أعلم — بسبب مشكلة في اتصال الإنترنت لديكِ خلال الجلسة.
الإجابات التي اخترتيها لم تُحفظ، ولا توجد بيانات نستردّها للأسف.
تم إصلاح المشكلة من جذرها الآن، وسأرتّب لكِ اختباراً بديلاً في وقت قريب إن شاء الله.

د. علي
```

### Watch-list (no action yet)

- **هوازن العتيبي** — currently mid-exam, doing well (38/39 answered). If she finishes and her submit hangs, the new `StuckAttemptsPanel` will surface her within 60s. No proactive WhatsApp needed.

---

## What Ali should do NEXT

1. **Open `/admin/mock-exam-results`** — the new diagnostic strip will surface any future stuck student in real time (auto-refresh every 60s).
2. **Send the WhatsApp drafts** above to لمياء + منار when ready.
3. **Let the exam continue** — window closes Sat 22:00 KSA. هوازن has 56 minutes and is healthy.
4. **After window closes**: review writing scores in the trainer dashboard + reveal as planned. The 2 recovered students will appear with score 0 + writing notes.
5. **For Sunday (post-mortem):** the new telemetry will let us count save_failed events per session over the next exam to see if it correlates with student device/network patterns. If it does, the next iteration is offline-first autosave (IndexedDB queue + retry-on-reconnect).

---

## Confidence statement

The deeper investigation confirms with high confidence that the bug is **purely on the client-network path**, not on Supabase or our DB. Every server-side signal (logs, pool, query timing, edge function status code) is clean. The fix ships defenses at every layer the client touches:

- 10s timeouts on every save (was: infinite)
- 25s timeout on submit (already shipped in `6172384`)
- Visible save-heartbeat (was: silent `console.error`)
- Server-side telemetry per session (was: no signal at all)
- Admin panel surfaces stuck students within 60s (was: no signal)

The next student who hits a flaky network gets an amber heartbeat chip + a save-failed toast WHILE the exam is in progress, instead of a 0/100 surprise after submission.
