# MOCK EXAM — LAUNCH REPORT

## Final state

| Exam | visibility | opens (KSA) | closes (KSA) |
|---|---|---|---|
| midterm-mock-a1 | **live** | Fri 2026-05-22 22:00 | Sat 2026-05-23 22:00 |
| midterm-mock-b1 | **live** | Fri 2026-05-22 22:00 | Sat 2026-05-23 22:00 |

Both exams: `is_active=true`, window verified at the KSA local timezone, 24-hour window.

## Dispatch — 20/20 on both channels

|  | L1 (A1) | L3 (B1) | total |
|---|---|---|---|
| In-app sent | 12 | 8 | **20** |
| Email sent | 12 | 8 | **20** |
| Failed | 0 | 0 | **0** |
| Skipped | 0 | 0 | **0** |

Per-student rollup (`got_in_app` AND `got_email` for every eligible student): **20/20 ✓**.

## Channels used

- **In-app:** reused existing `public.notifications` table (`type='announcement'`, `priority='high'`, `action_url='/student/mock-exam'`, `expires_at='2026-05-23T19:00:00Z'`, `data->>'kind' = 'mock-exam-launch-2026-05-22'`). Surfaced via the existing `NotificationCenter.jsx`.
- **Email:** new edge function `send-mock-exam-launch-emails` (Deno + Resend, deployed via multipart `/functions/deploy`). From: `Fluentia Academy <noreply@fluentia.academy>` (the configured `RESEND_FROM_EMAIL` Supabase secret). 20 sends, each with a Resend ID for audit.
- **Idempotency lock:** `public.mock_exam_launch_notification_log` (new), `UNIQUE (student_id, channel, exam_code)`. Re-running the dispatch is safe — every per-student loop checks for an existing 'sent' row first.

## Audit trail

```sql
SELECT * FROM mock_exam_launch_notification_log
 ORDER BY sent_at DESC;

SELECT user_id, title, created_at
  FROM notifications
 WHERE type='announcement'
   AND data->>'kind' = 'mock-exam-launch-2026-05-22'
 ORDER BY created_at DESC;
```

## Ali's one-last-check (optional)

1. Open incognito → log in as any L1 student (or use admin impersonation).
2. Confirm the bell icon in the header shows a red dot (unread notifications).
3. Open the notification dropdown → see "الاختبار التجريبي للوحدات ١-٤ متاح الآن" with the high-priority gold accent.
4. Click → navigates to `/student/mock-exam`.
5. Before 2026-05-22 22:00 KSA → locked countdown.
6. At/after 2026-05-22 22:00 KSA → intro screen with "ابدئي الاختبار" button.

## Kill switch (if anything looks off)

```sql
UPDATE mock_exams
   SET visibility='preview'
 WHERE code IN ('midterm-mock-a1','midterm-mock-b1');
```

## After the exam closes (Saturday 2026-05-23 22:00 KSA)

1. Visit `/admin/mock-exam-results`
2. Review each student's writing (AI grades are already computed via the FIX-3 grader)
3. Optionally adjust writing scores via the trainer panel
4. Click "كشف نتائج كل الطلاب" for A1, then B1
5. Each student sees her full breakdown with AI feedback in her account
