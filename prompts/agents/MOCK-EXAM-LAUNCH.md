# MOCK EXAM — LAUNCH: Window Update + Go-Live + Notifications + Emails

## Context

The mock exam is built, tested, and sitting in `visibility='preview'` (commit 65cddf7). Ali is ready to launch. He needs:

1. The exam window updated to **Friday 22 May 2026 22:00 KSA → Saturday 23 May 2026 22:00 KSA** (24-hour window). The current DB window points at May 21→22, which has passed — must be updated.
2. The exam flipped to `visibility='live'` so real L1 and L3 students see the sidebar entry.
3. **In-app notification** delivered to every L1 + L3 student so they see "الاختبار التجريبي متاح الآن" on the dashboard.
4. **Email** sent to every L1 + L3 student via Resend (the project's existing email service) with the launch announcement. Ali has explicitly said: he will NOT send emails manually. The Edge Function or script must send them automatically as part of this prompt's execution.

Ali is busy. This prompt executes everything end-to-end, idempotently, with no manual steps required.

## Working context

- **Repo:** `alialahmad2000/fluentia-lms` (branch `main`)
- **Supabase ref:** `nmjexpuycmqcxuxljier` (Frankfurt Pro)
- **Working dir:** confirm actual path on this machine
- **Auto-load skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Last commit:** `65cddf7` (AI writing grading)
- **Resend domain:** `fluentia.academy` (verified)
- **Resend API key:** in Supabase secrets as `RESEND_API_KEY` (verify; if missing, surface and stop)
- **Existing in-app comms:** the "God Comm" system referenced in the codebase. Discover the exact table/insertion mechanism via Phase A.

## Absolute rules

1. **Sacred tables untouched.** No edits to curriculum, RLS of existing tables, xp_*, unit_mastery_*.
2. **Existing mock exam RPCs and frontend untouched.** Only ADD: new notification table + new Edge Function for emails + small in-app banner if needed.
3. **All comms idempotent.** Re-running this prompt's launch sequence must NOT double-send emails or duplicate notifications. Use a log table with UNIQUE constraint per `(student_id, channel, exam_code)`.
4. **Atomic commit at end.**
5. **No `vite build` locally.** Vercel builds.
6. **Discover before assuming.** Confirm the actual columns on `profiles` (email vs auth.users join), the structure of any existing notifications table, whether a Resend Edge Function already exists.
7. **No manual steps for Ali.** Everything triggered from this prompt's execution.

---

## TASK 1 — Phase A: Quick discovery (5 minutes, no edits)

Surface these answers before doing anything else. Write findings to `docs/MOCK-EXAM-LAUNCH-PHASE-A.md` and to terminal.

### A.1 Student email source
- Does `profiles` have an `email` column? Or do we read from `auth.users.email` via `id` join?
- Run:
  ```sql
  SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='profiles'
   ORDER BY ordinal_position;
  ```
- Sample one student row to confirm the email is reachable. Redact in the report.

### A.2 L1 + L3 student list (the actual recipients)
```sql
SELECT p.id,
       p.full_name,
       u.email,
       cl.level_number
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN curriculum_levels cl ON cl.id = p.academic_level   -- adjust column name if different
 WHERE cl.level_number IN (1, 3)
   AND p.role = 'student'
   AND COALESCE(p.is_test_account, false) = false
 ORDER BY cl.level_number, p.full_name;
```
- Note: the previous Phase A discovered that `profiles.level_id` doesn't exist on this DB and the level resolves via `profiles.academic_level → curriculum_levels.level_number`. Use whichever pattern was confirmed. Adjust the column name if necessary.
- Expected count: ~10 L1 + ~7-8 L3 = ~17-18 students total. Flag any mismatch.
- Confirm EVERY student has a non-null email. Surface any with missing email — those will be skipped from the email send (in-app notification still goes to them).

### A.3 Existing notification infrastructure
- Look for any table named `notifications`, `user_notifications`, `comms`, `god_comm_*`, `inbox_*`, or similar:
  ```sql
  SELECT table_name FROM information_schema.tables
   WHERE table_schema='public'
     AND (table_name ILIKE '%notif%' OR table_name ILIKE '%comm%' OR table_name ILIKE '%inbox%' OR table_name ILIKE '%message%')
   ORDER BY table_name;
  ```
- If found: dump columns + 1 sample row (redacted) + check if there's a known display component pattern (search `src/` for the table name).
- If NOT found: we'll create a minimal banner on the student dashboard that reads from a new lightweight `student_announcements` table. Document this as the chosen path.

### A.4 Resend integration
- Confirm `RESEND_API_KEY` exists in Supabase secrets:
  ```bash
  npx supabase secrets list | grep -i resend
  ```
- Look for any existing email Edge Functions:
  ```bash
  ls supabase/functions/ | grep -iE "email|resend|mail|notify"
  ```
- If an existing email function exists, document its signature and we'll reuse the Resend client setup pattern. If not, the new function will use direct `fetch` calls to `https://api.resend.com/emails`.

### A.5 Confirm exam state before launch
```sql
SELECT id, code, level_id, open_at, close_at, visibility, is_active
  FROM mock_exams
 ORDER BY code;
```
Document the current values. We'll update them in Phase C.

After Phase A is documented, proceed automatically to Phase B (no waiting).

---

## TASK 2 — Phase B: Idempotent migration (notifications + launch log)

Apply via `mcp__supabase__apply_migration` named `<timestamp>_mock_exam_launch_comms.sql`:

```sql
-- =============================================================
-- MOCK EXAM LAUNCH — comms tables (idempotent)
-- =============================================================

-- Launch notification log: prevents double-send when re-running
CREATE TABLE IF NOT EXISTS public.mock_exam_launch_notification_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel     text NOT NULL CHECK (channel IN ('email','in_app')),
  exam_code   text NOT NULL,
  status      text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  details     jsonb,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, channel, exam_code)
);
ALTER TABLE public.mock_exam_launch_notification_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS launch_log_staff ON public.mock_exam_launch_notification_log;
CREATE POLICY launch_log_staff ON public.mock_exam_launch_notification_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- Student-facing announcements (banner shown on dashboard)
-- Only created if Phase A confirmed no existing notifications table.
-- If existing table exists (e.g. `notifications`, `god_comm_messages`), USE THAT INSTEAD and skip this.
CREATE TABLE IF NOT EXISTS public.student_announcements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind            text NOT NULL,             -- 'mock-exam-launch' for this one
  title_ar        text NOT NULL,
  body_ar         text NOT NULL,
  action_label_ar text,
  action_route    text,
  priority        text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  is_read         boolean NOT NULL DEFAULT false,
  read_at         timestamptz,
  is_dismissed    boolean NOT NULL DEFAULT false,
  dismissed_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, kind)                  -- one announcement per kind per student (idempotent)
);
ALTER TABLE public.student_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ann_owner_select ON public.student_announcements;
CREATE POLICY ann_owner_select ON public.student_announcements FOR SELECT
  USING (student_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

DROP POLICY IF EXISTS ann_owner_update ON public.student_announcements;
CREATE POLICY ann_owner_update ON public.student_announcements FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- RPC for the student to dismiss an announcement
CREATE OR REPLACE FUNCTION public.dismiss_student_announcement(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.student_announcements
     SET is_dismissed = true,
         dismissed_at = now()
   WHERE id = p_id AND student_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.dismiss_student_announcement(uuid) TO authenticated;
```

### Smoke
```sql
SELECT to_regclass('public.mock_exam_launch_notification_log'),
       to_regclass('public.student_announcements');
-- expected: both non-null

-- If Phase A discovered existing notifications/god_comm table, also confirm we can write to it
```

**Important branch:** if Phase A.3 found an EXISTING notifications/comms table, use that for the in-app notification instead of creating `student_announcements`. Document the choice. Either way, idempotency must work via a unique key on the kind + student.

---

## TASK 3 — Phase C: Update exam window + atomic launch SQL

Run a single transaction that:
1. Updates the exam window
2. Flips visibility to live

```sql
BEGIN;

UPDATE public.mock_exams
   SET open_at  = '2026-05-22T19:00:00+00:00',   -- Friday 22 May 22:00 KSA
       close_at = '2026-05-23T19:00:00+00:00',   -- Saturday 23 May 22:00 KSA
       updated_at = now()
 WHERE code IN ('midterm-mock-a1','midterm-mock-b1');

-- DO NOT flip visibility yet — keep preview until after the verification below.

-- Verify
SELECT code,
       (open_at AT TIME ZONE 'Asia/Riyadh') AS open_at_ksa,
       (close_at AT TIME ZONE 'Asia/Riyadh') AS close_at_ksa,
       visibility, is_active
  FROM mock_exams
 ORDER BY code;
-- Expected: both rows show open_at_ksa = 2026-05-22 22:00, close_at_ksa = 2026-05-23 22:00

COMMIT;
```

**Critical:** verify the KSA-local times look correct BEFORE flipping visibility. If something looks off (off-by-one day, wrong hour), stop and surface.

Then, **after** verifying the window is correct, flip visibility in a separate SQL:

```sql
UPDATE public.mock_exams
   SET visibility = 'live',
       updated_at = now()
 WHERE code IN ('midterm-mock-a1','midterm-mock-b1');

SELECT code, visibility FROM mock_exams ORDER BY code;
-- expected: both 'live'
```

Print to terminal: `"Exam window updated and flipped to LIVE. Notification dispatch starting..."`

---

## TASK 4 — Phase D: In-app notification dispatch

Insert one announcement per L1 + L3 student (excluding test accounts). Use ON CONFLICT to make it idempotent.

```sql
-- If you discovered an existing notifications table in Phase A.3, adapt this query to that table's schema.
-- Otherwise use student_announcements:

INSERT INTO public.student_announcements (
  student_id, kind, title_ar, body_ar,
  action_label_ar, action_route, priority, expires_at
)
SELECT
  p.id,
  'mock-exam-launch-2026-05-22',                              -- unique kind to prevent re-insertion
  'الاختبار التجريبي للوحدات ١-٤ متاح الآن',
  CASE
    WHEN cl.level_number = 1 THEN
      'يفتح الاختبار التجريبي للمستوى A1 من الساعة ١٠ مساءً اليوم (الجمعة ٢٢ مايو) حتى ١٠ مساءً غدًا (السبت ٢٣ مايو). نافذة ٢٤ ساعة كاملة للحلّ — اختاري الوقت المناسب لكِ. المدة ٧٥ دقيقة من لحظة البدء، ومحاولة واحدة فقط. وفّقكِ الله.'
    ELSE
      'يفتح الاختبار التجريبي للمستوى B1 من الساعة ١٠ مساءً اليوم (الجمعة ٢٢ مايو) حتى ١٠ مساءً غدًا (السبت ٢٣ مايو). نافذة ٢٤ ساعة كاملة للحلّ — اختاري الوقت المناسب لكِ. المدة ٩٠ دقيقة من لحظة البدء، ومحاولة واحدة فقط. وفّقكِ الله.'
  END,
  'الذهاب إلى الاختبار',
  '/student/mock-exam',
  'high',
  '2026-05-23T19:00:00+00:00'                                  -- expires when exam closes
FROM profiles p
JOIN curriculum_levels cl ON cl.id = p.academic_level         -- adjust if column name differs
WHERE p.role = 'student'
  AND cl.level_number IN (1, 3)
  AND COALESCE(p.is_test_account, false) = false
ON CONFLICT (student_id, kind) DO NOTHING;
```

After insert, log each as 'sent' in the launch log:

```sql
INSERT INTO public.mock_exam_launch_notification_log (student_id, channel, exam_code, status, details)
SELECT p.id, 'in_app',
       CASE WHEN cl.level_number = 1 THEN 'midterm-mock-a1' ELSE 'midterm-mock-b1' END,
       'sent',
       jsonb_build_object('source','phase_d', 'inserted_at', now())
FROM profiles p
JOIN curriculum_levels cl ON cl.id = p.academic_level
WHERE p.role = 'student'
  AND cl.level_number IN (1, 3)
  AND COALESCE(p.is_test_account, false) = false
ON CONFLICT (student_id, channel, exam_code) DO NOTHING;
```

Report: print the row count of new announcements inserted + the new log rows.

### Frontend banner component

If Phase A.3 discovered NO existing notifications UI, add a small dashboard banner:

**File:** `src/components/student/AnnouncementBanner.jsx` (new)

```jsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function AnnouncementBanner() {
  const profile = useAuthStore(s => s.profile);
  const navigate = useNavigate();

  const { data: announcements, refetch } = useQuery({
    queryKey: ['student-announcements', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('student_announcements')
        .select('*')
        .eq('student_id', profile.id)
        .eq('is_dismissed', false)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('priority', { ascending: false })   // urgent first
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  });

  if (!announcements || announcements.length === 0) return null;

  async function dismiss(id) {
    await supabase.rpc('dismiss_student_announcement', { p_id: id });
    refetch();
  }

  return (
    <div className="announcement-stack">
      {announcements.map(a => (
        <div key={a.id} className={`announcement priority-${a.priority}`}>
          <div className="announcement-body">
            <h3>{a.title_ar}</h3>
            <p>{a.body_ar}</p>
          </div>
          <div className="announcement-actions">
            {a.action_route && (
              <button onClick={() => navigate(a.action_route)}>
                {a.action_label_ar || 'فتح'}
              </button>
            )}
            <button className="ghost" onClick={() => dismiss(a.id)}>
              إخفاء
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

Mount this component at the top of the student dashboard layout (find the file via grep — likely `src/pages/student/StudentDashboard.jsx` or `src/layouts/StudentLayout.jsx`). Place it just below the top header so it's the first thing visible on dashboard load.

Style with theme tokens, RTL-friendly, accent border for `high`/`urgent` priorities.

If Phase A.3 DID find an existing notifications UI, skip the banner component — students will see the notification through the existing system.

---

## TASK 5 — Phase E: Email dispatch via Resend

### Build the Edge Function

Path: `supabase/functions/send-mock-exam-launch-emails/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API = 'https://api.resend.com/emails';
const FROM = 'أكاديمية طلاقة <noreply@fluentia.academy>';
const REPLY_TO = 'ali@fluentia.academy';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY missing');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Optional auth check: only admins can trigger this (the caller must include service_role OR an admin JWT)
    // The function itself uses service_role internally for the DB queries.
    // If you want stricter auth, decode the Authorization header and check role.

    // Fetch eligible students (L1 + L3, not test accounts) with their email
    // Adjust the column name `academic_level` if Phase A confirmed it differs
    const { data: students, error: sErr } = await admin
      .from('profiles')
      .select('id, full_name, academic_level, curriculum_levels:academic_level(level_number)')
      .eq('role', 'student')
      .eq('is_test_account', false);
    if (sErr) throw sErr;

    // Filter to L1/L3 only and enrich with email from auth.users
    const eligible = (students || []).filter(s =>
      s.curriculum_levels?.level_number === 1 || s.curriculum_levels?.level_number === 3
    );
    if (eligible.length === 0) throw new Error('no_eligible_students');

    // Get emails from auth.users
    const ids = eligible.map(s => s.id);
    const { data: authUsers, error: auErr } = await admin.auth.admin.listUsers();
    if (auErr) throw auErr;
    const emailById = new Map(authUsers.users.filter(u => ids.includes(u.id)).map(u => [u.id, u.email]));

    let sent = 0, failed = 0, skipped = 0;
    const details: any[] = [];

    for (const student of eligible) {
      const email = emailById.get(student.id);
      const level = student.curriculum_levels?.level_number;
      const examCode = level === 1 ? 'midterm-mock-a1' : 'midterm-mock-b1';

      if (!email) {
        skipped++;
        details.push({ student_id: student.id, status: 'skipped', reason: 'no_email' });
        continue;
      }

      // Check idempotency: was this email already sent for this exam?
      const { data: existing } = await admin
        .from('mock_exam_launch_notification_log')
        .select('id, status')
        .eq('student_id', student.id)
        .eq('channel', 'email')
        .eq('exam_code', examCode)
        .eq('status', 'sent')
        .maybeSingle();
      if (existing) {
        skipped++;
        details.push({ student_id: student.id, email, status: 'skipped', reason: 'already_sent' });
        continue;
      }

      try {
        const { subject, html, text } = buildEmail(student.full_name, level);

        const resp = await fetch(RESEND_API, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM,
            to: [email],
            reply_to: REPLY_TO,
            subject,
            html,
            text,
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`resend_${resp.status}: ${errText.slice(0, 300)}`);
        }
        const data = await resp.json();

        await admin.from('mock_exam_launch_notification_log').upsert({
          student_id: student.id,
          channel: 'email',
          exam_code: examCode,
          status: 'sent',
          details: { resend_id: data?.id, email_to: email },
        }, { onConflict: 'student_id,channel,exam_code' });

        sent++;
        details.push({ student_id: student.id, email, status: 'sent', resend_id: data?.id });

        // Small delay between sends to avoid burst rate limits
        await sleep(200);

      } catch (err) {
        await admin.from('mock_exam_launch_notification_log').upsert({
          student_id: student.id,
          channel: 'email',
          exam_code: examCode,
          status: 'failed',
          details: { error: String(err?.message || err), email_to: email },
        }, { onConflict: 'student_id,channel,exam_code' });

        failed++;
        details.push({ student_id: student.id, email, status: 'failed', error: String(err?.message || err) });
      }
    }

    return jsonResponse({
      success: true,
      total_eligible: eligible.length,
      sent, failed, skipped,
      details,
    });

  } catch (err: any) {
    console.error('[launch-emails] fatal:', err);
    return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
  }
});

