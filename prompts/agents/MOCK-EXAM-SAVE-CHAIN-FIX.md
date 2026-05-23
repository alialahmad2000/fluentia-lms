# MOCK EXAM — URGENT DIAGNOSIS: Why Are Saves Silently Failing?

## ⚠ THE PATTERN (this is the real problem)

Multiple real students — Nadia, others before her — completed their exam, clicked submit, and got stuck on "جاري التسليم...". Despite the pg_cron auto-submit running every minute (which SHOULD have rescued them), their final scores show 0/100.

**This means the answers never reached the DB in the first place.** The cron is doing its job (auto-submitting expired attempts) but it's submitting attempts that have ZERO saved answers — because the auto-save layer (`mock_exam_save_answer`) is silently failing on these students' devices.

Previous fixes added timeouts, retry, heartbeat indicators, archive systems, lossless cron sweeps. But none of them addressed the root cause: **`mock_exam_save_answer` is not actually saving answers reliably on certain devices/networks, and the UI never tells the student that her clicks aren't being persisted.**

The student clicks an option → UI highlights it locally (React state) → debounced save fires → save fails silently → UI still shows the answer selected (because local state, not server state). Student thinks she answered. She did — locally. Server has nothing.

This prompt does forensic diagnosis to confirm this hypothesis (or refute it) and then surgically fixes the actual root cause.

---

## Working context

- **Repo:** `alialahmad2000/fluentia-lms`, branch `main`
- **Supabase ref:** `nmjexpuycmqcxuxljier`
- **Last commit:** `e0e980e`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Critical state:** real exam is LIVE, students are taking it RIGHT NOW. Do not break in-progress attempts.

---

## Absolute rules

1. **Phase A is read-only.** No mutations, no migrations, no code changes until we have the data.
2. **Don't add more resilience layers without proof they fix the actual bug.** Diagnose first.
3. **Don't archive/reset more student data.** The students whose attempts are zero need to be diagnosed individually before any decision.
4. **`visibility='live'` stays.** Cron stays. Existing RPCs stay.
5. **Hooks at top, atomic commit, no `vite build` locally.**

---

## PHASE A — Pull the raw evidence (read-only)

Write findings to `docs/MOCK-EXAM-SAVE-CHAIN-DIAGNOSIS.md` and print to terminal. Be brutally specific. Numbers, names, timestamps.

### A.1 — Current state of all attempts (both active table and archive)

```sql
-- Active attempts
SELECT
  a.id AS attempt_id,
  p.full_name,
  u.email,
  e.code,
  a.started_at AT TIME ZONE 'Asia/Riyadh' AS started_ksa,
  a.submitted_at AT TIME ZONE 'Asia/Riyadh' AS submitted_ksa,
  a.is_submitted,
  a.is_auto_submitted,
  a.score_total,
  a.writing_word_count,
  LENGTH(COALESCE(a.writing_response, '')) AS writing_chars,
  a.ai_writing_status,
  EXTRACT(EPOCH FROM (now() - a.started_at))/60 AS minutes_since_start
FROM mock_exam_attempts a
JOIN profiles p ON p.id = a.student_id
JOIN auth.users u ON u.id = a.student_id
JOIN mock_exams e ON e.id = a.exam_id
ORDER BY a.started_at DESC;

-- Archived attempts (post second-chance)
SELECT
  ar.id AS attempt_id,
  ar.attempt_snapshot->>'student_id' AS student_id,
  (ar.attempt_snapshot->>'is_submitted')::boolean AS is_submitted,
  (ar.attempt_snapshot->>'score_total')::numeric AS score_total,
  jsonb_array_length(ar.answers_snapshot) AS n_answers,
  (ar.attempt_snapshot->>'writing_word_count')::int AS writing_words,
  ar.archive_reason,
  ar.archived_at AT TIME ZONE 'Asia/Riyadh' AS archived_ksa
FROM mock_exam_attempts_archive ar
ORDER BY ar.archived_at DESC;
```

### A.2 — For each attempt with score=0 OR ai_writing_status='pending', count actual saved answers

