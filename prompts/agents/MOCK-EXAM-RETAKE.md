# MOCK EXAM — URGENT: Give Affected Students Another Attempt

## Context

Ali impersonated a student account and confirmed: students whose original attempt failed (got stuck, scored 0) are now seeing the **RESULT PAGE** showing 0/100 — they cannot start a new attempt. This is because their attempt row in `mock_exam_attempts` is `is_submitted=true, score=0` (auto-submitted by cron with no saved answers).

Ali's directive: **give every affected student a fresh chance to retake the exam**.

But before resetting them, we MUST verify the underlying save-chain bug from the previous prompt was actually fixed. Otherwise their retake will fail the same way.

This prompt does it in three precise steps:
1. Verify the save chain works (smoke test with a real RPC call)
2. Archive the failed submitted attempts (so the start screen appears for them)
3. Verify each affected student now sees "ابدئي الاختبار" instead of the result page

---

## Working context

- **Repo:** `alialahmad2000/fluentia-lms`, branch `main`
- **Supabase ref:** `nmjexpuycmqcxuxljier`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`

## Absolute rules

1. **Phase A read-only.** Confirm the diagnosis before any change.
2. **Verify save chain BEFORE resetting students.** If save_answer still fails, reset is pointless.
3. **Only archive attempts that meet strict criteria.** Don't touch هوازن's real 66.50/100 attempt (if it returned) or anyone whose 0/100 reflects a real performance.
4. **`visibility='live'` preserved.** Cron preserved. Sacred RPCs preserved.
5. **Atomic commit at end.**

---

## PHASE A — Identify exactly who to reset (read-only)

Write findings to `docs/MOCK-EXAM-RETAKE-DIAGNOSIS.md`.

### A.1 — Who needs a retake?

The criteria for "deserves a retake":
- Has a current row in `mock_exam_attempts`
- `is_submitted = true`
- `score_total <= 5` (effectively zero)
- `< 5` answers actually contain data (`selected_index IS NOT NULL` OR `text_answer != ''`) — this proves their answers never reached the DB, not that they answered everything wrong
- `is_test_account = false` (real student, not test)

```sql
WITH attempt_with_real_data AS (
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
    COUNT(ans.id) AS answers_total,
    COUNT(ans.id) FILTER (WHERE ans.selected_index IS NOT NULL OR (ans.text_answer IS NOT NULL AND ans.text_answer != '')) AS answers_with_data
  FROM mock_exam_attempts a
  JOIN profiles p ON p.id = a.student_id
  JOIN auth.users u ON u.id = a.student_id
  JOIN mock_exams e ON e.id = a.exam_id
  LEFT JOIN mock_exam_answers ans ON ans.attempt_id = a.id
  WHERE COALESCE(p.is_test_account, false) = false
    AND a.is_submitted = true
  GROUP BY a.id, p.full_name, u.email, e.code, a.started_at, a.submitted_at,
           a.is_submitted, a.is_auto_submitted, a.score_total,
           a.writing_word_count, a.writing_response
)
SELECT * FROM attempt_with_real_data
ORDER BY answers_with_data, full_name;
```

**Categorize each row:**
- `answers_with_data < 5 AND score_total <= 5` → **NEEDS_RETAKE** (their data never reached DB — they're victims of the save bug, deserve a fresh attempt)
- `answers_with_data >= 5 AND score_total > 0` → **REAL_RESULT** (their score reflects real attempts; don't touch — they made genuine effort)
- `answers_with_data = 0 AND writing_word_count = 0 AND auto_submitted = true` → **CRON_AUTO_SUBMITTED_EMPTY** (cron caught them mid-nothing — they may have just opened the page but never started; needs retake)

Print the classification table clearly. Surface the list of NEEDS_RETAKE students by name.

### A.2 — Verify the save chain actually works now

Critical check: did the previous Save Chain Fix prompt actually fix the underlying bug?

```sql
-- Confirm SECURITY DEFINER on the critical RPCs
SELECT proname, prosecdef AS is_security_definer, proconfig AS search_path
FROM pg_proc
WHERE proname IN ('mock_exam_save_answer','mock_exam_save_writing','mock_exam_submit',
                  'mock_exam_start','mock_exam_admin_force_submit')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname='public');
```

Expected: **every row** should show `is_security_definer = true`. If any is false, that's the root cause we missed and need to fix NOW before resetting students.

### A.3 — Smoke test: actually save an answer as a non-admin user

This is the proof. Create a temporary test attempt for a synthetic user (or use the test student account) and exercise the full save path:

```sql
-- Create a test attempt as a synthetic non-admin user, then exercise save_answer
DO $$
DECLARE
  v_test_user_id uuid;
  v_test_attempt_id uuid;
  v_question_id uuid;
  v_saved_count int;
