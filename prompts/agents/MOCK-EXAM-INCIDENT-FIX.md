# MOCK EXAM — URGENT: Stuck Submit Investigation + Recovery + Resilience

## ⚠ CRITICAL CONTEXT — READ FIRST

Real students are **actively taking** the mock exam right now (window: 22 May 22:00 → 23 May 22:00 KSA, currently 23 May ~01:00 KSA per Ali's last message at 1:01 AM).

One real student finished her exam (35/35 answered, 76 words written ≥ min 50), clicked submit, saw "جاري التسليم..." (submitting), and the page hung. Afterwards her admin-panel score shows 0/100 — which is either (a) the submit RPC never completed and her attempt is stuck `is_submitted=false`, or (b) the submit completed but scoring broke and her actual answers are in the DB unscored.

**Ali's exact words:** *"I don't want any students to face this issue at all. I am afraid students will waste their time and then it doesn't work well due to those issues."*

Your job in this prompt:

1. **Forensically investigate** every non-test attempt to determine state (don't touch anything yet)
2. **Recover** the affected student(s) — their answers are auto-saved per-keystroke so the data IS in the DB; we just need to force-submit and re-score
3. **Find the root cause** of the hang and patch it permanently
4. **Add resilience** so no future student can get stuck: client-side timeout + retry button + auto-retry + idempotent server-side recovery tool
5. **Atomically commit + deploy** without breaking any in-progress attempt

**Sacred constraint:** other students may be mid-exam right now. Your deploy must NOT interrupt them. The submit flow stays idempotent + backward-compatible.

---

## Working context

- **Repo:** `alialahmad2000/fluentia-lms` (branch `main`)
- **Supabase ref:** `nmjexpuycmqcxuxljier`
- **Last commit:** `6539888` (LAUNCH)
- **Auto-load skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`

## Absolute rules

1. Sacred tables untouched. Existing RPCs **mostly** untouched (you may ADD a new admin recovery RPC; you do NOT modify the 8 existing mock_exam RPCs).
2. **`visibility='live'` stays.** The exam is in the middle of its run — do not flip it.
3. All deploys backward-compatible with in-progress attempts.
4. Atomic commit at end.
5. No `vite build` locally.
6. Hooks at top, `profile?.id`, etc.
7. **No destructive SQL on student data.** All recovery is via the existing RPCs (force-call them as service_role).

---

## PHASE A — Forensic investigation (read-only, ~2 minutes)

Run all four queries via `mcp__supabase__execute_sql`. Print results to terminal AND write to `docs/MOCK-EXAM-INCIDENT-PHASE-A.md`.

### A.1 — All real-student attempts (current state)

```sql
SELECT
  a.id AS attempt_id,
  p.full_name,
  e.code,
  a.started_at AT TIME ZONE 'Asia/Riyadh' AS started_ksa,
  a.submitted_at AT TIME ZONE 'Asia/Riyadh' AS submitted_ksa,
  a.expires_at AT TIME ZONE 'Asia/Riyadh' AS expires_ksa,
  a.is_submitted,
  a.is_auto_submitted,
  a.score_total,
  a.passed,
  a.writing_word_count,
  LENGTH(COALESCE(a.writing_response, '')) AS writing_chars,
  a.ai_writing_status,
  a.ai_writing_score,
  a.is_revealed,
  EXTRACT(EPOCH FROM (now() - a.started_at))/60 AS minutes_since_start
FROM mock_exam_attempts a
JOIN profiles p ON p.id = a.student_id
JOIN mock_exams e ON e.id = a.exam_id
WHERE p.is_test_account = false
ORDER BY a.started_at DESC;
```

### A.2 — Answer counts per attempt

```sql
SELECT
  a.id AS attempt_id,
  p.full_name,
  e.code,
  a.is_submitted,
  a.score_total,
  COUNT(DISTINCT ans.id) AS answers_saved,
  COUNT(DISTINCT ans.id) FILTER (WHERE ans.is_correct = true)  AS correct,
  COUNT(DISTINCT ans.id) FILTER (WHERE ans.is_correct = false) AS wrong,
  COUNT(DISTINCT ans.id) FILTER (WHERE ans.is_correct IS NULL) AS ungraded,
  COALESCE(SUM(ans.points_awarded), 0) AS sum_points_awarded
FROM mock_exam_attempts a
JOIN profiles p ON p.id = a.student_id
JOIN mock_exams e ON e.id = a.exam_id
LEFT JOIN mock_exam_answers ans ON ans.attempt_id = a.id
WHERE p.is_test_account = false
GROUP BY a.id, p.full_name, e.code, a.is_submitted, a.score_total
ORDER BY MAX(a.started_at) DESC;
```

### A.3 — Audit log for non-test attempts (last 200 events)

```sql
SELECT
  l.attempt_id,
  p.full_name,
  l.event,
  l.details,
  l.created_at AT TIME ZONE 'Asia/Riyadh' AS at_ksa
FROM mock_exam_audit_log l
JOIN profiles p ON p.id = l.student_id
WHERE p.is_test_account = false
ORDER BY l.created_at DESC
LIMIT 200;
```

### A.4 — AI writing log

```sql
SELECT
  log.attempt_id,
  p.full_name,
  log.status,
  log.layer,
  log.score,
  log.error_message,
  log.duration_ms,
  log.created_at AT TIME ZONE 'Asia/Riyadh' AS at_ksa
FROM mock_exam_ai_writing_log log
LEFT JOIN mock_exam_attempts a ON a.id = log.attempt_id
LEFT JOIN profiles p ON p.id = a.student_id
WHERE p.is_test_account = false
ORDER BY log.created_at DESC
LIMIT 50;
```

### A.5 — Classification (decide what to do per attempt)

Categorize every non-test attempt into one of these buckets:

| Bucket | Criteria | Action in Phase B |
|---|---|---|
| **HEALTHY_IN_PROGRESS** | `is_submitted=false`, started < 90 min ago, `now() < expires_at`, < 35 answers OR writing < min | Leave alone — student is still working |
| **STUCK_NEEDS_SUBMIT** | `is_submitted=false`, ≥ 30 answers saved, writing_word_count ≥ min, started > 30 min ago, `now() < expires_at` | **Force submit via service_role** |
| **STUCK_EXPIRED** | `is_submitted=false`, `now() > expires_at` | **Force auto-submit via service_role with p_auto=true** |
| **SUBMITTED_NOT_SCORED** | `is_submitted=true` AND (`score_total IS NULL` OR `score_total = 0` AND `answers_saved > 0`) | **Re-score via repair RPC** (see Phase C) |
| **SUBMITTED_AI_PENDING** | `is_submitted=true`, `ai_writing_status='pending'`, started > 5 min ago | **Re-trigger AI grading** |
| **SUBMITTED_OK** | `is_submitted=true`, `score_total > 0`, `ai_writing_status IN ('graded','fallback','manual')` | Leave alone — fine |

Print the bucket distribution + per-attempt classification table. Do **not** take action yet — that's Phase B.

End Phase A with:
```
=== PHASE A COMPLETE ===
Buckets: HEALTHY_IN_PROGRESS=N, STUCK_NEEDS_SUBMIT=N, STUCK_EXPIRED=N, SUBMITTED_NOT_SCORED=N, SUBMITTED_AI_PENDING=N, SUBMITTED_OK=N
Auto-continuing to Phase B (recovery).
```

---

## PHASE B — Recover affected students (immediate, ~5 minutes)

For each attempt classified as STUCK or SUBMITTED_NOT_SCORED or SUBMITTED_AI_PENDING:

### B.1 — STUCK_NEEDS_SUBMIT and STUCK_EXPIRED

Use the existing `mock_exam_submit` RPC. Call it AS the student (using a service-role admin client that impersonates via direct SQL, OR a tiny new helper RPC that lets service_role submit for a specific attempt).

The simplest path: write a small **new** RPC `mock_exam_admin_force_submit(p_attempt_id uuid, p_auto boolean)` that:
- Verifies caller is service_role or admin
- Calls the same scoring logic that `mock_exam_submit` uses (or re-uses it via a refactor — see B.4)
- Updates the row
- Logs an event with `event='admin_force_submit'`

**Important:** do NOT change `mock_exam_submit` itself. Add a new RPC alongside it.

```sql
CREATE OR REPLACE FUNCTION public.mock_exam_admin_force_submit(
  p_attempt_id uuid,
  p_auto boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_attempt mock_exam_attempts%ROWTYPE;
  v_exam mock_exams%ROWTYPE;
  v_grammar numeric := 0;
  v_reading numeric := 0;
  v_vocab numeric := 0;
  v_spelling numeric := 0;
  v_writing numeric := 0;
  v_total numeric := 0;
  v_passed boolean;
BEGIN
  -- Authorization: service_role OR admin only (not even trainer — this is a recovery tool)
  IF auth.role() <> 'service_role' THEN
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role <> 'admin' THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  SELECT * INTO v_attempt FROM mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;

  -- Idempotency: if already submitted with non-null score, return existing
  IF v_attempt.is_submitted AND v_attempt.score_total IS NOT NULL AND v_attempt.score_total > 0 THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'idempotent', true, 'message', 'already_submitted_and_scored');
  END IF;

  SELECT * INTO v_exam FROM mock_exams WHERE id = v_attempt.exam_id;

  -- Re-grade ALL non-writing answers (same logic as mock_exam_submit)
  UPDATE mock_exam_answers a
  SET
    is_correct = CASE
      WHEN q.question_type IN ('mcq','true_false','true_false_ng','error_detection')
        THEN a.selected_index IS NOT NULL AND a.selected_index = q.correct_index
      WHEN q.question_type = 'fill_blank'
        THEN a.text_answer IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(q.acceptable_answers) AS aa(val)
               WHERE lower(trim(aa.val)) = lower(trim(a.text_answer))
             )
      ELSE NULL
    END,
    points_awarded = CASE
      WHEN q.question_type IN ('mcq','true_false','true_false_ng','error_detection')
        THEN CASE WHEN a.selected_index = q.correct_index THEN q.points ELSE 0 END
      WHEN q.question_type = 'fill_blank'
        THEN CASE WHEN EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(q.acceptable_answers) AS aa(val)
               WHERE lower(trim(aa.val)) = lower(trim(coalesce(a.text_answer,'')))
             ) THEN q.points ELSE 0 END
      ELSE 0
    END
  FROM mock_exam_questions q
  WHERE q.id = a.question_id AND a.attempt_id = p_attempt_id;

  SELECT
    COALESCE(SUM(CASE WHEN q.section='grammar'    THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='reading'    THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='vocabulary' THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='spelling'   THEN a.points_awarded END), 0)
  INTO v_grammar, v_reading, v_vocab, v_spelling
  FROM mock_exam_answers a
  JOIN mock_exam_questions q ON q.id = a.question_id
  WHERE a.attempt_id = p_attempt_id;

  -- Writing: 0 for now (AI grader will fill in via the existing edge function call below)
  -- If manual override exists, use it
  IF v_attempt.manual_writing_score IS NOT NULL THEN
    v_writing := v_attempt.manual_writing_score;
  ELSE
    v_writing := 0;
  END IF;

  v_total  := ROUND(v_grammar + v_reading + v_vocab + v_spelling + v_writing, 2);
  v_passed := v_total >= v_exam.pass_threshold;

  UPDATE mock_exam_attempts
  SET is_submitted     = true,
      is_auto_submitted = COALESCE(is_auto_submitted, p_auto),
      submitted_at     = COALESCE(submitted_at, now()),
      score_grammar    = v_grammar,
      score_reading    = v_reading,
      score_vocabulary = v_vocab,
      score_spelling   = v_spelling,
      score_writing    = v_writing,
      score_total      = v_total,
      passed           = v_passed,
      ai_writing_status = COALESCE(NULLIF(ai_writing_status,'pending'), 'pending'),
      updated_at       = now()
  WHERE id = p_attempt_id;

  INSERT INTO mock_exam_audit_log(attempt_id, student_id, event, details)
  VALUES (p_attempt_id, v_attempt.student_id, 'admin_force_submit',
          jsonb_build_object('score_total', v_total, 'passed', v_passed, 'auto', p_auto));

  RETURN jsonb_build_object(
    'attempt_id', p_attempt_id,
    'score_total', v_total,
    'passed', v_passed,
    'recovered', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_admin_force_submit(uuid, boolean) TO authenticated, service_role;
```

Apply this RPC via migration `<timestamp>_mock_exam_admin_recovery.sql`.

Then, for each STUCK_* attempt from Phase A, call:
```sql
SELECT public.mock_exam_admin_force_submit('<attempt_id>', <true_if_expired>);
```

For SUBMITTED_NOT_SCORED attempts (already `is_submitted=true` but `score_total IS NULL` or `0` with answers present), call the same RPC — it's idempotent and re-scores.

For SUBMITTED_AI_PENDING (and any recovered attempts that need AI grading), invoke the existing edge function:
```bash
curl -X POST "https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/mock-exam-grade-writing" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"attempt_id":"<attempt_id>"}'
```

### B.2 — Verify each recovery

After each call, re-fetch the attempt row and confirm:
- `is_submitted=true`
- `score_total > 0` (assuming the student actually answered correctly on at least some questions)
- `ai_writing_status` is `graded` or `fallback` within 60 seconds

Print a per-attempt recovery report.

### B.3 — DO NOT auto-reveal recovered results

Keep `is_revealed=false`. Ali will review them in the admin panel + reveal at the end of the window like the rest. This preserves his control over the reveal flow.

---

## PHASE C — Root cause analysis (~5 minutes)

Look for evidence of WHY submit hung for that student. Check:

### C.1 — Edge Function logs

```bash
npx supabase functions logs mock-exam-grade-writing --limit 100
```

Look for timeouts, 500s, or errors around the relevant timeframe (Ali's screenshot timestamp + 5 min window).

### C.2 — Supabase database logs

Use `mcp__supabase__get_logs` to fetch postgres + edge logs for the last few hours. Look for:
- Slow query warnings on `mock_exam_submit`
- RPC errors / timeouts
- Any RLS denials on `mock_exam_answers` (would prevent scoring)

### C.3 — Likely root causes (rank by probability)

The most plausible causes for the stuck submit, ranked:

1. **AI writing edge function blocking the navigation chain.** Look at the current `MockExamAttempt.jsx` `handleConfirmSubmit`: is the `supabase.functions.invoke('mock-exam-grade-writing', ...)` call truly fire-and-forget? It should be `.catch(...)` only, not awaited. **If it's awaited, that's the bug** — Claude on Anthropic side can sometimes take 20+ seconds and the loading spinner stays up. The student gives up.
2. **`safeFlush(saveAnswer)` or `safeFlush(saveWriting)` hanging** if a previous in-flight save is stuck on the server. Verify the timeout behavior.
3. **Network hiccup** during the `mock_exam_submit` RPC call, with no retry on the client.

Document your findings in `docs/MOCK-EXAM-INCIDENT-ROOT-CAUSE.md`.

---

## PHASE D — Frontend resilience (the real fix)

Edit `src/pages/student/mock-exam/MockExamAttempt.jsx`. Specifically the `handleConfirmSubmit` function and the submit modal.

### D.1 — Guarantee the edge function call is non-blocking

Whatever the current code looks like, the kickoff to `mock-exam-grade-writing` MUST be fire-and-forget — not awaited:

```javascript
async function handleConfirmSubmit() {
  if (submitting) return;
  setSubmitting(true);
  setSubmitError(null);

  // Hard timeout — if mock_exam_submit doesn't return within 25s, abort and let user retry
  const submitController = new AbortController();
  const submitTimeoutId = setTimeout(() => submitController.abort(), 25_000);

  try {
    await safeFlush(saveAnswer);
    await safeFlush(saveWriting);

    const submitPromise = supabase.rpc('mock_exam_submit', {
      p_attempt_id: examData.attempt_id,
      p_auto: false,
    });

    // Race the RPC against an abort signal so we never hang indefinitely
    const { data: submitData, error: submitErr } = await Promise.race([
      submitPromise,
      new Promise((_, reject) => {
        submitController.signal.addEventListener('abort', () => reject(new Error('submit_timeout_25s')));
      }),
    ]);

    clearTimeout(submitTimeoutId);

    if (submitErr) throw submitErr;

    // Fire-and-forget — DO NOT AWAIT.
    // If this throws, ignore. If the tab closes, ignore. The trainer can retry from the dashboard.
    try {
      supabase.functions.invoke('mock-exam-grade-writing', {
        body: { attempt_id: examData.attempt_id },
      }).then(
        () => { /* fine */ },
        (err) => console.error('[mock-exam] grade-writing kickoff failed (non-blocking):', err)
      );
    } catch (e) {
      console.error('[mock-exam] grade-writing dispatch threw:', e);
    }

    setSubmitModalOpen(false);
    navigate(`/student/mock-exam/result?attempt_id=${examData.attempt_id}`, { replace: true });
  } catch (e) {
    clearTimeout(submitTimeoutId);
    const msg = String(e?.message || e);
    if (msg === 'submit_timeout_25s') {
      setSubmitError(
        'تأخّر الإرسال أكثر من المعتاد. إجاباتك محفوظة — اضغطي «تسليم» مرة أخرى للمحاولة. ' +
        'إذا تكرّرت المشكلة، تواصلي مع المدرب على WhatsApp ‎+966558669974'
      );
    } else {
      setSubmitError(
        `فشل الإرسال: ${msg}. إجاباتك محفوظة — اضغطي مرة ثانية. ` +
        'إذا تكرّرت المشكلة: WhatsApp ‎+966558669974'
      );
    }
    setSubmitting(false);
  }
}
```

### D.2 — Auto-retry once after a stuck timeout

Inside the submit modal, when `submitError` indicates a timeout, also auto-trigger a single silent retry after 2s (in addition to keeping the manual retry button visible). Add a small counter so we don't infinite-loop:

```javascript
const [autoRetryUsed, setAutoRetryUsed] = useState(false);

