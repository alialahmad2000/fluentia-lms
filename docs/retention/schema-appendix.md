# Retention System — Schema Appendix (live introspection)

**Source:** Supabase branch `retention-build` (id `dxpkissdfuioibefozvc`), provisioned 2026-05-24 01:27 UTC with `--with-data` (full prod clone).
**Status:** `ACTIVE_HEALTHY` on supabase-postgres-17.6.1.121.
**Introspection method:** Management API `POST /v1/projects/{ref}/database/query` (read-only SELECTs).

This appendix replaces the "PENDING" placeholder in `repo-inventory.md` §9.

---

## A. Topline counts

- **236 tables** in `public` schema
- **20 pg_cron jobs** (none for streaks — see §D)
- **0 `retention_*` tables** — clean namespace, no collision risk
- **22 active students** (vs. CLAUDE.md's stale "14"; vs. mega-prompt's stale "14"). 25 total students. 8 groups.
- **21 students with any XP**, max `students.xp_total` = 8,175 (vs. prompt's "1,529 — Manar"). Names redacted from this doc.

---

## B. Corrected assumptions vs. mega-prompt

| Prompt said | Reality | Impact |
|---|---|---|
| `profiles.streak` / `profiles.streak_days` | Lives on `students.current_streak` + `students.longest_streak` + `students.streak_freeze_available` | D1 in `decisions.md`; use `students.*` throughout retention |
| `class_schedule` table | Table is named `classes` (16 cols incl. `group_id`, `trainer_id`, `date`, `start_time`, `end_time`, `unit_id` via `attendance` join) | Update Module 5 plan: brief delivery cron joins `classes` ⊕ `groups`, NOT `class_schedule` |
| `attendance` is a "verify table name" hint | Confirmed: 11 cols including `class_id`, `student_id`, `unit_id`, `class_number` | Module 3 weekly reports can read attendance; Module 5 briefs key off `classes.unit_id` via `attendance` |
| 14 active students, Manar 1,529 XP | 22 active students, max 8,175 XP | Build planning unchanged; runbook must enumerate 22 not 14 |
| `xp_transactions.reason` is open text | Strict enum `xp_reason` with 23 values incl. `challenge`, `daily_challenge`, `achievement`, `streak_bonus`, `recording_complete` | D8 in `decisions.md` is correct — reuse `'challenge'` for retention XP; do NOT try to add a new enum value |
| `pg_cron` job for streaks | **NO cron job exists for `cron-streak-check`** — confirmed via `cron.job` table | Module 4 Phase A root cause confirmed without speculation |

---

## C. Streak architecture (Module 4 — full picture)

The streak system has **four moving parts**, of which two are currently dormant:

1. **`unified_activity_log`** — canonical activity source (writers: `log_activity` SECURITY DEFINER function). Schema: `student_id, event_type, event_subtype, ref_table, ref_id, xp_delta, skill_impact jsonb, metadata jsonb, occurred_at, created_at`. **Currently logs only 2 event types**: `unit_tab_completed` (368 rows) and `vocab_reviewed` (5 rows). Writing/speaking submissions, mock exam answers, reading, listening, grammar exercises etc. are NOT logged here — they live in their own tables.
2. **`get_student_streak(p_student_id)`** — SECURITY DEFINER, STABLE. Returns `(current_streak int, longest_streak int, last_active_date date)`. Computes consecutive days from `unified_activity_log.occurred_at` at `Asia/Riyadh` timezone. Resets `current` to 0 if last activity isn't today or yesterday.
3. **`check_streaks()`** — SECURITY DEFINER. Iterates students with `current_streak > 0 AND last_active_at < now() - interval '24 hours'`. Either consumes `streak_freeze_available` OR sets `current_streak = 0`. **Never INCREMENTS.** Writes a `streak_warning` notification on freeze/reset.
4. **`students.current_streak` column** — what the UI reads. **Stored snapshot. Never written by activity.** Verified: all 22 active students have `current_streak = 0` in the DB right now, but `get_student_streak()` computes 1 for 2 of them.

### Module 4 root cause (Phase A — confirmed, not speculative)

The streak system is dormant because:
- **(a)** No `pg_cron` job calls `cron-streak-check` edge fn or `check_streaks()` RPC.
- **(b)** Even when `check_streaks()` runs, it never refreshes `students.current_streak` from activity. It only decrements/resets.
- **(c)** Nothing writes back to `students.current_streak` after activity events. The increment side of the streak lifecycle is missing.
- **(d)** `unified_activity_log` coverage is too narrow — most student work doesn't show up there, so even `get_student_streak()` undercounts.

### Phase B fix (lands in `streak-diagnosis.md` during Block 2)
- Add pg_cron schedule for `retention-daily-cron` at 23:00 UTC (02:00 Riyadh) calling a single SECURITY DEFINER function that: (i) computes `get_student_streak()` per active student, (ii) UPDATES `students.current_streak` + `longest_streak`, (iii) calls `check_streaks()` for the break/freeze pass, (iv) handles retention weekly-challenge assignment + progress.
- Extend `log_activity` calls to be invoked from retention activities (dialogue completion, homework attempt) so they count toward the streak.
- DO NOT add `log_activity` calls to mock-exam / writing-submission / etc. paths in this build — that's scope creep into the wider activity pipeline; flag as a future cleanup.

---

## D. Existing pg_cron jobs (20)

| Job name | Schedule (UTC) | Target |
|---|---|---|
| `mock-exam-auto-submit-expired` | `* * * * *` (every min) | `mock_exam_cron_auto_submit_expired()` RPC |
| `mock-exam-grade-pending-writing` | `*/2 * * * *` | `mock_exam_cron_grade_pending_writing()` RPC |
| `comp-leader-check` | `*/30 * * * *` | HTTP → `competition-leader-check` edge fn |
| `sweep-speaking-eval-5min` | `*/5 * * * *` | HTTP → `sweep-speaking-evaluations` |
| `sweep-writing-evaluations` | `*/5 * * * *` | HTTP → `sweep-writing-evaluations` |
| `detect-student-signals` | `0 */4 * * *` | HTTP → `detect-student-signals` |
| `health-monitor-evaluations` | `0 * * * *` | HTTP → `health-monitor-evaluations` |
| `generate-daily-report` | `5 0 * * *` | HTTP → `generate-daily-report` |
| `comp-morning-digest` | `0 5 * * *` | HTTP → comp morning digest |
| `comp-milestone-check` | `0 15 * * *` | `check_competition_milestones()` |
| `comp-evening-digest` | `0 17 * * *` | HTTP → comp evening digest |
| `comp-daily-streak` | `5 21 * * *` | `check_team_streak_daily()` |
| `generate-weekly-tasks` | `0 21 * * 5` (Fri 00:00 Riyadh sat-ish) | HTTP → `generate-weekly-tasks` |
| `comp-weekly-goal` | `10 21 * * 6` | `check_weekly_goal()` |
| `weekly-skill-snapshot` | `0 0 * * 0` (Sun 00:00 UTC) | HTTP → `weekly-skill-snapshot` |
| `purge-practice-attempts` | `0 0 * * *` | `purge_expired_practice_attempts()` |
| 4× one-shot Apr 2026 competition jobs | various | competition fanout |

### Cron windows the retention build will use (none collide)
- `retention-daily-cron` → `0 23 * * *` UTC (02:00 Riyadh) — no collision; nearest is `purge-practice-attempts` at `0 0`
- `retention-weekly-report-generate` → `0 14 * * 0` UTC (Sun 17:00 Riyadh) — well clear of `weekly-skill-snapshot` (Sun 00:00) and `comp-evening-digest` (17:00 daily — different job, different topic)
- `retention-pre-class-deliver` → `*/15 * * * *` — fits between existing min/2min/5min jobs
- `retention-post-class-deliver` → `*/15 * * * *` — same

---

## E. `xp_reason` enum values (canonical — do not extend)

```
assignment_on_time, assignment_late, class_attendance, correct_answer,
helped_peer, shared_summary, streak_bonus, achievement, peer_recognition,
challenge, daily_challenge, voice_note_bonus, writing_bonus, early_bird,
custom, penalty_absent, penalty_unknown_word, penalty_pronunciation,
duel_loss, duel_draw, duel_daily_bonus, duel_win, recording_complete
```

Retention awards will use:
- Dialogue completion → `challenge` (description: `"محادثة يومية — <persona_name>"`)
- Homework set completion → `challenge` (description: `"تمارين ذكية — N/M"`)
- Weekly challenge completion → `daily_challenge` (despite the name; semantically the closest)
- Brief self-check correct → `challenge` (description: `"مراجعة الكلاس — وحدة N"`)

---

## F. SECURITY DEFINER functions in scope (existing — reuse, don't duplicate)

| Function | Args | Use in retention |
|---|---|---|
| `check_streaks()` | () | Module 4 Phase B keeps as-is, calls from `retention-daily-cron` |
| `get_student_streak(p_student_id)` | `(uuid)` | Module 4 dashboard widget + nightly snapshot sync |
| `add_xp(p_student_id, p_amount, p_reason, …)` | varies | Lower-level fallback; prefer `xpManager.awardPracticeXP` via direct `xp_transactions` insert |
| `award_curriculum_xp(p_student_id, p_section_type, p_score, p_unit_id, p_description)` | (uuid, text, int, uuid, text) | Module 5 brief self-check XP path |
| `get_student_xp(p_student_id, p_from)` | (uuid, timestamptz) | Module 3 weekly reports |
| `log_activity(...)` | varies | Module 1 + 2 + 5 should call this to extend `unified_activity_log` coverage so streaks reflect retention work. Signature to confirm before first call. |
| `build_progress_report_data(...)` | varies | Possibly reusable as a Module 3 metrics builder; verify shape during Block 6 |

**Collision check for proposed retention RPCs** (`pg_proc` search):
- `retention_*` — 0 matches. Safe to use prefix.
- `daily_challenge_*` — 0 matches. Safe.
- `weekly_challenge_*` — only `check_weekly_goal()` (competition); safe to prefix with `retention_weekly_challenge_*`.

---

## G. Triggers on `students` (do NOT alter)

- `on_student_generate_referral` (INSERT) — auto-generates `referral_code` / `ref_code`
- `on_student_level_update` (UPDATE) — emits notification on `gamification_level` change
- `on_student_xp_change` (UPDATE) — recomputes derived values when `xp_total` changes

**Implication:** any retention path that writes to `students.current_streak` (e.g. nightly sync from `get_student_streak`) is safe — the triggers above only fire on level/XP/referral changes.

---

## H. RLS coverage on key tables (existing)

| Table | Policy count |
|---|---|
| `notifications` | 5 |
| `weekly_tasks` | 6 |
| `student_curriculum_progress` | 5 |
| `students` | 4 |
| `profiles` | 4 |
| `xp_transactions` | 4 |
| `activity_feed` | (not in this scan; verify before Block 1) |
| `weekly_task_sets` | 4 |
| `classes` | 4 |
| `attendance` | 4 |

Retention tables will mirror the `weekly_tasks` shape (5–6 policies covering: student own SELECT, trainer/admin SELECT, service_role ALL, optional student INSERT/UPDATE on own rows, optional trainer UPDATE).

---

## I. Outstanding introspection (low priority — can resolve during the block that needs it)

- Exact signature of `log_activity(...)` — needed before Module 1 dialogue completion path. Single Management API SELECT will resolve.
- Full enumeration of `notification_type` enum values to ensure retention notification types either reuse existing values or extend the enum cleanly.
- Confirm `activity_feed` RLS policies (skipped above) and the `xp_reason` arrow into `tg_feed_on_xp_earned` trigger to see what `activity_feed.type` value is set when retention XP lands.