```sql
SELECT
  a.id AS attempt_id,
  p.full_name,
  a.is_submitted,
  a.score_total,
  COUNT(ans.id) AS answers_saved,
  COUNT(ans.id) FILTER (WHERE ans.selected_index IS NOT NULL OR ans.text_answer IS NOT NULL) AS answers_with_data,
  COUNT(ans.id) FILTER (WHERE ans.selected_index IS NULL AND (ans.text_answer IS NULL OR ans.text_answer = '')) AS answers_blank,
  MIN(ans.updated_at) AT TIME ZONE 'Asia/Riyadh' AS first_save_ksa,
  MAX(ans.updated_at) AT TIME ZONE 'Asia/Riyadh' AS last_save_ksa
FROM mock_exam_attempts a
JOIN profiles p ON p.id = a.student_id
LEFT JOIN mock_exam_answers ans ON ans.attempt_id = a.id
WHERE a.score_total IS NULL OR a.score_total <= 5
GROUP BY a.id, p.full_name, a.is_submitted, a.score_total
ORDER BY MAX(a.started_at) DESC;
```

**This is the key diagnostic.** For each affected student:
- If `answers_saved = 0`: server NEVER received any save_answer call. UI was making clicks but they didn't reach the server. NETWORK or RPC AUTH or CLIENT BUG.
- If `answers_saved = 35` but `answers_with_data = 0`: server received the calls but with NULL values. CLIENT STATE BUG — wrong values being sent.
- If `answers_with_data > 0` but score is still 0: scoring bug or correct_index seed bug (handled in previous diagnosis but worth re-confirming).

### A.3 — Audit log for affected students (this is where we'll see the real activity)

```sql
SELECT
  l.attempt_id,
  p.full_name,
  l.event,
  l.details,
  l.created_at AT TIME ZONE 'Asia/Riyadh' AS at_ksa
FROM mock_exam_audit_log l
JOIN profiles p ON p.id = l.student_id
WHERE l.created_at > now() - interval '12 hours'
ORDER BY l.created_at DESC
LIMIT 300;
```

Look specifically for:
- `event='save_failed'` — the client-side save-failure logging from FIX-2 (`mock_exam_log_client_event`). If these exist for an affected student, we have proof the saves were failing client-side and the heartbeat was firing.
- `event='start'` followed by long silence then `event='admin_force_submit'` or `event='cron_auto_submit'` — means the student started, never had any save events, then the cron picked them up.
- `event='submit_kickoff'` without `event='submit_complete'` — the submit handler was called but never finished.

### A.4 — Specifically for Nadia + recent affected students

```sql
-- Find the most recent submitted attempts with score=0 and inspect their full activity
WITH affected AS (
  SELECT a.id, p.full_name, u.email
  FROM mock_exam_attempts a
  JOIN profiles p ON p.id = a.student_id
  JOIN auth.users u ON u.id = a.student_id
  WHERE a.is_submitted = true
    AND COALESCE(a.score_total, 0) <= 5
    AND COALESCE(p.is_test_account, false) = false
    AND a.started_at > now() - interval '12 hours'
)
SELECT
  af.full_name,
  af.email,
  af.id AS attempt_id,
  jsonb_agg(
    jsonb_build_object(
      'time', l.created_at AT TIME ZONE 'Asia/Riyadh',
      'event', l.event,
      'details', l.details
    ) ORDER BY l.created_at
  ) AS timeline
FROM affected af
LEFT JOIN mock_exam_audit_log l ON l.attempt_id = af.id
GROUP BY af.full_name, af.email, af.id
ORDER BY af.full_name;
```

Print each student's full timeline so we can see exactly what happened on their device.

### A.5 — Edge function logs for the same timeframe

```bash
npx supabase functions logs mock-exam-grade-writing --limit 200
```

Look for any patterns of repeated failures, timeouts, or auth errors around the affected students' timestamps.

### A.6 — Check the deployed JS bundle on Vercel

The most likely root cause: the `mock_exam_save_answer` RPC call in `MockExamAttempt.jsx` is failing silently for some reason. Verify the deployed code:

```bash
# 1. What is the latest production deploy?
cd /tmp && rm -rf fluentia-check
git clone <repo-url> fluentia-check
cd fluentia-check

# 2. Look at the actual save_answer code path
grep -n "mock_exam_save_answer" src/pages/student/mock-exam/MockExamAttempt.jsx

# 3. Verify there's proper error surfacing on save failures
grep -n -B2 -A5 "rpc.*mock_exam_save_answer" src/pages/student/mock-exam/MockExamAttempt.jsx
```

Inspect the actual code. Is the `saveAnswer` debounced callback:
- Catching errors silently? (`.catch(() => {})` with no surface to UI?)
- Using the right Supabase client (one that has the user's JWT, not the anon client)?
- Awaiting the RPC properly?
- Logging the failure to `mock_exam_log_client_event` from FIX-2?

Specifically read the SaveHeartbeat component from FIX-2. Is it actually mounted in the exam page? Is it actually showing the amber state when saves fail? Or is it dead code that ships but doesn't run?

### A.7 — Check RLS on mock_exam_save_answer

```sql
-- Is the RPC SECURITY DEFINER? It must be, because students don't have direct write access to mock_exam_answers.
SELECT proname, prosecdef AS is_security_definer
FROM pg_proc
WHERE proname IN ('mock_exam_save_answer','mock_exam_save_writing','mock_exam_submit')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname='public');
```

If `is_security_definer = false` on any of those, students' save calls would silently fail due to RLS — and that would explain everything.

---

## PHASE B — Form the diagnosis

After Phase A produces data, declare ONE root cause supported by the evidence:

| If the data shows | Then the root cause is | Fix path |
|---|---|---|
| `answers_saved = 0` for affected students, no `save_failed` audit events either | Client-side: the save_answer call is throwing but the catch is swallowing silently, no telemetry firing | Fix the catch block to surface to UI + add proper error UI |
| `answers_saved = 0` AND `save_failed` audit events present | Server-side rejection: RLS, auth, or RPC error. Client knows it failed but couldn't help. | Fix the RPC permissions or RLS or auth chain |
| `answers_saved > 0` but `is_correct=false` for everything | Scoring is wrong OR student genuinely picked wrong answers | Spot-check questions; likely no bug |
| `mock_exam_save_answer` is NOT `SECURITY DEFINER` | RLS is blocking writes for non-admin users | Add SECURITY DEFINER, redeploy migration |
| `save_failed` events show network errors clustered around specific times | Supabase regional outage or rate limit | Out of our control; mitigate with offline-first queue |

Print the evidence + declared root cause clearly.

---

## PHASE C — The actual fix (whichever applies)

### C.1 If RLS / SECURITY DEFINER is the problem

Apply a migration that adds SECURITY DEFINER to the RPCs if it's missing. This is the most likely culprit because earlier FIX commits may have re-created the RPC without that attribute.

```sql
-- Verify and re-create with SECURITY DEFINER guaranteed
CREATE OR REPLACE FUNCTION public.mock_exam_save_answer(
  p_attempt_id    uuid,
  p_question_id   uuid,
  p_selected_index int,
  p_text_answer   text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER             -- ← critical
SET search_path = public
AS $$
DECLARE
  v_attempt public.mock_exam_attempts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL OR v_attempt.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'attempt_not_yours';
  END IF;
  IF v_attempt.is_submitted THEN
    RAISE EXCEPTION 'already_submitted';
  END IF;
  IF now() > v_attempt.expires_at THEN
    RAISE EXCEPTION 'time_expired';
  END IF;

  INSERT INTO public.mock_exam_answers (attempt_id, question_id, selected_index, text_answer)
  VALUES (p_attempt_id, p_question_id, p_selected_index, p_text_answer)
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET selected_index = EXCLUDED.selected_index,
                text_answer    = EXCLUDED.text_answer,
                updated_at     = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_save_answer(uuid, uuid, int, text) TO authenticated;
```

### C.2 If the client is swallowing errors silently

Open `MockExamAttempt.jsx`. Audit the `saveAnswer` debounced callback. Make sure:

1. Errors are not silently swallowed: every failure logs to `mock_exam_log_client_event` AND surfaces to a visible UI element
2. The SaveHeartbeat from FIX-2 actually mounts in the exam page (verify with grep) and actually changes state on save failures
3. If saves are failing, the page shows a prominent red banner: "⚠ تعذّر حفظ إجابتك. تواصلي مع المدرب فوراً" with a WhatsApp link
4. If 3+ consecutive saves fail, the page SHOULD BLOCK the student from continuing and force them to fix their connection before answering more (otherwise they keep "answering" with no persistence)

Specifically add this AFTER the saveAnswer call:

```javascript
const saveAnswer = useDebouncedCallback(async (qid, selectedIndex, textAnswer) => {
  try {
    const { error } = await withTimeout(
      supabase.rpc('mock_exam_save_answer', {
        p_attempt_id: examData.attempt_id,
        p_question_id: qid,
        p_selected_index: selectedIndex ?? null,
        p_text_answer: textAnswer ?? null,
      }),
      10_000
    );
    if (error) throw error;

    setSaveHealth('ok');
    setConsecutiveFails(0);

  } catch (e) {
    console.error('[mock-exam] save_answer failed:', e);
    setSaveHealth('failed');
    const nextFails = consecutiveFails + 1;
    setConsecutiveFails(nextFails);

    // Log to server audit (best effort)
    supabase.rpc('mock_exam_log_client_event', {
      p_attempt_id: examData.attempt_id,
      p_event: 'save_failed',
      p_details: { error: String(e?.message || e), question_id: qid }
    }).catch(() => {});

    // After 3 consecutive failures, show a blocking modal
    if (nextFails >= 3) {
      setBlockingNetworkModal(true);
    }
  }
}, 800);
```

Plus add the blocking modal:

```jsx
{blockingNetworkModal && (
  <div className="modal-overlay critical">
    <div className="modal-card">
      <h2>⚠ مشكلة في الاتصال</h2>
      <p>إجاباتك الأخيرة لم تصل إلى النظام. لا يمكنك متابعة الاختبار حتى يُستعاد الاتصال.</p>
      <p>تأكدي من اتصال الإنترنت (واي فاي قوي إن أمكن)، ثم اضغطي «إعادة المحاولة».</p>
      <p>لو استمرّت المشكلة، تواصلي معي على واتساب فوراً لتجنّب فقدان وقتك:</p>
      <a href="https://wa.me/966558669974" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
        تواصل مع المدرب على واتساب
      </a>
      <button onClick={() => {
        setBlockingNetworkModal(false);
        setConsecutiveFails(0);
        // Re-attempt the last save
      }}>
        إعادة المحاولة
      </button>
    </div>
  </div>
)}
```

### C.3 If the issue is the submit-stuck UX specifically

The submit-stuck issue is downstream of the save-failure issue. If saves are working, submit will work. But add one more safety: when the user clicks submit, BEFORE calling `mock_exam_submit`, the client should verify with the server that all answers are present:

```javascript
async function handleConfirmSubmit() {
  // ... existing flush ...

  // NEW: pre-submit verification
  const { data: serverAnswers } = await supabase
    .from('mock_exam_answers')
    .select('question_id, selected_index, text_answer')
    .eq('attempt_id', examData.attempt_id);

  const localAnsweredCount = Object.values(answers).filter(a =>
    a.selected_index !== null && a.selected_index !== undefined
    || (a.text_answer && a.text_answer.trim())
  ).length;
  const serverAnsweredCount = (serverAnswers || []).filter(a =>
    a.selected_index !== null || (a.text_answer && a.text_answer.trim())
  ).length;

  if (serverAnsweredCount < localAnsweredCount) {
    // Local has more answers than server — saves were dropping silently
    setSubmitError(
      `${localAnsweredCount - serverAnsweredCount} من إجاباتك لم تصل للنظام. ` +
      `جاري إعادة الحفظ...`
    );
    // Re-save every locally answered question
    for (const [qid, val] of Object.entries(answers)) {
      try {
        await supabase.rpc('mock_exam_save_answer', {
          p_attempt_id: examData.attempt_id,
          p_question_id: qid,
          p_selected_index: val.selected_index ?? null,
          p_text_answer: val.text_answer ?? null,
        });
      } catch (e) {
        // log + continue
      }
    }
    setSubmitError(null);
  }

  // ... continue with existing mock_exam_submit call ...
}
```

This way, even if some saves dropped silently during the exam, the SUBMIT moment reconciles client and server state before finalizing. This is the lossless guarantee at the right layer.

---

## PHASE D — Restore affected students fairly

After the fix is applied:

1. **Identify every student in the active or archive table with `score_total ≤ 5` AND `n_answers = 0`** — these are the students who hit the save-chain bug. Their attempts have zero or near-zero useful data.

2. **For each, restore a fresh attempt** by deleting their current row (already in archive from second-chance migration, OR snapshot it now if not):

```sql
-- Find them
WITH affected AS (
  SELECT a.id, p.full_name, u.email,
         COALESCE(SUM(CASE WHEN ans.selected_index IS NOT NULL OR ans.text_answer IS NOT NULL THEN 1 ELSE 0 END), 0) AS real_answers
  FROM mock_exam_attempts a
  JOIN profiles p ON p.id = a.student_id
  JOIN auth.users u ON u.id = a.student_id
  LEFT JOIN mock_exam_answers ans ON ans.attempt_id = a.id
  WHERE COALESCE(p.is_test_account, false) = false
    AND a.is_submitted = true
  GROUP BY a.id, p.full_name, u.email
  HAVING COALESCE(SUM(CASE WHEN ans.selected_index IS NOT NULL OR ans.text_answer IS NOT NULL THEN 1 ELSE 0 END), 0) <= 5
)
SELECT * FROM affected;

-- Archive + reset each one
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT a.id
    FROM mock_exam_attempts a
    JOIN profiles p ON p.id = a.student_id
    LEFT JOIN mock_exam_answers ans ON ans.attempt_id = a.id
    WHERE COALESCE(p.is_test_account, false) = false
      AND a.is_submitted = true
    GROUP BY a.id
    HAVING COUNT(ans.id) FILTER (WHERE ans.selected_index IS NOT NULL OR ans.text_answer IS NOT NULL) <= 5
  LOOP
    PERFORM mock_exam_archive_and_reset(r.id, 'save_chain_bug_recovery_2026-05-23');
  END LOOP;
END $$;
```

3. **Generate a personalized WhatsApp message for each affected student** with their name + the explanation + the assurance that the bug is fixed.

---

## PHASE E — Atomic commit

```bash
git add -A
git commit -m "fix(mock-exam): diagnose + repair silent save_answer failures

Root cause identified: <one of B's hypotheses, supported by audit log evidence>
Affected students: <list of names>

Changes:
- <RLS fix OR SECURITY DEFINER addition OR client error surfacing>
- Pre-submit reconciliation: client compares local vs server answer state
  and re-saves any missing answers before finalizing
- Blocking modal after 3 consecutive save failures (prevents 'phantom answering'
  with no DB persistence)
- Re-saved every affected student's attempt via archive_and_reset

Visibility='live' preserved. Cron jobs preserved. Sacred RPCs preserved.
The save chain is now defended at three layers: client retry, blocking UI on
repeated failures, and server-side reconciliation at submit time."
git push origin main
```

---

## PHASE F — Final handoff

```
=== SAVE CHAIN DIAGNOSED + FIXED ===
Commit: <sha>

Root cause: <evidence-backed declaration>

Affected students (re-given a fresh attempt):
  <name1> (<email>) — original attempt: <N> answers saved out of 35
  <name2> (<email>) — original attempt: <N> answers saved out of 35
  ...

Defenses now in place:
  ✓ Save RPC verified SECURITY DEFINER
  ✓ Client-side save failures surface to UI (blocking after 3 consecutive)
  ✓ Pre-submit reconciliation: re-saves any locally-known answers missing from server
  ✓ All save failures logged to mock_exam_audit_log with details
  ✓ WhatsApp escape hatch remains prominent

>>> WHATSAPP MESSAGES (one per affected student) <<<
<draft Arabic messages, by name>

>>> ALI'S IMMEDIATE STEPS <<<
1. Send the WhatsApp messages above
2. Affected students can re-take the exam right away — the system is fixed
3. The pg_cron continues to protect everyone else
4. Sunday 22:00 KSA: review + reveal
```

Go.
