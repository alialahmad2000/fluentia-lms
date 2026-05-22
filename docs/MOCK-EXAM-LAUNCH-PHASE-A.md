# Phase A — Launch Discovery

## A.1 / A.2 — Student email source + recipient list

Email lives on `profiles.email` directly (no `auth.users` join needed). Same column was already verified in the prior MOCK-EXAM-MIDTERM Phase A on 2026-05-22.

**Recipient count:** 20 students (12 L1 + 8 L3), every one has an email, ZERO test accounts in the list.

| level | count |
|---|---|
| L1 (A1) | 12 (سارة شراحيلي, سارة منصور, سعيد عارف, عبدالرحمن الشمري, علي سعيد القحطاني, فاطمة خواجي, فاطمة محمد آل شريف, لمياء سعود الحربي, ليان عبدالله العنزي, لين الشهري, منار العتيبي, نورة اليامي) |
| L3 (B1) | 8 (ابتسام النجيدي, الهنوف البقمي, الهنوف القحطاني, غيداء طلحة, نادية القحطاني, هوازن العتيبي, وجدان الحارثي, وعد العمران) |

Level resolved via `students.academic_level` (int) — `profiles.level_id` does NOT exist on this DB (carried forward from the original midterm Phase A).

## A.3 — Existing notifications infrastructure

**`public.notifications` table EXISTS and is the canonical in-app comms surface.** Columns: `id, user_id, type (notification_type enum), title, body, data jsonb, read, action_url, action_label, priority, expires_at, …`. Existing `notification_type` enum values include `announcement` (162 historical rows) — perfect fit for the launch announcement.

UI path: `src/components/layout/NotificationCenter.jsx` reads directly from `notifications` and routes via `action_url` or `data.link`. **No new banner component needed.**

**Decision: insert into the existing `notifications` table with `type='announcement'`.** Skip the `student_announcements` table from the prompt spec — it'd duplicate infrastructure with no UI consumer.

**Idempotency strategy:** `notifications` has no UNIQUE constraint suitable for this; instead the new `mock_exam_launch_notification_log` (UNIQUE on `(student_id, channel, exam_code)`) is the idempotency lock. Per-student dispatch checks the log first; if absent, inserts both rows atomically (one in `notifications`, one in the log).

## A.4 — Resend integration

Supabase secrets present: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_ADDRESS`, `ADMIN_NOTIFICATION_EMAIL` — all set ✓.

Existing email functions: `send-email`, `send-affiliate-email`, `resend-affiliate-invite`. The canonical pattern is `send-email` (uses `https://api.resend.com/emails` directly via `fetch`, reads `RESEND_FROM_EMAIL` env, std/http serve). **Will reuse this pattern in the new launch function** so the deploy + behavior matches what's already proven.

## A.5 — Current exam state (before this prompt)

| code | visibility | open_at (UTC) | close_at (UTC) | is_active |
|---|---|---|---|---|
| midterm-mock-a1 | **preview** | 2026-05-21T19:00Z | 2026-05-22T19:00Z | true |
| midterm-mock-b1 | **preview** | 2026-05-21T19:00Z | 2026-05-22T19:00Z | true |

Window has already passed (May 21→22 was earlier today). Will be updated in Phase C to May 22→23 (Fri 22:00 KSA → Sat 22:00 KSA = 19:00Z → 19:00Z next day).

## Next

Phase B migration: only `mock_exam_launch_notification_log` (the `student_announcements` table is skipped per A.3 decision). The dismiss RPC is skipped — `notifications.read` toggle already exists.

Proceeding automatically to Phase B.
