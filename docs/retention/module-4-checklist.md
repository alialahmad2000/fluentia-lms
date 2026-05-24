# Module 4 — Pre-Launch Checklist (per §6 of mega-prompt)

Filled at end of Block 2. Mirror format will repeat for Modules 1, 2, 3, 5.

---

## Sacred constraints honored

- [x] `check_streaks()` body — UNCHANGED. Function called from `retention_daily_run()` but never redefined.
- [x] `students` table schema — UNCHANGED. Only UPDATEs to existing columns (`current_streak`, `longest_streak`, `last_active_at`).
- [x] Existing 20 pg_cron jobs — UNCHANGED.
- [x] `cron-streak-check` edge fn — UNTOUCHED.
- [x] `xp_transactions.reason` enum — UNCHANGED. Reusing `'daily_challenge'`.
- [x] `unified_activity_log` schema — UNCHANGED.
- [x] No row deleted / zeroed / restructured.

## RPC SECURITY DEFINER verification

```sql
SELECT proname, prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname = 'retention_daily_run';
```

**Result (against `retention-build` branch):**
```
proname              | prosecdef
---------------------+----------
retention_daily_run  | true
```

Plus the two RPCs from Block 1 (`retention_is_module_enabled`, `retention_set_module_enabled`) — both `prosecdef = true` confirmed.

## RLS coverage

- `retention_weekly_challenges` — 2 policies (read-all + admin-write)
- `retention_weekly_challenge_assignments` — 2 policies (student self-select + staff select)
- `retention_dialogue_attempts` stub — 2 policies (student self-select + staff select)
- `retention_homework_attempts` stub — 2 policies
- `retention_lesson_brief_deliveries` stub — 2 policies

All writes are service-role only (via the orchestrator RPC); no INSERT/UPDATE policies needed for authenticated users.

## Cron schedule status

```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'retention-daily-run';
```

**Result:**
```
jobname              | schedule    | active
---------------------+-------------+--------
retention-daily-run  | 0 23 * * *  | false   ← DISABLED, Ali enables manually
```

## Edge function

- `supabase/functions/retention-daily-cron/index.ts` — auth-gated (admin JWT OR service-role bearer), try/catch on body parse, logs failures to `system_errors` with service='retention-daily-cron'
- NOT deployed yet — deploy is part of Block 7 final integration. Function body is reviewed-ready.

## Live end-to-end smoke (manually executed against `retention-build`)

Invocation 1 (with bug): wrote 1 error to `system_errors`, no completions.
Invocation 2 (after fixing system_errors column names and notification_type enum): **18 students synced**, **22 challenges assigned** (today is Sunday in Riyadh), **21 progressed**, **1 completed**, **1 reward granted (+50 XP)**, **1 notification inserted**, **zero new errors**.
Invocation 3 (idempotency): same shape, **0 new completions**, **0 new XP grants**, **0 new errors**. Idempotent ✓.

## Feature OFF by default

- All retention modules are gated per-student on `retention_modules.enabled` (default `false`).
- `RetentionDashboardSection.jsx` renders `null` when no module is enabled for the caller.
- Dashboard mount is wrapped: no visual change for any student until Ali flips the flag in `/admin/retention`.
- Cron job is DISABLED until Ali runs `cron.alter_job(<jobid>, active => true)`.

## Mobile + RTL walk-through (mental)

- `RetentionStreakCalendar` is a 7-wide CSS grid (`grid-cols-7`); collapses naturally on 320px viewports.
- `WeeklyChallengeCard` uses the shared `RetentionCard` which inherits `text-right` + `dir="rtl"` from parent (StudentDashboard wraps in dir="rtl" by way of the LayoutShell).
- `StreakAtRiskBanner` is responsive flex; icon + body + dismiss collapse cleanly.

## Arabic copy review (د. علي voice)

- Banner: "سلسلتك (N يوم) على وشك الانتهاء — أي نشاط بسيط اليوم يحافظ عليها".
- Challenge complete notification: "تحدي الأسبوع: مكتمل! 🎯 — حصلتِ على N XP — يا بطلة!".
- All 30 challenge titles + descriptions written in feminine MSA + light Saudi softness, matching د. علي's existing voice in trainer notes and mock-exam launch comms.

## What still requires Ali's manual action (not auto)

1. **Enable `streak_activation` module per student** via `retention_set_module_enabled(uuid[], 'streak_activation', true)` — through the `/admin/retention` UI (Block 7) or direct SQL.
2. **Enable the cron schedule** via `SELECT cron.alter_job(<jobid>, active => true)` after verifying the function runs cleanly once manually.
3. **Deploy the edge function** via `supabase functions deploy retention-daily-cron --no-verify-jwt --project-ref nmjexpuycmqcxuxljier` once promoted to prod.
4. **Promote the migrations** from `retention-build` branch to prod when ready.

## Known limitations (not in scope for Block 2)

- `unified_activity_log` coverage is narrow (only 2 event types). Module 1+2+5 will add their own `log_activity` calls when they ship, extending streak coverage. The wider activity-pipeline cleanup (adding `log_activity` calls to existing writing_submissions / speaking_submissions / etc.) is a separate future cleanup, NOT in this build.
- `cron-streak-check` edge function and `check_streaks()` RPC continue to exist alongside the new `retention_daily_run()` orchestrator. They don't conflict — the new orchestrator CALLS `check_streaks()` after syncing. Deprecating `cron-streak-check` is a future decision for Ali.