// ===========================================================
// Helpers
// ===========================================================
function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function buildEmail(fullName: string, level: number) {
  const levelCode = level === 1 ? 'A1' : 'B1';
  const duration  = level === 1 ? '٧٥ دقيقة' : '٩٠ دقيقة';
  const minWords  = level === 1 ? '٥٠ كلمة' : '٨٠ كلمة';

  const subject = `📝 الاختبار التجريبي للوحدات ١-٤ متاح من ١٠م الليلة (${levelCode})`;

  const text = `السلام عليكم ${fullName}،

سيُفتح الاختبار التجريبي للوحدات ١ إلى ٤ من المستوى ${levelCode} في الموعد التالي:

من ١٠م الجمعة ٢٢ مايو ٢٠٢٦ إلى ١٠م السبت ٢٣ مايو ٢٠٢٦ (٢٤ ساعة كاملة)

كيف تبدئين:
١. ادخلي على app.fluentia.academy
٢. اضغطي "الاختبار التجريبي" من القائمة الجانبية
٣. اضغطي "ابدئي الاختبار" — الوقت يبدأ من هذي اللحظة

معلومات مهمة:
- المدة: ${duration} من لحظة البدء
- محاولة واحدة فقط
- إجاباتك تُحفظ تلقائياً
- النتائج لن تظهر فوراً — سيتم مراجعتها قبل كشفها
- هذا اختبار تجريبي للتعوّد على شكل الاختبار الفعلي
- قسم الكتابة يحتاج على الأقل ${minWords}

للدعم الفني: WhatsApp +966558669974

وفّقكِ الله 🌟

د. علي الأحمد
أكاديمية طلاقة`;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,'Segoe UI','Tahoma',sans-serif;direction:rtl;text-align:right;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#13131a;border-radius:16px;border:1px solid #2a2a35;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px;border-bottom:1px solid #2a2a35;">
              <h1 style="margin:0;color:#d4af37;font-size:24px;font-weight:700;">طلاقة | Fluentia Academy</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#e5e5ec;font-size:16px;line-height:1.8;">
                السلام عليكم ${fullName}،
              </p>
              <p style="margin:0 0 24px;color:#e5e5ec;font-size:16px;line-height:1.8;">
                سيُفتح <strong style="color:#d4af37;">الاختبار التجريبي</strong> للوحدات ١ إلى ٤ من المستوى <strong>${levelCode}</strong> في الموعد التالي:
              </p>
              <div style="background:#1a1a23;border-right:4px solid #d4af37;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
                <p style="margin:0;color:#e5e5ec;font-size:18px;font-weight:600;line-height:1.6;">
                  🕙 من ١٠م الجمعة ٢٢ مايو<br>
                  إلى ١٠م السبت ٢٣ مايو<br>
                  <span style="font-size:14px;color:#a5a5b5;font-weight:normal;">(٢٤ ساعة كاملة)</span>
                </p>
              </div>
              <p style="margin:0 0 8px;color:#d4af37;font-size:18px;font-weight:600;">كيف تبدئين:</p>
              <ol style="margin:0 0 24px;padding-right:24px;color:#e5e5ec;font-size:15px;line-height:2;">
                <li>ادخلي على <a href="https://app.fluentia.academy" style="color:#d4af37;text-decoration:none;">app.fluentia.academy</a></li>
                <li>اضغطي "الاختبار التجريبي" من القائمة الجانبية</li>
                <li>اضغطي "ابدئي الاختبار" — الوقت يبدأ من هذي اللحظة</li>
              </ol>
              <p style="margin:0 0 8px;color:#d4af37;font-size:18px;font-weight:600;">معلومات مهمة:</p>
              <ul style="margin:0 0 24px;padding-right:24px;color:#e5e5ec;font-size:15px;line-height:2;">
                <li>المدة: <strong>${duration}</strong> من لحظة البدء</li>
                <li><strong>محاولة واحدة فقط</strong></li>
                <li>إجاباتك تُحفظ تلقائياً</li>
                <li>النتائج لن تظهر فوراً — سأراجع إجاباتك قبل كشفها</li>
                <li>هذا اختبار <strong>تجريبي</strong> للتعوّد على شكل الاختبار الفعلي</li>
                <li>قسم الكتابة يحتاج على الأقل <strong>${minWords}</strong></li>
              </ul>
              <div style="text-align:center;margin:32px 0;">
                <a href="https://app.fluentia.academy/student/mock-exam"
                   style="display:inline-block;background:#d4af37;color:#0a0a0f;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
                  الذهاب إلى الاختبار
                </a>
              </div>
              <p style="margin:24px 0 8px;color:#a5a5b5;font-size:14px;">
                للدعم الفني: WhatsApp <a href="https://wa.me/966558669974" style="color:#d4af37;text-decoration:none;">+966 55 866 9974</a>
              </p>
              <p style="margin:16px 0 0;color:#d4af37;font-size:16px;font-weight:600;">وفّقكِ الله 🌟</p>
              <p style="margin:24px 0 0;color:#a5a5b5;font-size:14px;line-height:1.6;">
                د. علي الأحمد<br>
                <span style="color:#7a7a8a;">أكاديمية طلاقة</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#0e0e15;border-top:1px solid #2a2a35;text-align:center;">
              <p style="margin:0;color:#7a7a8a;font-size:12px;">
                هذه رسالة من <a href="https://fluentia.academy" style="color:#d4af37;text-decoration:none;">أكاديمية طلاقة</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
```

### Deploy

```bash
npx supabase functions deploy send-mock-exam-launch-emails --no-verify-jwt
```

(If a previous Fix 3 quirk applies — needing the multipart `/v1/projects/{ref}/functions/deploy?slug=...` endpoint — use the helper script noted in `scripts/mock-exam-fix3-deploy-fn.cjs`.)

### Trigger the email send

After deploy, invoke the function once:

```bash
# Via the Supabase CLI (uses the service role)
curl -X POST "https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/send-mock-exam-launch-emails" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

OR run a small Node script `scripts/launch-send-emails.cjs` that invokes the function and prints the result. Either way — invoke it once.

Capture the response. Expected:
```json
{
  "success": true,
  "total_eligible": 17,
  "sent": 17,
  "failed": 0,
  "skipped": 0,
  "details": [...]
}
```

If any `failed`: surface immediately. Possible causes: invalid email in auth.users, Resend rate limit, domain verification issue.

If any `skipped` with reason `no_email`: print the student name so Ali knows who didn't receive (he can WhatsApp them manually).

---

## TASK 6 — Phase F: Verification

```sql
-- 1. Exam state
SELECT code, visibility,
       (open_at AT TIME ZONE 'Asia/Riyadh') AS opens_ksa,
       (close_at AT TIME ZONE 'Asia/Riyadh') AS closes_ksa
  FROM mock_exams ORDER BY code;
-- expected: both 'live', opens 2026-05-22 22:00 KSA, closes 2026-05-23 22:00 KSA

-- 2. In-app notifications
SELECT COUNT(*) AS announcements_inserted
  FROM student_announcements
 WHERE kind = 'mock-exam-launch-2026-05-22';
-- expected: ~17-18 (one per L1+L3 student)

-- 3. Email log
SELECT exam_code, status, COUNT(*)
  FROM mock_exam_launch_notification_log
 WHERE channel = 'email'
 GROUP BY exam_code, status
 ORDER BY exam_code, status;
-- expected: 'sent' count matches the eligible student count

-- 4. Per-student rollup (any student missing from either channel?)
WITH eligible AS (
  SELECT p.id, p.full_name, cl.level_number
    FROM profiles p JOIN curriculum_levels cl ON cl.id = p.academic_level
   WHERE p.role='student' AND cl.level_number IN (1,3) AND COALESCE(p.is_test_account,false)=false
)
SELECT
  e.full_name,
  e.level_number,
  EXISTS(SELECT 1 FROM student_announcements sa WHERE sa.student_id = e.id AND sa.kind='mock-exam-launch-2026-05-22') AS got_in_app,
  EXISTS(SELECT 1 FROM mock_exam_launch_notification_log l WHERE l.student_id = e.id AND l.channel='email' AND l.status='sent') AS got_email
  FROM eligible e
 ORDER BY e.level_number, e.full_name;
-- expected: every row shows TRUE for both columns
```

If any row has `false` in either column, surface clearly.

---

## TASK 7 — Atomic commit + push

```bash
git status
git add -A
git commit -m "feat(mock-exam): launch — go-live + in-app + email notifications

- Updated exam window: 2026-05-22T19:00:00Z → 2026-05-23T19:00:00Z (Fri 22 May 22:00 KSA → Sat 23 May 22:00 KSA)
- Flipped visibility='live' for both A1 + B1 mock exams
- New table mock_exam_launch_notification_log (idempotent per student×channel×exam)
- New table student_announcements (or reused existing notifications table per Phase A)
- New RPC dismiss_student_announcement
- New AnnouncementBanner component on student dashboard (if no existing UI)
- New Edge Function send-mock-exam-launch-emails (Resend + idempotency log)
- Email template: RTL Arabic, branded, with direct CTA, gold accent
- Triggered launch dispatch: in-app + email to all L1+L3 students (excluding test accounts)
- Phase F verification: every eligible student got both in_app + email
- All existing flows, RPCs, sacred tables untouched"
git push origin main
```

---

## TASK 8 — Final handoff output

```
=== MOCK EXAM LAUNCHED ===
Commit: <sha>
Window: Friday 22 May 22:00 KSA → Saturday 23 May 22:00 KSA (24h)
Visibility: LIVE for both A1 + B1

Notifications dispatched:
- In-app: <N> students (every L1+L3 student got the banner on dashboard)
- Email: <M> sent, <F> failed, <S> skipped
  - Skipped (no email on file): <list of names if any, so Ali can WhatsApp them>
  - Failed (Resend error): <list of names + error if any>

Audit trail:
SELECT * FROM mock_exam_launch_notification_log ORDER BY sent_at DESC;
SELECT * FROM student_announcements ORDER BY created_at DESC;

>>> ALI'S ONE-LAST-CHECK <<<
1. Pick ONE real L1 student name from the log (not a test account)
2. Open incognito → log in as that student briefly (you can use admin impersonation if available)
3. Confirm: dashboard banner is visible with the launch announcement
4. Confirm: sidebar shows "الاختبار التجريبي" entry
5. Click it: sees the locked countdown (since it's before 22:00 KSA)
   OR sees the intro screen (if it's after 22:00 KSA)

If anything looks off, kill switch:
UPDATE mock_exams SET visibility='preview' WHERE code IN ('midterm-mock-a1','midterm-mock-b1');

If all good — you're done. Sleep. The exam runs itself for 24 hours.

>>> AFTER THE EXAM CLOSES (Saturday 22:00 KSA) <<<
1. Visit /admin/mock-exam-results
2. Review each student's writing (read it, optionally adjust the AI score)
3. Click "كشف نتائج كل الطلاب" for A1, then again for B1
4. Each student sees her full breakdown with AI feedback in her own account
```

Go.
