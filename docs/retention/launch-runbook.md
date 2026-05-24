# Retention System — Launch Runbook (Ali's manual steps)

**Branch:** `retention-system` (off `main`).
**Supabase branch:** `retention-build` (project ref `dxpkissdfuioibefozvc`, ACTIVE_HEALTHY).
**Ship strategy:** PR → preview review → merge to main → promote DB → enable per-student.

---

## Step 0 — Review (you, in your time)

1. **Walk the preview deploy.** Open the Vercel preview for the latest commit on `retention-system`. Log in as admin → `/admin/retention` (master switch UI). Confirm: blank state, all toggles off, all 22 students appear grouped by their `group_id`.
2. **Read each `docs/retention/module-N-checklist.md`** — 5 files. Each lists what shipped, what's deferred, what live-smoke proved.
3. **Read `docs/retention/blockers.md`** — 3 deferred items (B1: full 3,500 exercise corpus; B2: full 200 scenario corpus + audio; B3: email delivery on weekly reports).
4. **Read `docs/retention/streak-diagnosis.md`** — the Phase A root-cause analysis of the dormant streak system. The fix is `retention_daily_run()` extending what `check_streaks()` already did.

If anything in the above is wrong / surprising / missing, open issues against this branch before merging.

---

## Step 1 — Promote to prod (one-time)

After PR is approved and merged to `main`:

### Database
The 4 migrations to promote (in order):
```
supabase/migrations/20260524020000_retention_modules.sql
supabase/migrations/20260524030000_retention_module_4_streak.sql
supabase/migrations/20260524040000_retention_module_2_homework.sql
supabase/migrations/20260524050000_retention_module_5_briefs.sql
supabase/migrations/20260524060000_retention_module_1_dialogues.sql
supabase/migrations/20260524070000_retention_module_3_reports.sql
```

Apply via Supabase Management API (same pattern used for mock exam launches), or merge the `retention-build` branch via the Supabase dashboard.

After promotion, verify against prod ref `nmjexpuycmqcxuxljier`:
```sql
SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'retention_%';
-- Expected: 11 tables (retention_modules, retention_weekly_challenges, retention_weekly_challenge_assignments,
-- retention_exercises, retention_homework_sets, retention_homework_attempts, retention_student_mistake_tags,
-- retention_lesson_briefs, retention_lesson_brief_deliveries, retention_personas, retention_scenarios,
-- retention_dialogue_turns, retention_feedback_templates, retention_dialogue_attempts,
-- retention_report_templates, retention_reports) — actually 15.

SELECT jobname, active FROM cron.job WHERE jobname LIKE 'retention-%';
-- Expected: 4 jobs, ALL active=false
--   retention-daily-run
--   retention-deliver-pre-class
--   retention-deliver-post-class
--   retention-weekly-reports
```

### Seed content (apply once against prod)
After tables exist on prod, run the seeders pointing at prod:
```bash
SUPABASE_ACCESS_TOKEN=... BRANCH_REF=nmjexpuycmqcxuxljier node scripts/retention/seed-weekly-challenges.cjs
SUPABASE_ACCESS_TOKEN=... BRANCH_REF=nmjexpuycmqcxuxljier node scripts/retention/seed-exercises.cjs
SUPABASE_ACCESS_TOKEN=... BRANCH_REF=nmjexpuycmqcxuxljier node scripts/retention/seed-lesson-briefs.cjs
SUPABASE_ACCESS_TOKEN=... BRANCH_REF=nmjexpuycmqcxuxljier node scripts/retention/seed-dialogues.cjs
SUPABASE_ACCESS_TOKEN=... BRANCH_REF=nmjexpuycmqcxuxljier node scripts/retention/seed-report-templates.cjs
```
Each is idempotent — re-running them does nothing if rows exist.

### Edge functions
Deploy all 3 new edge functions:
```bash
supabase functions deploy retention-daily-cron --no-verify-jwt --project-ref nmjexpuycmqcxuxljier
supabase functions deploy retention-dialogue-progress-eval --no-verify-jwt --project-ref nmjexpuycmqcxuxljier
supabase functions deploy retention-weekly-report-generate --no-verify-jwt --project-ref nmjexpuycmqcxuxljier
```

---

## Step 2 — Soft-launch with المجموعة 4 (pilot, L1)

> **Why this group first:** L1 has the richest seeded content (43 homework exercises, 6 dialogue scenarios, 12 lesson briefs). Smallest blast radius.