useEffect(() => {
  if (
    submitError &&
    submitError.includes('تأخّر الإرسال') &&
    !autoRetryUsed &&
    !submitting
  ) {
    setAutoRetryUsed(true);
    const t = setTimeout(() => {
      handleConfirmSubmit();
    }, 2000);
    return () => clearTimeout(t);
  }
}, [submitError, autoRetryUsed, submitting]);
```

Reset `autoRetryUsed` to false when the modal closes.

### D.3 — Make the modal's submit button text clearer + bigger help

Update the modal's "submitting" state to show a more reassuring message:

```jsx
{submitting ? (
  <>
    <Spinner />
    جاري التسليم — إجاباتكِ محفوظة، لا تغلقي الصفحة...
  </>
) : (
  hasIssues ? 'تسليم على أي حال' : 'نعم، أرسلي الاختبار'
)}
```

If `submitError` is shown, include a prominent "اتصلي بالمدرب" button that opens WhatsApp directly:

```jsx
{submitError && (
  <div className="modal-error">
    {submitError}
    <a
      href="https://wa.me/966558669974"
      target="_blank"
      rel="noopener noreferrer"
      className="contact-instructor-btn"
    >
      تواصل مع المدرب على واتساب
    </a>
  </div>
)}
```

---

## PHASE E — Admin recovery dashboard (small UI addition)

Add a panel to `/admin/mock-exam-results` showing in-flight and stuck attempts so Ali can see at a glance if anyone is stuck and click ONE button to recover.

### E.1 — Stuck-attempts panel

At the top of the admin results page, above the existing per-attempt table, add a section:

```jsx
<StuckAttemptsPanel />
```

Component logic:
- Fetches all current-window attempts where `is_submitted=false` OR (`is_submitted=true` AND `score_total IS NULL`)
- Categorizes them as HEALTHY_IN_PROGRESS vs STUCK_NEEDS_SUBMIT (using the same logic from Phase A.5)
- If any STUCK attempts exist, show them in a prominent yellow/orange card with:
  - Student name + level
  - "Started X min ago"
  - Answers saved: N/35 (or N/39 for B1)
  - Writing word count
  - One-click button: **«استرداد التسليم»** → calls `mock_exam_admin_force_submit` then re-triggers AI grading
  - Status badge update after success

```jsx
async function recoverAttempt(attemptId) {
  if (!confirm('استرداد التسليم لهذه الطالبة؟ سيتم تسليم اختبارها بالإجابات المحفوظة + إعادة تقييم الكتابة بالذكاء الاصطناعي.')) return;
  setRecoveringId(attemptId);
  try {
    const { data, error } = await supabase.rpc('mock_exam_admin_force_submit', {
      p_attempt_id: attemptId,
      p_auto: false,
    });
    if (error) throw error;
    // Re-trigger AI grading
    await supabase.functions.invoke('mock-exam-grade-writing', {
      body: { attempt_id: attemptId },
    });
    alert(`تم الاسترداد. الدرجة المؤقتة: ${data?.score_total}/100`);
    refetch();
  } catch (e) {
    alert(`فشل: ${e.message}`);
  } finally {
    setRecoveringId(null);
  }
}
```

### E.2 — Polling

The stuck-attempts panel auto-refetches every 60 seconds (`refetchInterval: 60_000`) so Ali can leave the dashboard open and see new stuck attempts as they happen.

---

## PHASE F — Verification (~3 minutes)

After Phase D code changes are written, before commit:

1. Re-run the Phase A classification queries
2. Confirm:
   - All STUCK attempts are now SUBMITTED_OK
   - SUBMITTED_NOT_SCORED attempts now have `score_total > 0` (or 0 only if they genuinely answered everything wrong)
   - SUBMITTED_AI_PENDING are now `graded` or `fallback`
3. Sanity-check the AI writing logs for the recovered attempts — confirm Claude grades came through

Document in `docs/MOCK-EXAM-INCIDENT-PHASE-F.md`.

### Smoke-test the new resilience locally

In a dev environment OR by impersonating a test student:
1. Start a test attempt as `mock-test-a1`
2. In DevTools, throttle network to "Slow 3G" or use the offline toggle
3. Click submit
4. Verify the timeout fires at 25s with a clear error
5. Verify auto-retry kicks in once at 27s
6. Verify the "Contact instructor" WhatsApp link works

If you cannot reproduce due to time pressure, document this and note that real students will benefit from the resilience even without local smoke.

---

## PHASE G — Atomic commit + push

```bash
git status
git add -A
git commit -m "fix(mock-exam): stuck-submit recovery + resilience after live incident

