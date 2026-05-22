# MOCK EXAM — ROOT CAUSE ANALYSIS (Phase C)

## What the evidence shows

### Edge function logs (last hour, mock-exam-grade-writing)

Single call at `1779488768085 ms epoch` (= 2026-05-23 01:26:08 KSA) — منار العتيبي's auto_submit follow-on AI-grading call. **HTTP 200 in 418 ms.** No edge-function failures, no timeouts, no 500s. Edge function is healthy and was not the bottleneck.

### Postgres / RPC behavior

The 8 existing `mock_exam_*` RPCs are functioning. The single client RPC that completed for منار at 01:26:07 (`auto_submit` audit row) did so in a normal time window. The `score_total=0` is **honest** — her `mock_exam_answers` row count was zero at the moment of submit, so the grader had nothing to score.

### Client-side review — current `MockExamAttempt.jsx` (lines 156–301)

Already healthy:
- Per-keystroke saves are debounced 800ms (`scheduleAnswerSave`) and 1500ms (`scheduleWritingSave`)
- Save calls are wrapped in `try / catch + { error }` destructure — no `.catch()` on PostgrestBuilder
- The grade-writing kickoff (line 280–290) is **already** wrapped in an IIFE (`(async () => { ... })()`), so it is not awaited. **The fire-and-forget pattern is already correct.**

**Still broken:**
1. **No timeout on `supabase.rpc('mock_exam_submit', …)` (line 269).** If the network stalls or the request body is held up by a flaky mobile connection, `await` sits there forever and the student sees `...جاري الإرسال` with no escape. There is no AbortController, no `Promise.race(timeout)`, no manual retry button beyond Ali's WhatsApp text.
2. **`scheduleAnswerSave` failures are silently console-logged.** When `mock_exam_save_answer` fails (network drop, 401 after refresh-token expiry, RLS denial), the student never knows. Their local React state says "answered" — the DB says nothing was saved. This is the most plausible mechanism for منار's `0/35 saved answers despite 101 minutes in the exam`.
3. **`flushAllSaves` has no per-save timeout either.** If even one of 35 in-flight saves stalls inside the flush loop, the submit blocks behind it.

### Ranked likelihood for the original "stuck submit" symptom

1. **🥇 Network-stall on `mock_exam_submit` RPC** — no client-side timeout means a hung TCP/TLS handshake on a flaky mobile connection presents as "...جاري الإرسال" forever. Student gives up. (Most plausible match for Ali's description.)
2. **🥈 Earlier silent save failures** — student's per-keystroke saves had been failing silently for some time; she didn't see "تم الحفظ" or any error, kept "answering" what was only React state; submit then succeeded but had nothing to score. (Most plausible match for منار's data shape: 0 answers saved despite 101 min in the exam.)
3. **🥉 PWA / service-worker auth-cache drift** — `supabase-js` token refresh raced with the in-flight request; the RPC briefly hit 401, fetched a new token, retried — but the outer `await` in the React component still held the original Promise reference. Plausible but harder to reproduce without instrumentation.

## What we know is NOT the cause

- The AI grading edge function is **not** blocking submit. Verified twice: (a) edge function logs show 200/418ms; (b) MockExamAttempt.jsx invokes it inside an unawaited IIFE.
- The mock_exam_submit RPC scoring logic is **not** broken. The 38 answers it scored for Ali's B1 test attempt at 15:14 KSA on 2026-05-22 produced an honest 17.50/100 (7 correct × 2.5pts ≈ 17.5). Re-running it on attempts with zero saved answers correctly produces zero.

## Phase D — what the fix must guarantee

1. **Network-level timeout on every Supabase RPC call inside submit.** 25 s ceiling. If the wire hangs, abort cleanly and surface a retryable error.
2. **Visible save-failure signal to the student.** Even just a non-intrusive "تعذّر الحفظ التلقائي — حاولي مرة ثانية" toast on the chip strip + a heartbeat indicator. This stops the silent-data-loss class.
3. **Manual + automatic retry on submit.** Auto-retry once after a timeout, then surface the manual button + WhatsApp.
4. **Reassuring messaging during submit.** "إجاباتك محفوظة — لا تغلقي الصفحة" beats "...جاري الإرسال" when the student is already nervous.
