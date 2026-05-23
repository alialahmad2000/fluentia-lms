# MOCK EXAM — SECOND CHANCE + LOSSLESS AUTO-SUBMIT

## Context

After two diagnosed incidents (لمياء + منار with network loss, plus Ali's own gibberish-test attempt), Ali has decided to:

1. **Extend the exam window:** new close = **Sunday 24 May 22:00 KSA** (`2026-05-24T19:00:00+00:00` UTC). The previous close was Saturday 22:00 KSA.
2. **Give every previous participant a fresh, clean attempt.** Wipe their old answers + attempts. They re-enter, the system treats them as new.
3. **Make the system lossless:** even if a student never clicks submit, even if the window closes while she's mid-exam, the system MUST auto-submit her with whatever was saved. Nothing should ever be lost again. The current `mock_exam_submit` is triggered only by the client — we need a server-side cron that catches every attempt whose `expires_at` has passed.
4. **Re-notify** every L1 + L3 student via in-app + email that a fresh attempt is now available with the new deadline.

This is the final launch iteration. After this, the system stays running until Sunday 22:00 KSA when the cron auto-closes everything.

---

## Working context

- **Repo:** `alialahmad2000/fluentia-lms`, branch `main`
- **Supabase ref:** `nmjexpuycmqcxuxljier`
- **Last commit:** `31ec094`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`

---

## Absolute rules

1. **No data destruction without explicit logging.** Every `DELETE` from `mock_exam_attempts` writes a backup row to a new archive table first. This is recoverable, not destructive.
2. **Cron must be idempotent.** Running it twice on the same expired attempt does nothing the second time.
3. **`visibility='live'` preserved.** Don't break in-progress attempts.
4. **Existing 9 RPCs untouched.** Add new ones as needed.
5. **Hooks at top, `profile?.id`, atomic commit, no `vite build` locally.**

---

## TASK 1 — Migration: archive table + cron infrastructure

Apply via `mcp__supabase__apply_migration` named `<timestamp>_mock_exam_second_chance_lossless.sql`:

```sql
-- =============================================================
-- MOCK EXAM — Second chance window + lossless auto-submit
-- Idempotent.
-- =============================================================

-- A.1 Archive table — preserves every attempt + answer before we wipe
CREATE TABLE IF NOT EXISTS public.mock_exam_attempts_archive (
  id              uuid PRIMARY KEY,            -- same as original attempt_id
  archived_at     timestamptz NOT NULL DEFAULT now(),
  archive_reason  text NOT NULL,                -- 'second_chance_2026-05-23'
  archived_by     uuid REFERENCES public.profiles(id),
  attempt_snapshot jsonb NOT NULL,              -- full row
  answers_snapshot jsonb NOT NULL,              -- array of answer rows
  audit_snapshot   jsonb,                       -- audit log rows for the attempt
  ai_log_snapshot  jsonb                        -- ai writing log rows
);

ALTER TABLE public.mock_exam_attempts_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS arch_staff_read ON public.mock_exam_attempts_archive;
CREATE POLICY arch_staff_read ON public.mock_exam_attempts_archive FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- A.2 RPC: archive then reset an attempt (admin/service_role only, idempotent)
CREATE OR REPLACE FUNCTION public.mock_exam_archive_and_reset(
  p_attempt_id uuid,
  p_reason text DEFAULT 'second_chance_2026-05-23'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_attempt mock_exam_attempts%ROWTYPE;
  v_answers jsonb;
  v_audit jsonb;
  v_ai_log jsonb;
BEGIN
  -- Auth: service_role or admin only
  IF auth.role() <> 'service_role' THEN
    SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
    IF v_caller_role <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  END IF;

  SELECT * INTO v_attempt FROM mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'skipped', 'not_found');
  END IF;

  -- Skip if already archived for this reason (idempotent)
  IF EXISTS (
    SELECT 1 FROM mock_exam_attempts_archive
    WHERE id = p_attempt_id AND archive_reason = p_reason
  ) THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'skipped', 'already_archived');
  END IF;

  -- Snapshot answers
  SELECT COALESCE(jsonb_agg(to_jsonb(ans.*)), '[]'::jsonb) INTO v_answers
  FROM mock_exam_answers ans
  WHERE ans.attempt_id = p_attempt_id;

  -- Snapshot audit log
  SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb) INTO v_audit
  FROM mock_exam_audit_log l
  WHERE l.attempt_id = p_attempt_id;

  -- Snapshot AI writing log
  SELECT COALESCE(jsonb_agg(to_jsonb(log.*)), '[]'::jsonb) INTO v_ai_log
  FROM mock_exam_ai_writing_log log
  WHERE log.attempt_id = p_attempt_id;

  -- Insert archive row
  INSERT INTO mock_exam_attempts_archive(id, archive_reason, archived_by, attempt_snapshot, answers_snapshot, audit_snapshot, ai_log_snapshot)
  VALUES (
    p_attempt_id,
    p_reason,
    NULLIF(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    to_jsonb(v_attempt),
    v_answers,
    v_audit,
    v_ai_log
  );

  -- DELETE cascade (mock_exam_answers, audit_log entries that ref this attempt) handled by FK
  DELETE FROM mock_exam_attempts WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', p_attempt_id,
    'archived', true,
    'answers_archived', jsonb_array_length(v_answers),
    'reason', p_reason
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_archive_and_reset(uuid, text) TO authenticated, service_role;

-- A.3 RPC: auto-submit all expired attempts (cron worker calls this)
-- Idempotent. Submits any attempt where expires_at < now() AND is_submitted = false.
CREATE OR REPLACE FUNCTION public.mock_exam_cron_auto_submit_expired()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_processed int := 0;
  v_results jsonb := '[]'::jsonb;
  r record;
  v_submit_result jsonb;
BEGIN
  -- Only service_role can run the cron worker
  IF auth.role() <> 'service_role' THEN
    -- Allow admin too, for manual triggering from dashboard
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  FOR r IN
    SELECT a.id, a.student_id
      FROM mock_exam_attempts a
     WHERE a.is_submitted = false
       AND a.expires_at IS NOT NULL
       AND a.expires_at < now()
  LOOP
    BEGIN
      v_submit_result := mock_exam_admin_force_submit(r.id, true);
      v_processed := v_processed + 1;
      v_results := v_results || jsonb_build_object(
        'attempt_id', r.id,
        'result', v_submit_result
      );

      INSERT INTO mock_exam_audit_log(attempt_id, student_id, event, details)
      VALUES (r.id, r.student_id, 'cron_auto_submit',
              jsonb_build_object('result', v_submit_result));
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO mock_exam_audit_log(attempt_id, student_id, event, details)
      VALUES (r.id, r.student_id, 'cron_auto_submit_failed',
              jsonb_build_object('error', SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'results', v_results);
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_cron_auto_submit_expired() TO authenticated, service_role;

-- A.4 pg_cron schedule: every 1 minute
-- (Verify pg_cron extension is enabled on the project; if not, surface and stop)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old schedule if exists
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname = 'mock-exam-auto-submit-expired';
    -- Schedule new
    PERFORM cron.schedule(
      'mock-exam-auto-submit-expired',
      '* * * * *',  -- every minute
      $cron$SELECT public.mock_exam_cron_auto_submit_expired();$cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled — cron skipped. Manually trigger mock_exam_cron_auto_submit_expired() periodically OR enable pg_cron.';
  END IF;
END $$;
```

### Smoke test

```sql
-- Confirm archive table + RPCs
SELECT to_regclass('public.mock_exam_attempts_archive');
SELECT routine_name FROM information_schema.routines
 WHERE routine_schema='public'
   AND routine_name IN ('mock_exam_archive_and_reset','mock_exam_cron_auto_submit_expired');
-- expected: 2 routines

-- Confirm cron job (if pg_cron enabled)
SELECT jobname, schedule, command FROM cron.job WHERE jobname='mock-exam-auto-submit-expired';
```

**If pg_cron is NOT enabled on this project:**
- Surface immediately
- Fall back to: add a Supabase Edge Function `mock-exam-cron-worker` that calls `mock_exam_cron_auto_submit_expired()`, and have Ali set up a scheduled invocation (Supabase has Edge Function schedules, OR an external cron pinging the URL every minute)
- Document the fallback in the report

---

## TASK 2 — Update exam window

```sql
UPDATE mock_exams
   SET open_at  = '2026-05-22T19:00:00+00:00',   -- unchanged: Fri 22 May 22:00 KSA
       close_at = '2026-05-24T19:00:00+00:00',   -- NEW: Sun 24 May 22:00 KSA
       updated_at = now()
 WHERE code IN ('midterm-mock-a1','midterm-mock-b1');

-- Verify
SELECT code, visibility,
       (open_at AT TIME ZONE 'Asia/Riyadh') AS open_ksa,
       (close_at AT TIME ZONE 'Asia/Riyadh') AS close_ksa
  FROM mock_exams ORDER BY code;
-- expected: close_ksa = 2026-05-24 22:00 for both
```

---

## TASK 3 — Archive + reset all prior attempts

Run a single SQL block that archives + deletes every existing attempt (including Ali's tests). This is intentional — all past participants get a clean slate per Ali's directive.

```sql
-- Archive + reset every prior attempt
DO $$
DECLARE
  r record;
  v_result jsonb;
  v_total int := 0;
BEGIN
  FOR r IN SELECT id FROM mock_exam_attempts ORDER BY started_at
  LOOP
    v_result := mock_exam_archive_and_reset(r.id, 'second_chance_2026-05-23');
    v_total := v_total + 1;
    RAISE NOTICE 'Archived attempt %: %', v_total, v_result;
  END LOOP;
  RAISE NOTICE 'Total archived: %', v_total;
END $$;

-- Verify the wipe + archive
SELECT 'attempts' AS table_name, COUNT(*) FROM mock_exam_attempts
UNION ALL
SELECT 'archive' AS table_name, COUNT(*) FROM mock_exam_attempts_archive
WHERE archive_reason = 'second_chance_2026-05-23';
-- expected: mock_exam_attempts = 0; archive = same count as before (we had 4)

-- Also clear stale audit + AI log entries that reference archived attempts
-- (Optional, but cleaner. The FK cascade may have handled this — verify.)
SELECT COUNT(*) FROM mock_exam_audit_log;
SELECT COUNT(*) FROM mock_exam_ai_writing_log;
```

---

## TASK 4 — Re-notify all eligible students

### 4.1 Reset the launch log entries (so the email function will send again)

The email Edge Function `send-mock-exam-launch-emails` is idempotent — it checks `mock_exam_launch_notification_log` and skips students who already received an email. Reset that:

```sql
-- Archive the old launch log for audit, then clear it so emails will resend
CREATE TABLE IF NOT EXISTS mock_exam_launch_notification_log_archive AS
TABLE mock_exam_launch_notification_log WITH NO DATA;

INSERT INTO mock_exam_launch_notification_log_archive
SELECT * FROM mock_exam_launch_notification_log;

DELETE FROM mock_exam_launch_notification_log;
```

### 4.2 Update the email subject + body for the second-chance announcement

In `supabase/functions/send-mock-exam-launch-emails/index.ts`, find the `buildEmail` function. **Add an `isSecondChance` flag** that uses a different subject + body:

```typescript
function buildEmail(fullName: string, level: number, isSecondChance: boolean = false) {
  const levelCode = level === 1 ? 'A1' : 'B1';
  const duration  = level === 1 ? '٧٥ دقيقة' : '٩٠ دقيقة';
  const minWords  = level === 1 ? '٥٠ كلمة' : '٨٠ كلمة';

  if (isSecondChance) {
    const subject = `🔄 فرصة جديدة للاختبار التجريبي — حتى الأحد ١٠م`;
    const text = `السلام عليكم ${fullName}،

بسبب مشكلات تقنية واجهتها بعض الطالبات خلال الاختبار التجريبي السابق (انقطاعات شبكة لم يكن النظام يحذّر منها)، قررت إعادة فتح الاختبار من جديد للجميع بمحاولة فريش.

الموعد الجديد:
🕙 من الآن
   إلى ١٠م الأحد ٢٤ مايو ٢٠٢٦ (نافذة موسّعة)

ما الذي تغيّر:
• محاولاتكِ السابقة تم أرشفتها وستحصلين على بداية جديدة
• النظام الآن يحفظ كل إجابة تلقائياً ويسلّمها حتى لو انقطع الإنترنت
• تنبيه واضح يظهر فوراً لو لم يصل الحفظ للنظام

للبدء:
١. ادخلي على app.fluentia.academy
٢. اضغطي "الاختبار التجريبي" من القائمة الجانبية
٣. اضغطي "ابدئي الاختبار"

تذكير:
• المدة: ${duration} من لحظة البدء
• محاولة واحدة جديدة فقط
• الكتابة لا تقل عن ${minWords}

للدعم الفني: WhatsApp +966558669974

اعتذر عن أي إزعاج، ووفّقكِ الله 🌟

د. علي الأحمد`;

    const html = `<!-- same template style as the original email, with new subject + new body -->
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,'Segoe UI','Tahoma',sans-serif;direction:rtl;text-align:right;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0f;padding:32px 16px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#13131a;border-radius:16px;border:1px solid #2a2a35;overflow:hidden;">
<tr><td style="padding:32px 32px 16px;border-bottom:1px solid #2a2a35;">
<h1 style="margin:0;color:#d4af37;font-size:24px;font-weight:700;">طلاقة | Fluentia Academy</h1>
</td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;color:#e5e5ec;font-size:16px;line-height:1.8;">السلام عليكم ${fullName}،</p>
<p style="margin:0 0 16px;color:#e5e5ec;font-size:16px;line-height:1.8;">
بسبب مشكلات تقنية واجهتها بعض الطالبات خلال الاختبار السابق (انقطاعات شبكة لم يكن النظام يحذّر منها)،
قررت <strong style="color:#d4af37;">إعادة فتح الاختبار من جديد</strong> للجميع بمحاولة فريش.
</p>
<div style="background:#1a1a23;border-right:4px solid #d4af37;padding:16px 20px;border-radius:8px;margin:24px 0;">
<p style="margin:0;color:#e5e5ec;font-size:18px;font-weight:600;line-height:1.6;">
🕙 الموعد الجديد: من الآن<br>إلى ١٠م الأحد ٢٤ مايو ٢٠٢٦<br>
<span style="font-size:14px;color:#a5a5b5;font-weight:normal;">(نافذة موسّعة)</span>
</p>
</div>
<p style="margin:0 0 8px;color:#d4af37;font-size:18px;font-weight:600;">ما الذي تحسّن:</p>
<ul style="margin:0 0 24px;padding-right:24px;color:#e5e5ec;font-size:15px;line-height:2;">
<li>محاولاتكِ السابقة تم أرشفتها، وستحصلين على <strong>بداية جديدة</strong></li>
<li>النظام الآن يحفظ كل إجابة تلقائياً ويسلّمها <strong>حتى لو انقطع الإنترنت</strong></li>
<li>تنبيه واضح يظهر فوراً لو لم يصل الحفظ للنظام</li>
</ul>
<div style="text-align:center;margin:32px 0;">
<a href="https://app.fluentia.academy/student/mock-exam"
style="display:inline-block;background:#d4af37;color:#0a0a0f;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
ابدئي الاختبار الجديد
</a>
</div>
<p style="margin:24px 0 8px;color:#a5a5b5;font-size:14px;">
للدعم الفني: WhatsApp <a href="https://wa.me/966558669974" style="color:#d4af37;text-decoration:none;">+966 55 866 9974</a>
</p>
<p style="margin:16px 0 0;color:#d4af37;font-size:16px;font-weight:600;">وفّقكِ الله 🌟</p>
<p style="margin:24px 0 0;color:#a5a5b5;font-size:14px;line-height:1.6;">
د. علي الأحمد<br><span style="color:#7a7a8a;">أكاديمية طلاقة</span>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    return { subject, html, text };
  }

  // Original (first-chance) email — unchanged from launch
  // [...keep existing buildEmail body for the first-chance path]
  // ...
}
```

Then update the function's POST handler to accept a query param `?second_chance=true` (or a body flag) that sets `isSecondChance=true` for this batch.

### 4.3 Update the in-app notification

For the in-app notification, insert a NEW notification (different `kind` so it's distinct from the first one, doesn't trigger ON CONFLICT):

```sql
-- Adapt this to the actual notifications table discovered in the launch prompt
-- (probably public.notifications based on the previous handoff)

INSERT INTO public.notifications (
  user_id, type, title, body, data, is_read, created_at
)
SELECT
  p.id,
  'announcement',
  '🔄 فرصة جديدة للاختبار التجريبي',
  CASE
    WHEN cl.level_number = 1 THEN
      'تم إعادة فتح الاختبار التجريبي للجميع. عندكِ محاولة جديدة من الصفر. النافذة الجديدة تنتهي ١٠م الأحد ٢٤ مايو. النظام الآن يحفظ كل شيء تلقائياً.'
    ELSE
      'تم إعادة فتح الاختبار التجريبي للجميع. عندكِ محاولة جديدة من الصفر. النافذة الجديدة تنتهي ١٠م الأحد ٢٤ مايو. النظام الآن يحفظ كل شيء تلقائياً.'
  END,
  jsonb_build_object(
    'kind', 'mock-exam-second-chance-2026-05-23',
    'priority', 'high',
    'action_label', 'الذهاب إلى الاختبار',
    'action_route', '/student/mock-exam',
    'expires_at', '2026-05-24T19:00:00+00:00'
  ),
  false,
  now()
FROM profiles p
JOIN curriculum_levels cl ON cl.id = p.academic_level
WHERE p.role = 'student'
  AND cl.level_number IN (1, 3)
  AND COALESCE(p.is_test_account, false) = false;
```

(Adapt column names to match the actual `public.notifications` schema discovered previously.)

### 4.4 Invoke the email send (second-chance variant)

After deploying the updated `send-mock-exam-launch-emails`:

```bash
curl -X POST "https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/send-mock-exam-launch-emails?second_chance=true" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response: `{ success: true, total_eligible: 20, sent: 20, failed: 0, skipped: 0 }`

---

## TASK 5 — Optional: re-trigger AI grading for any future auto-submitted attempts

The cron RPC `mock_exam_cron_auto_submit_expired` calls `mock_exam_admin_force_submit` which submits but **does not invoke the AI grading edge function** (because the edge function lives outside Postgres).

To handle this, add a SECOND cron job (or extend the existing one) that, after auto-submitting, also calls the AI grading function via `pg_net.http_post` if available:

```sql
-- After-submit AI grading trigger (best-effort)
CREATE OR REPLACE FUNCTION public.mock_exam_cron_grade_pending_writing()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_processed int := 0;
  v_request_id bigint;
BEGIN
  -- Only run if pg_net is available
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN jsonb_build_object('skipped', 'pg_net_not_enabled');
  END IF;

  FOR r IN
    SELECT id FROM mock_exam_attempts
     WHERE is_submitted = true
       AND ai_writing_status = 'pending'
       AND submitted_at < now() - interval '2 minutes'  -- give the client a chance first
  LOOP
    BEGIN
      SELECT INTO v_request_id net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/mock-exam-grade-writing',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object('attempt_id', r.id)
      );
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      -- swallow errors; admin can retry from dashboard
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed);
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job WHERE jobname = 'mock-exam-grade-pending-writing';
    PERFORM cron.schedule(
      'mock-exam-grade-pending-writing',
      '*/2 * * * *',  -- every 2 minutes
      $cron$SELECT public.mock_exam_cron_grade_pending_writing();$cron$
    );
  END IF;
END $$;
```

**If `pg_net` or supabase settings aren't available:** the existing trainer dashboard "إعادة التقييم" button still works as a manual fallback. Document this clearly.

---

## TASK 6 — QA + smoke

### 6.1 Verify cron is scheduled
```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname LIKE 'mock-exam-%';
```

### 6.2 Force-trigger the cron worker once to make sure it runs cleanly
```sql
SELECT mock_exam_cron_auto_submit_expired();
-- Should return { processed: 0, results: [] } if no attempts are currently expired
```

### 6.3 Confirm the wipe was clean
```sql
SELECT COUNT(*) AS active_attempts FROM mock_exam_attempts;
SELECT COUNT(*) AS archived FROM mock_exam_attempts_archive WHERE archive_reason = 'second_chance_2026-05-23';
SELECT COUNT(*) AS pending_in_app FROM notifications WHERE data->>'kind' = 'mock-exam-second-chance-2026-05-23';
SELECT exam_code, status, COUNT(*) FROM mock_exam_launch_notification_log
 WHERE created_at > now() - interval '15 minutes'
 GROUP BY exam_code, status;
```

### 6.4 Smoke test with mock-test-a1
- Log in as the test A1 student in a fresh incognito
- Confirm: sidebar shows "الاختبار التجريبي"
- Click → intro screen (since we're inside the open window)
- Start → answer 3-4 questions → close tab WITHOUT submitting
- Wait 1 minute → check DB:
  ```sql
  SELECT id, is_submitted, expires_at, score_total FROM mock_exam_attempts
   WHERE student_id IN (SELECT id FROM profiles WHERE is_test_account = true);
  ```
- The attempt should still be `is_submitted=false` because `expires_at` is in the future (75 min away)
- Manually set `expires_at = now() - interval '1 second'` for this attempt:
  ```sql
  UPDATE mock_exam_attempts SET expires_at = now() - interval '1 second' WHERE id = '<test_attempt_id>';
  ```
- Wait up to 60s for the cron tick
- Confirm: `is_submitted=true`, `is_auto_submitted=true`, `score_total > 0` (only points from the 3-4 questions answered)
- This proves the lossless auto-submit works end-to-end.

### 6.5 Clean up after smoke
```sql
DELETE FROM mock_exam_attempts WHERE student_id IN (SELECT id FROM profiles WHERE is_test_account = true);
```

---

## TASK 7 — Atomic commit

```bash
git add -A
git commit -m "feat(mock-exam): second chance window + lossless auto-submit

- Extended exam window: now → Sun 24 May 22:00 KSA (was Sat 22:00)
- Archived all 4 prior attempts via mock_exam_archive_and_reset
  (لمياء + منار + 2 of Ali's tests). Wiped from active tables;
  preserved in mock_exam_attempts_archive with full snapshot.
- New cron job: mock_exam_cron_auto_submit_expired runs every minute,
  catches any attempt with expires_at < now() AND is_submitted=false,
  force-submits via mock_exam_admin_force_submit. System is now LOSSLESS.
- New cron job: mock_exam_cron_grade_pending_writing runs every 2 min,
  invokes the AI grading edge function for any auto-submitted attempt
  with ai_writing_status='pending'.
- Re-notify: cleared launch_notification_log, updated email template
  with second-chance variant, fired email + in-app to all 20 L1+L3 students.
- visibility='live' preserved. All existing RPCs preserved.
- Cron infrastructure via pg_cron (with pg_net for AI invocation);
  manual fallback documented if extensions unavailable."

git push origin main
```

---

## TASK 8 — Final handoff

```
=== SECOND CHANCE OPEN — LOSSLESS SYSTEM LIVE ===
Commit: <sha>

Exam window: now → Sun 24 May 22:00 KSA
Prior attempts archived: 4 (snapshots in mock_exam_attempts_archive)
Active attempts wiped: 4 → 0
Cron jobs scheduled:
  - mock-exam-auto-submit-expired (every 1 min)
  - mock-exam-grade-pending-writing (every 2 min, if pg_net available)

Notifications dispatched:
  - In-app: 20 (different kind from first launch, so badge re-pings)
  - Email:  20 sent / 0 failed / 0 skipped (second-chance template)

>>> ALI'S NEXT STEPS <<<
1. Wait ~2 min for Vercel + Edge Function deploy
2. Check your own email inbox — confirm the second-chance email arrived
3. Open admin dashboard → confirm "محاولات تحتاج تدخّل" panel is empty
4. (Optional) Telegram: send a short follow-up like:
   "أحبتي، أعدت فتح الاختبار التجريبي للجميع بمحاولة فريش حتى الأحد ١٠م.
    النظام الآن يحفظ إجاباتكن تلقائياً ويسلّمها حتى لو انقطع الإنترنت.
    وفّقكن الله 🌟"
5. Sleep. The system auto-submits any expired attempt every minute.
   At Sunday 22:00 KSA the cron will sweep any unsubmitted attempts.
6. Sunday after 22:00: review writing scores in admin + reveal results.

>>> KILL SWITCH (if anything goes wrong) <<<
UPDATE mock_exams SET is_active = false WHERE code IN ('midterm-mock-a1','midterm-mock-b1');

>>> RECOVERY VIA ARCHIVE (if needed) <<<
SELECT id, archive_reason, attempt_snapshot->>'student_id' AS student,
       attempt_snapshot->>'score_total' AS old_score, archived_at
  FROM mock_exam_attempts_archive
 ORDER BY archived_at DESC;
```

Go.