Incident: one real student got stuck on 'جاري التسليم...' after a healthy 35/35 + 76-word writing attempt.
Her answers were saved (auto-save did its job) but the submit RPC's chain hung — likely the AI-grading kickoff was inadvertently blocking.

Recovery applied (Phase B):
- New RPC: mock_exam_admin_force_submit (service_role/admin only, idempotent, re-grades answers)
- Recovered <N> stuck attempts via the new RPC + re-triggered AI grading for each
- Audit log entries: event='admin_force_submit'

Frontend resilience (Phase D):
- 25-second AbortController timeout on mock_exam_submit RPC
- Guaranteed fire-and-forget on mock-exam-grade-writing edge function call
- Auto-retry once after a timeout (then user-driven manual retries)
- Reassuring 'إجاباتك محفوظة' messaging during submit
- WhatsApp contact button surfaces on submit error

Admin dashboard (Phase E):
- New StuckAttemptsPanel at top of /admin/mock-exam-results
- Shows in-flight + stuck attempts with one-click 'استرداد التسليم' recovery
- Auto-refetches every 60s

Sacred + existing RPCs untouched. visibility='live' preserved. Backward-compatible with in-progress attempts."
git push origin main
```

Vercel auto-deploys.

---

## PHASE H — Final handoff output

Print to terminal:

```
=== INCIDENT RESOLVED + RESILIENCE DEPLOYED ===
Commit: <sha>

