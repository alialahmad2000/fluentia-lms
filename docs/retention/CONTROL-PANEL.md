# 🚨 RETENTION CONTROL PANEL — verified against prod 2026-05-25

> Every SQL block below was tested against the live prod DB (`nmjexpuycmqcxuxljier`).
> The original draft had 3 bugs that would have made the launch silently fail — they are fixed here.
> See "What was wrong in the first draft" at the bottom.

---

# 🔴 KILL SWITCH (READ THIS FIRST)

If ANYTHING goes wrong — student complains, page broken, dashboard error, anything weird — paste this into the Supabase SQL Editor and Run:

```sql
-- KILL SWITCH — hides all retention features for all students instantly
UPDATE retention_modules SET enabled = false;

-- Stop all retention background jobs
SELECT cron.alter_job(jobid, active => false)
FROM cron.job
WHERE jobname LIKE 'retention-%';
```

**Effect:** within ~60 seconds (TanStack Query cache window) every student's LMS returns to exactly how it looked before retention. No deploy, no code change. The retention tables + data stay in prod so you can re-enable later. Existing units, lessons, vocab — all untouched.

**Where to run it:**
1. Open https://supabase.com/dashboard/project/nmjexpuycmqcxuxljier
2. **SQL Editor** in the left sidebar
3. Paste → **Run**

That's the entire rollback. No git, no redeploy.

---

# ✅ ACTIVATION (run when you're ready to go live)

> ⚠️ The `retention_modules` table starts **EMPTY** — there are no per-student rows yet.
> So activation must **INSERT** the rows (not just UPDATE them). The block below does an
> upsert: it creates the rows if missing and sets `enabled = true`. Safe to re-run.

## Step 1 — Enable all 5 modules for the 20 active students in المجموعة 2 + المجموعة 4

```sql
INSERT INTO retention_modules (student_id, module_key, enabled, enabled_at)
SELECT s.id, m.module_key, true, now()
FROM students s
JOIN groups g ON g.id = s.group_id
CROSS JOIN (VALUES
  ('streak_activation'),
  ('smart_homework'),
  ('lesson_briefs'),
  ('daily_partner'),
  ('weekly_reports')
) AS m(module_key)
WHERE g.name IN ('المجموعة 2', 'المجموعة 4')
  AND s.status = 'active'
ON CONFLICT (student_id, module_key) DO UPDATE
  SET enabled = true, enabled_at = now();

-- Verify — should return 100 (20 students × 5 modules)
SELECT count(*)::int AS enabled_rows FROM retention_modules WHERE enabled = true;
```

> Why 100, not 70: prod currently has **20** active students in these two groups
> (المجموعة 2 = 12, المجموعة 4 = 8), not 14. 20 × 5 modules = 100 rows.

### Safer alternative: go one module at a time
To launch just the streak module first (recommended — lowest risk), run only:
```sql
INSERT INTO retention_modules (student_id, module_key, enabled, enabled_at)
SELECT s.id, 'streak_activation', true, now()
FROM students s
JOIN groups g ON g.id = s.group_id
WHERE g.name IN ('المجموعة 2', 'المجموعة 4') AND s.status = 'active'
ON CONFLICT (student_id, module_key) DO UPDATE SET enabled = true, enabled_at = now();
-- Verify — should return 20
SELECT count(*)::int FROM retention_modules WHERE module_key='streak_activation' AND enabled=true;
```
Then add the other modules later by re-running with the next `module_key`.

## Step 2 — Turn ON the retention background jobs

```sql
-- Activate all 4 retention cron jobs
SELECT cron.alter_job(jobid, active => true)
FROM cron.job
WHERE jobname LIKE 'retention-%';

-- Verify — 4 rows, all active = true
SELECT jobname, active, schedule FROM cron.job WHERE jobname LIKE 'retention-%';
```

> Lower-risk option: enable only the daily streak job first —
> `... WHERE jobname = 'retention-daily-run';`
> Add `retention-deliver-pre-class`, `retention-deliver-post-class`,
> `retention-weekly-reports` as you turn on the matching modules.

## Step 3 — Sanity check (30 seconds)

```sql
-- Should return 0 rows. If any appear, paste them to Claude.
SELECT * FROM system_errors
WHERE service LIKE 'retention%'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

If Step 3 is empty, you're live. Students see the new surfaces on their next page load (within ~60s).

---

# 👀 WHAT TO CHECK THROUGHOUT THE DAY

```sql
-- 1. Any retention errors in the last hour?
SELECT COUNT(*) AS error_count, MAX(created_at) AS latest
FROM system_errors
WHERE service LIKE 'retention%'
  AND created_at > NOW() - INTERVAL '1 hour';

