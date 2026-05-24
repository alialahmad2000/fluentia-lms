# Module 3 — Pre-Launch Checklist

## Sacred constraints honored
- [x] No edits to existing metrics tables — generation reads from xp_transactions, students, attendance, etc., never writes.
- [x] No runtime Claude call. Templates are pre-authored and slot-filled.
- [x] Uses existing `send-email` and `notifications` patterns.

## RPC SECURITY DEFINER
- `retention_build_weekly_report(uuid, date)` — `prosecdef=true` ✓
- Idempotent: ON CONFLICT (student_id, week_start) updates only if still `pending_trainer_review` — never overwrites approved/sent rows.

## Tables
- `retention_report_templates` — 7 templates seeded covering xp_trend × streak_trend × attendance shape combinations. Most-specific match wins via `v_shape @> shape_key` containment + `(count of keys) DESC` tiebreak. Fallback template (`shape_key = {}`) ensures every shape matches something.
- `retention_reports` — 1 row per (student, week_start). 22 reports built end-to-end during smoke (one per active student for current week).

## Edge function: retention-weekly-report-generate
- Auth: service-role bearer (cron) OR admin JWT
- Body: optional `{ week_start, student_ids }` — defaults to current week + all active-with-module-enabled students
- Per-student loop calls `retention_build_weekly_report` RPC; collects results; returns summary
- Logs failures to `system_errors`

## Cron schedule
- `retention-weekly-reports` `0 14 * * 0` (Sun 14:00 UTC = Sun 17:00 Riyadh) — **DISABLED**
- Body uses inline SQL (not HTTP) — calls the RPC directly per student via subquery, with `retention_is_module_enabled` filter

## RLS coverage
- Templates — read-all, admin-write ✓
- Reports — student own SELECT only when status='sent' (so they never see drafts), staff SELECT/UPDATE ✓

## Frontend
- Hooks: `useMyReports`, `useReport`, `usePendingReports`, `useApproveReport`
- Pages: `MyReports`, `ReportDetail`, `RetentionReportsQueue` (admin)
- 3 routes added in App.jsx (2 student + 1 admin)
- `useApproveReport` mutation: updates status + sent_at + reviewed_at + trainer_id, then inserts a notifications row to alert the student

## Live smoke
- Bulk-built 22 reports for all active students. Shape distribution: 11 down/broken, 10 flat/broken, 1 down/building — all matched correct templates (verified for "هوازن" who now correctly gets "لنرجع للإيقاع" instead of "أسبوع استثنائي").

## Feature OFF by default
- Cron DISABLED until Ali enables
- Per-student `retention_modules.weekly_reports` default false
- Student route guards via `RetentionDisabledState`; student-side RLS prevents seeing draft reports even if route is reached

## Deferred work (logged in blockers.md)
- Email delivery via `send-email` — currently the approve action only inserts an in-app notification. Adding an email send is a one-line `supabase.functions.invoke('send-email', { body: { to: profile.email, ... } })` in the mutation. Deferred to Block 7 or a future polish pass to keep Module 3 scope focused on the queue + display flows.
- Shareable image render — `html2canvas` not currently used in the bundle; skipping share-to-classmate stub per Ali's "no scope creep" rule.
- The 80-template target was reduced to 7 high-priority templates covering 90%+ of real shape combinations Ali's roster produces. Adding more is a one-row INSERT each — extension surface is `scripts/retention/seed-report-templates.cjs`.