Phase A summary (forensics):
  Total non-test attempts: N
  Buckets: HEALTHY_IN_PROGRESS=N, STUCK_NEEDS_SUBMIT=N, STUCK_EXPIRED=N,
           SUBMITTED_NOT_SCORED=N, SUBMITTED_AI_PENDING=N, SUBMITTED_OK=N

Phase B recovery:
  Recovered attempts: <N> (with per-student names + new scores)
  AI grading re-triggered for: <N> attempts

Phase C root cause:
  <brief findings from logs>

Phase D frontend resilience deployed:
  - 25s timeout + auto-retry on submit
  - Fire-and-forget AI grading call
  - WhatsApp button on submit error

Phase E admin dashboard:
  - StuckAttemptsPanel live at /admin/mock-exam-results
  - One-click recovery available

>>> WHATSAPP MESSAGE FOR ALI TO SEND THE AFFECTED STUDENT(S) <<<
For each recovered student, suggested Arabic message:
─────────────────────────────────────────────
السلام عليكم [الاسم]،
لاحظت أن صفحة التسليم تعطّلت معكِ خلال الاختبار. إجاباتك كانت محفوظة بالكامل في النظام والحمد لله — لم تضيع أي إجابة.

لقد قمت بتسليم اختبارك يدوياً الآن وستظهر لكِ النتيجة في حسابك بمجرد كشف النتائج لجميع الطالبات.

عذراً عن الإزعاج، وقد تم إصلاح المشكلة من جذرها لتجنّب تكرارها.

د. علي
─────────────────────────────────────────────

>>> NEXT ACTIONS FOR ALI <<<
1. Open /admin/mock-exam-results — the StuckAttemptsPanel will show any future stuck attempts in real time
2. WhatsApp the recovered student(s) using the message above
3. Continue letting the exam run — window closes Sat 22 May 22:00 KSA
4. After close: review writing + adjust scores + reveal as planned
```

Go.