1. **In `/admin/retention`**, find المجموعة 4. Click `+ streak_activation` (bulk enable for whole group).
2. **Wait 1 day** so the streak sync has a baseline.
3. **Enable `cron.alter_job(<retention-daily-run jobid>, active=>true)`** via SQL (or the Supabase dashboard cron UI).
4. **Watch overnight:** `select * from system_errors where service='retention_daily_run' and created_at > now()-interval '1 day'` — expect zero rows.
5. **Confirm** the next morning that `students.current_streak` is now populated for المجموعة 4 students (verify with SELECT).
6. **+ smart_homework** for the group. Have one student walk the flow: `/student/retention/homework` → create set → complete a few exercises → confirm XP awarded.
7. **+ lesson_briefs** for the group. Enable the two delivery crons:
   ```sql
   SELECT cron.alter_job(jobid, active=>true) FROM cron.job WHERE jobname IN ('retention-deliver-pre-class','retention-deliver-post-class');
   ```
   Wait until 12h before the next class — confirm a delivery appears in `retention_lesson_brief_deliveries`.
8. **+ daily_partner** for the group. Have one student record a turn — confirm whisper transcription works + an attempt row + XP shows up.
9. **+ weekly_reports** for the group. After Sunday 17:00 Riyadh cron fires, check `/admin/retention/reports` — should see 6-8 reports waiting. Review, edit, send.

---

## Step 3 — Add المجموعة 2 (L3, second pilot)

Repeat Step 2 module-by-module but for المجموعة 2 students. The pace can be faster since the patterns are now proven.

---

## Step 4 — Expand to remaining groups

Once 2 pilot groups are running cleanly for ~1 week, bulk-enable for any remaining active groups via the `/admin/retention` UI.

---

## What to monitor

- **`system_errors` table** filtered by `service LIKE 'retention_%'` — should stay near zero.
- **`retention_lesson_brief_deliveries.opened_at` distribution** — if students aren't opening briefs, the copy needs polish, not more deliveries.
- **`retention_dialogue_attempts.completed_at IS NULL` count** — high abandonment rate signals the scenario UX needs work.
- **`retention_weekly_challenge_assignments.completed = true` rate** — target ≥40% for the easy challenges.
- **`xp_transactions WHERE reason IN ('challenge','daily_challenge') AND description LIKE 'تحدي%' OR LIKE 'محادثة%'`** — total retention XP awarded per student per week.

---

## How to kill anything fast (emergency stop)

- **Stop streak cron:** `SELECT cron.alter_job(jobid, active=>false) FROM cron.job WHERE jobname='retention-daily-run'`
- **Stop ALL retention crons at once:** `SELECT cron.alter_job(jobid, active=>false) FROM cron.job WHERE jobname LIKE 'retention-%'`
- **Hide ALL retention surfaces for one student:** in `/admin/retention`, toggle all 5 modules off for that student. Takes effect within 60s (TanStack Query stale).
- **Hide ALL retention surfaces site-wide:** `UPDATE retention_modules SET enabled = false` (truncates the per-student gates — UI immediately falls back to `RetentionDisabledState`).

---

## What is intentionally not in this build (logged in `blockers.md`)

- B1 — Full 3,500 exercise corpus (69 shipped; 3,431 deferred to future content sessions)
- B2 — Full 200 dialogue scenarios + ElevenLabs audio (12 shipped; audio uses browser SpeechSynthesis fallback)
- B3 — Email delivery for weekly reports (in-app notification only)
- L0/L2/L4/L5 lesson briefs (48 L1+L3 shipped; the other levels have no active students)

Each blocker entry contains the extension surface (file path / script name) and an estimate.

---

## Rollback plan (if something breaks)

1. **Disable the relevant cron job** (see "kill anything fast" above).
2. **Toggle off the module for all students:** `UPDATE retention_modules SET enabled = false WHERE module_key = '<key>'`.
3. **Investigate via `system_errors`** + Vercel logs.
4. **If a table is corrupted:** the migrations are additive only — no existing data is at risk. Worst case: `DROP TABLE retention_<name> CASCADE; recreate from migration file`. All retention data is generated/written by retention infrastructure, so rebuilding is safe.

---

## Credits

Built across 2026-05-24 single autonomous session. Branch retention-system, 9 commits. Schema introspection + live data smoke confirmed on Supabase branch `retention-build` throughout.