-- 2. Are students actually using it? (activity_feed.type, not action_type)
SELECT COUNT(DISTINCT student_id) AS active_students, COUNT(*) AS total_actions
FROM activity_feed
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND type LIKE 'retention%';

-- 3. Did the crons fire correctly?
SELECT j.jobname, d.status, d.return_message, d.end_time
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname LIKE 'retention-%'
ORDER BY d.end_time DESC
LIMIT 10;
```

**Healthy:** error_count ≈ 0 · active_students grows · cron `status = 'succeeded'`.
**Unhealthy (run kill switch):** error_count climbing fast · multiple students reporting the same thing · cron `status = 'failed'` repeatedly · anyone says "I lost my answers" / "page is broken".

---

# 🆘 IF SOMETHING GOES WRONG

## Tier 1 — single student
```sql
UPDATE retention_modules
SET enabled = false
WHERE student_id = (SELECT id FROM profiles WHERE full_name LIKE '%STUDENT_NAME_HERE%' LIMIT 1);
```
That one student returns to the old LMS; everyone else stays on.

## Tier 2 — one broken module, many students
```sql
-- MODULE_KEY ∈ streak_activation | smart_homework | daily_partner | lesson_briefs | weekly_reports
UPDATE retention_modules SET enabled = false WHERE module_key = 'MODULE_KEY';

-- and pause its cron if it has one:
--   streak_activation  -> retention-daily-run
--   lesson_briefs      -> retention-deliver-pre-class + retention-deliver-post-class
--   weekly_reports     -> retention-weekly-reports
SELECT cron.alter_job(jobid, active => false) FROM cron.job WHERE jobname = 'retention-daily-run';
```

## Tier 3 — everything on fire
Run the **KILL SWITCH** at the top. All retention off, instantly, for everyone.

---

# 🔄 DEEPER ROLLBACK (you almost certainly never need this)

The kill switch is 99% of what you'll need. If you ever want to remove retention *code* from the app (not just hide it), the clean path is **not** a multi-commit revert (the retention history is now ~20 commits and interleaves with unrelated work). Instead:

1. Run the kill switch (hides everything — this is the real rollback).
2. If you truly want the code gone, tell Claude "revert retention" and it will compute the exact revert set against the current `main` and open a branch for your review. Don't hand-revert — the commit list drifts every time new retention work lands.

The retention tables stay in prod (additive migrations don't auto-revert), but nothing in the app references them once hidden.

---

# 📋 GIT STATE

- Current `main`: `373a960` (retention v3 — 100% content complete + branching + balanced skills)
- The pre-retention LMS exists at every commit before `f26cd22` and can be restored anytime. Nothing is ever lost.

---

# ✅ DONE-FOR-THE-DAY CHECKLIST

- [ ] Activation Steps 1–3 completed ≥2 hours ago
- [ ] Last error_count check showed 0 / very few
- [ ] ≥3–4 students triggered retention activity (monitoring query #2)
- [ ] All enabled crons showing `status = 'succeeded'` in last run
- [ ] No WhatsApp messages reporting issues
- [ ] You know where this file is (`docs/retention/CONTROL-PANEL.md` on main, or Downloads) for an overnight kill switch

---

# ⚠️ What was wrong in the first draft (now fixed)

1. **Activation used `profiles.group_id`** — that column doesn't exist. Students link to groups via `students.group_id`. The original Step 1 would have errored out (`column group_id does not exist`).
2. **Activation was an `UPDATE`** on a table that starts **empty** — even with the right WHERE, it would have updated **0 rows** and silently activated nothing. Fixed to an `INSERT … ON CONFLICT` upsert (verified: enables exactly 100 rows).
3. **"14 students × 5 = 70 rows"** was stale — prod has **20** active students in these groups, so the real number is **100**.
4. **Monitoring query used `activity_feed.action_type`** — the column is `type`, and retention rows use values like `retention_daily_run` / `retention_weekly_challenge_complete`. Fixed to `type LIKE 'retention%'`.
5. **`system_errors` filter** now uses `service LIKE 'retention%'` so you only see retention errors, not unrelated app noise.

The kill switch, Tier 1/2/3 rollbacks, and cron toggles in the original were already correct — those are unchanged.