BEGIN
  -- Use mock-test-a1@fluentia.academy if it exists, else surface and stop
  SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'mock-test-a1@fluentia.academy';
  IF v_test_user_id IS NULL THEN
    RAISE NOTICE 'No test user found — skipping smoke test';
    RETURN;
  END IF;

  -- Clear any existing test attempt
  DELETE FROM mock_exam_attempts WHERE student_id = v_test_user_id;

  -- Set request.jwt.claim.sub to impersonate the test user (forces RLS as that user)
  PERFORM set_config('request.jwt.claim.sub', v_test_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Start a fresh attempt
  v_test_attempt_id := (mock_exam_start('midterm-mock-a1'))::text::uuid;
  RAISE NOTICE 'Created test attempt: %', v_test_attempt_id;

  -- Pick a sample question
  SELECT q.id INTO v_question_id
  FROM mock_exam_questions q
  JOIN mock_exams e ON e.id = q.exam_id
  WHERE e.code = 'midterm-mock-a1' AND q.question_type = 'mcq'
  LIMIT 1;

  -- Try to save an answer
  PERFORM mock_exam_save_answer(v_test_attempt_id, v_question_id, 1, null);

  -- Verify it landed
  SELECT COUNT(*) INTO v_saved_count
  FROM mock_exam_answers
  WHERE attempt_id = v_test_attempt_id
    AND question_id = v_question_id
    AND selected_index = 1;

  IF v_saved_count = 1 THEN
    RAISE NOTICE 'SMOKE TEST PASS: save_answer wrote correctly as non-admin user';
  ELSE
    RAISE WARNING 'SMOKE TEST FAIL: save_answer did NOT persist (count=%) — DO NOT PROCEED WITH RESET', v_saved_count;
  END IF;

  -- Cleanup
  DELETE FROM mock_exam_attempts WHERE id = v_test_attempt_id;
END $$;
```

**If the smoke test FAILS, STOP.** Surface the failure to Ali clearly. Do not proceed to Phase B. The underlying bug is still present and resetting students will just send them into the same broken state.

If the smoke test PASSES, proceed.

---

## PHASE B — Reset the NEEDS_RETAKE students

For each student classified as NEEDS_RETAKE or CRON_AUTO_SUBMITTED_EMPTY in Phase A.1, archive their attempt using the existing `mock_exam_archive_and_reset` RPC:

```sql
DO $$
DECLARE
  r record;
  v_result jsonb;
  v_total int := 0;
BEGIN
  FOR r IN
    WITH attempt_with_real_data AS (
      SELECT
        a.id AS attempt_id,
        COUNT(ans.id) FILTER (WHERE ans.selected_index IS NOT NULL OR (ans.text_answer IS NOT NULL AND ans.text_answer != '')) AS answers_with_data,
        a.score_total
      FROM mock_exam_attempts a
      JOIN profiles p ON p.id = a.student_id
      LEFT JOIN mock_exam_answers ans ON ans.attempt_id = a.id
      WHERE COALESCE(p.is_test_account, false) = false
        AND a.is_submitted = true
      GROUP BY a.id, a.score_total
    )
    SELECT attempt_id
    FROM attempt_with_real_data
    WHERE answers_with_data < 5
      AND COALESCE(score_total, 0) <= 5
  LOOP
    v_result := mock_exam_archive_and_reset(r.attempt_id, 'retake_after_save_chain_fix_2026-05-23');
    v_total := v_total + 1;
    RAISE NOTICE 'Archived: %', v_result;
  END LOOP;
  RAISE NOTICE 'Total archived for retake: %', v_total;
END $$;
```

This:
- Archives the failed attempt (full snapshot preserved in `mock_exam_attempts_archive`)
- Deletes from `mock_exam_attempts` (cascade deletes the answers too)
- After this, when the student loads `/student/mock-exam`, they'll see the intro screen with "ابدئي الاختبار" because there's no current attempt for them

### Sanity check after archive

```sql
-- Confirm the affected students now have ZERO active attempts
WITH archived AS (
  SELECT DISTINCT (ar.attempt_snapshot->>'student_id')::uuid AS student_id
  FROM mock_exam_attempts_archive
  WHERE ar.archive_reason = 'retake_after_save_chain_fix_2026-05-23'
)
SELECT
  p.full_name,
  u.email,
  cl.level_number,
  (SELECT COUNT(*) FROM mock_exam_attempts a WHERE a.student_id = p.id) AS active_attempts_now
FROM archived ar
JOIN profiles p ON p.id = ar.student_id
JOIN auth.users u ON u.id = p.id
LEFT JOIN curriculum_levels cl ON cl.id = p.academic_level
ORDER BY p.full_name;
```

Every row should show `active_attempts_now = 0`. If any shows > 0, surface immediately — the archive RPC may have failed partway.

---

## PHASE C — Verify visibility

For each archived student, verify they can now start a fresh attempt. The frontend's mock-exam landing page should show:
- The intro screen with "ابدئي الاختبار" button
- NOT the result page
- NOT "you've already submitted"

Two ways to verify:

### C.1 — Direct DB simulation

```sql
-- For each affected student, simulate the frontend's landing query
WITH affected AS (
  SELECT DISTINCT (ar.attempt_snapshot->>'student_id')::uuid AS student_id
  FROM mock_exam_attempts_archive
  WHERE ar.archive_reason = 'retake_after_save_chain_fix_2026-05-23'
)
SELECT
  p.full_name,
  u.email,
  e.code AS available_exam,
  e.visibility,
  (SELECT a.id FROM mock_exam_attempts a WHERE a.student_id = p.id AND a.exam_id = e.id LIMIT 1) AS current_attempt_id
FROM affected af
JOIN profiles p ON p.id = af.student_id
JOIN auth.users u ON u.id = p.id
LEFT JOIN curriculum_levels cl ON cl.id = p.academic_level
LEFT JOIN mock_exams e ON e.level_id = cl.id AND e.visibility = 'live'
ORDER BY p.full_name;
```

Every row should show:
- `available_exam` is populated (the right exam matches their level)
- `visibility = 'live'`
- `current_attempt_id IS NULL` (no row in mock_exam_attempts → frontend shows the start screen)

If `current_attempt_id` is null for everyone, **success**. The next time they load the page, they see "ابدئي الاختبار".

### C.2 — Live impersonation (if available)

If Ali's admin dashboard has an impersonation feature, pick ONE affected student and impersonate them:
1. Open `/student/mock-exam`
2. Should see the intro screen
3. Click "ابدئي الاختبار" → should transition to question 1

If both verification paths confirm, we're good.

---

## PHASE D — Re-notify the affected students

For each affected student, send a personalized message via the existing notification system:

```sql
INSERT INTO public.notifications (user_id, type, title, body, data, is_read, created_at)
SELECT
  p.id,
  'announcement',
  '✨ محاولة جديدة جاهزة لكِ',
  'تم إعادة فتح الاختبار التجريبي لكِ بمحاولة فريش. النظام تم تحصينه ضد المشكلة السابقة. ادخلي الآن واختبري — النافذة مفتوحة حتى ١٠م الأحد.',
  jsonb_build_object(
    'kind', 'mock-exam-retake-2026-05-23',
    'priority', 'urgent',
    'action_label', 'الذهاب إلى الاختبار',
    'action_route', '/student/mock-exam',
    'expires_at', '2026-05-24T19:00:00+00:00'
  ),
  false,
  now()
FROM (
  SELECT DISTINCT (ar.attempt_snapshot->>'student_id')::uuid AS student_id
  FROM mock_exam_attempts_archive
  WHERE ar.archive_reason = 'retake_after_save_chain_fix_2026-05-23'
) ar
JOIN profiles p ON p.id = ar.student_id
WHERE p.role = 'student';
```

---

## PHASE E — Atomic commit

```bash
git add -A
git commit -m "fix(mock-exam): give affected students a fresh retake after save-chain repair

Phase A confirmed: <N> students had submitted attempts with score=0 AND
<5 answers_with_data, indicating their answers never reached the DB
(victims of the save chain bug).

Phase A smoke test: SECURITY DEFINER verified on all critical RPCs;
save_answer persists correctly as non-admin user (proof bug is fixed).

Phase B: archived <N> failed attempts with reason='retake_after_save_chain_fix_2026-05-23'.
Each affected student now has zero active attempts → frontend will show
the start screen instead of the 0/100 result page.

Phase C: verified every affected student's state via DB simulation.

Phase D: dispatched personalized in-app notifications.

Sacred RPCs, visibility='live', cron, and archive of prior attempts all preserved."

git push origin main
```

---

## PHASE F — Final handoff

```
=== AFFECTED STUDENTS RESET FOR FRESH RETAKE ===
Commit: <sha>

Save chain verification: ✓ smoke test PASS (or ✗ FAIL with details)

Students given a fresh retake (had score=0 with <5 real answers):
  - <name1> (<email>) — previous attempt: <N> answers / 0 score
  - <name2> (<email>) — previous attempt: <N> answers / 0 score
  - ...

Students NOT touched (real attempts, real scores):
  - <name> — <N> answers / <X> score (genuine effort, real result)
  - ...

>>> WHATSAPP MESSAGES (one per affected student) <<<

For each affected student, paste-ready Arabic:
─────────────────────────────────────────
السلام عليكم [الاسم] 💛

أبشّرك إنه الاختبار التجريبي صار متاح لكِ من جديد بمحاولة فريش. النظام تم إصلاحه بحيث يحفظ كل إجاباتكِ تلقائياً ويسلّمها حتى لو ضعف الاتصال.

عشان تشوفي المحاولة الجديدة:
١. سجّلي خروج من حسابكِ
٢. ادخلي من جديد على app.fluentia.academy
٣. اضغطي «الاختبار التجريبي» من القائمة الجانبية

النافذة مفتوحة حتى ١٠م الأحد ٢٤ مايو بإذن الله.

عذراً عن أي إزعاج، ووفّقكِ الله 🌟

د. علي
─────────────────────────────────────────

>>> ALI'S IMMEDIATE STEPS <<<
1. Send the WhatsApp messages above to each affected student
2. They MUST log out + log back in to clear React Query cache (or refresh hard)
3. Confirm via impersonation OR direct verification that one student sees the intro screen
4. The exam continues — Sunday 22:00 KSA close
```

Go.
