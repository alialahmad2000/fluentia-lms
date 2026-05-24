# Module 4 — Phase A Diagnosis (Streak System)

**Discovered:** 2026-05-24 against Supabase branch `retention-build` (full prod data clone).
**Diagnosis basis:** live introspection — `pg_proc`, `cron.job`, `information_schema`, sample queries against `students` and `unified_activity_log`.

---

## A. What exists today

| Component | Where | Status |
|---|---|---|
| `students.current_streak` column | live | EXISTS — but all 22 active students = 0 today |
| `students.longest_streak`, `streak_freeze_available` | live | EXISTS |
| `students.last_active_at` | live | EXISTS — populated for ~half of active students |
| `unified_activity_log` table | live | EXISTS — only 2 event types written (`unit_tab_completed`: 368 rows, `vocab_reviewed`: 5 rows) |
| `log_activity(...)` SECURITY DEFINER | live | EXISTS — single writer for `unified_activity_log` |
| `get_student_streak(p_student_id)` SECURITY DEFINER STABLE | live | EXISTS — computes from `unified_activity_log.occurred_at` at Riyadh TZ |
| `check_streaks()` SECURITY DEFINER | live | EXISTS — **only handles break/freeze, never increments** |
| `cron-streak-check` edge fn | live | EXISTS, deployed |
| `pg_cron` job calling `cron-streak-check` | live | **DOES NOT EXIST** |
| Streak-related triggers on activity tables | live | None found |
| Dashboard streak widget | live | Reads `students.current_streak` directly — sees stale 0 |

## B. Why every streak is 0

Three independent breaks compound:

### B1. No pg_cron schedule
- `cron-streak-check` edge function exists, has full Arabic notification logic, has push integration — but **nothing calls it on a schedule**. Verified via `SELECT * FROM cron.job` — 20 jobs exist, none target `cron-streak-check`.
- Result: even if increments were happening elsewhere, the break/freeze never fires.

### B2. `check_streaks()` has no increment branch
- Function body (verified via `pg_get_functiondef`):
  ```
  IF s.current_streak > 0 AND s.last_active_at < now() - interval '24 hours' THEN
      IF streak_freeze_available THEN consume freeze + push last_active_at forward
      ELSE current_streak = 0
  ```
- **There is no branch that does `UPDATE students SET current_streak = current_streak + 1`**. The increment side of the streak lifecycle is missing in the DB layer.

### B3. `get_student_streak()` source is too narrow
- It reads `unified_activity_log.occurred_at` distinct days at `Asia/Riyadh` — that's the right computation logic.
- But `unified_activity_log` only carries `unit_tab_completed` + `vocab_reviewed`. Writing submissions, speaking submissions, mock exam answers, reading completion, listening completion, grammar exercises — **none of those write here**. So even on a day the student does substantial work, if they didn't complete a unit tab or review a vocab card via the SRS button, the streak doesn't see it.

### B4. No write-back of computed streak
- Even when `get_student_streak()` returns `current_streak = 1` (verified for 2 active students today), `students.current_streak` is NOT updated. The dashboard reads the stored snapshot. So the UI shows 0 while reality is 1+.

---

## C. Fix plan (Phase B — additive only, ships in Block 2)

### C1. New pg_cron job `retention-daily-cron` at 02:00 Riyadh (23:00 UTC)
Created **DISABLED** (per §2.6 — Ali enables manually after review). Targets a NEW edge fn `retention-daily-cron` that does four things in one pass:

1. **Sync stored streak from computed.** For every active student, call `get_student_streak(s.id)` and UPDATE `students.current_streak` + `students.longest_streak` + `students.last_active_at`. This single change makes the dashboard non-stale even before extending coverage.
2. **Trigger `check_streaks()` AFTER sync.** That way break/freeze fires against the freshly-synced state, not the stale 0.
3. **Assign this-week's retention weekly challenge** if Sunday (Riyadh week start). Inserts into `retention_weekly_challenge_assignments`.
4. **Update existing challenge progress.** For each in-progress assignment, compute the metric (e.g., `dialogues_completed` from `retention_dialogue_attempts`) and update `current_progress`. If completed, mark and grant +50 XP via `xp_transactions.reason = 'daily_challenge'`.

### C2. Extend `log_activity` coverage from retention activities only
Per D2 in `decisions.md` — we do NOT add `log_activity` calls to existing submission paths (out of scope, regression risk). Instead:
- **Module 1** dialogue completion → write `log_activity(student_id, 'retention_dialogue', metadata)`
- **Module 2** homework set completion → write `log_activity(student_id, 'retention_homework', metadata)`
- **Module 5** brief opened → write `log_activity(student_id, 'retention_brief', metadata)`

This lets retention activities contribute to the streak via the existing pipeline. Existing activity sources (writing/speaking/etc.) remain a separate fix Ali can tackle outside the retention build.

### C3. Frontend reads computed streak directly when nightly sync hasn't run yet
Until the cron is enabled, the dashboard widget falls back to `get_student_streak()` via TanStack Query (5 min stale) instead of `students.current_streak`. This means the UI shows the truth from day 1, even before the cron is enabled.

---

## D. What is NOT changed (sacred constraints honored)

- `check_streaks()` body — UNCHANGED. The retention build only calls it; doesn't redefine it.
- `students` table — no schema changes; only UPDATEs to existing columns from the new cron.
- Existing 20 pg_cron jobs — none re-scheduled.
- `cron-streak-check` edge function — UNTOUCHED. The new `retention-daily-cron` partially overlaps with its responsibilities (specifically the `check_streaks()` call + warning notification), but does NOT delete or rewrite it. They can coexist; Ali decides later whether to deprecate the original.
- `xp_transactions.reason` enum — UNCHANGED (reusing `daily_challenge`).
- `unified_activity_log` schema — UNCHANGED.
- No row deleted, zeroed, restructured.

---

## E. Verification before Module 4 ships

Once Phase B migration + edge fn deployed (still cron-DISABLED), invoke the edge fn once manually as service-role against the branch DB, then verify:
- All 22 active students' `students.current_streak` matches `get_student_streak(s.id).current` ✓
- For students with computed streak > 0, the dashboard widget renders the correct number
- One challenge assignment row exists for every active student for the current week (when run on a Sunday)
- `system_errors` has zero new rows from the edge fn invocation
- `pg_proc` shows the new function `retention_daily_run()` is `prosecdef = true`
