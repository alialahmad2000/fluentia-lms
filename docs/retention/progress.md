# Retention System — Progress Log

Per-block notes. 3–5 sentences max each. Newest first.

---

## Block 2 — Module 4: Streak Activation (2026-05-24)

- Phase A diagnosis confirmed three independent breaks: no pg_cron schedule, `check_streaks()` only handles break/freeze with no increment, `unified_activity_log` source has narrow coverage. Captured in `streak-diagnosis.md` with verbatim function bodies + per-student stored-vs-computed evidence.
- Migration `20260524030000_retention_module_4_streak.sql` shipped: 2 new tables (`retention_weekly_challenges`, `retention_weekly_challenge_assignments`), 1 SECURITY DEFINER orchestrator (`retention_daily_run()`), 3 forward-stub tables (dialogue_attempts, homework_attempts, lesson_brief_deliveries) so the orchestrator can compile + cron job created **DISABLED** at 02:00 Riyadh via `cron.alter_job(jobid, active=>false)`. 30 weekly challenges seeded via `scripts/retention/seed-weekly-challenges.cjs`.
- Edge function `retention-daily-cron` written — auth-gates admin JWT or service-role bearer, structured JSON response, logs to `system_errors`. Not deployed (Block 7 deploys all edge fns together).
- UI: `RetentionStreakCalendar` (30-day 7-wide heat map), `WeeklyChallengeCard` (progress bar + completion celebration), `StreakAtRiskBanner` (after-18:00-Riyadh dismissible nudge with localStorage), `RetentionDashboardSection` (single gated mount point). Wired into `StudentDashboard.jsx` at position 5.5 — between Streak/Team row and NextClass.
- Live smoke (3 invocations against branch DB): 18 students synced ✓, 22 challenges assigned ✓ (today is Sunday in Riyadh — DOW math works), 1 challenge auto-completed on real data + +50 XP awarded + notification inserted, idempotent on re-invoke (0 new completions / 0 new errors).
- Two bugs caught and fixed during smoke: `system_errors` column name (`source`→`error_type`+`service`), `notification_type` enum value (`achievement_unlocked`→`achievement`). Both fixes in `re-applied via CREATE OR REPLACE`.
- Module 4 pre-launch checklist filled in `docs/retention/module-4-checklist.md`. **All retention surfaces remain hidden** until Ali flips `retention_modules.enabled = true` per student AND `cron.alter_job(..., active=>true)`.

## Block 1 — Shared infrastructure (2026-05-24)

- Migration `20260524020000_retention_modules.sql` shipped: `retention_modules` table (per-student per-module enable flag), 2 SECURITY DEFINER RPCs (`retention_is_module_enabled`, `retention_set_module_enabled`), wide view `retention_module_status` for admin UI, full RLS (student-own SELECT + staff SELECT + admin INSERT/UPDATE), 4 indexes, updated_at trigger.
- Applied to branch DB; verified 1 table, 4 RLS policies, 2 SECURITY DEFINER RPCs, 1 view, 4 indexes.
- Frontend: `src/lib/retention/` barrel + 3 hooks (`useRetentionModuleEnabled`, `useStudentLevel`, `useStudentMistakeTags`) + `constants.js`. `src/design-system/retention/` primitives (`RetentionCard`, `RetentionAudioPlayer`, `RetentionDisabledState`) — all using actual design-system tokens (`var(--ds-*)` for colours, `var(--radius-*)` for rounding, `var(--space-*)` for spacing).
- All 8 new frontend files parse via Babel preset-react.

## Block 0 — Discovery (2026-05-24)

- Read SKILL.md + CLAUDE.md (~244KB) end-to-end. Walked `src/`, `supabase/`, key hooks/lib/utils, edge function list (95 total).
- Critical finding: streak surface is `students.current_streak` (not `profiles.streak_days` as prompt assumed) and `cron-streak-check` edge fn + `check_streaks` RPC already exist — Module 4 is genuinely an activation problem, not a build problem. Diagnosis lands in `streak-diagnosis.md` during Block 2.
- Authored `repo-inventory.md` (canonical surfaces, reusable assets, dropped features), `integration-plan.md` (per-module integration map), `decisions.md` (10 decisions with rationale), `blockers.md` (empty), this file.
- Supabase branch `retention-build` (id `dxpkissdfuioibefozvc`) reached `ACTIVE_HEALTHY` mid-block. Ran full schema introspection via Management API; see `schema-appendix.md` (236 tables, 20 cron jobs, 0 retention_* collisions, 22 active students, max XP 8,175).
- Build is on git branch `retention-system` (off `main` at `31cf77f`). Two commits so far: `e411300` (initial Discovery docs) + the schema-appendix commit landing next.
- Block 0 Definition of Done: ✅ SKILL.md + CLAUDE.md read; ✅ repo-inventory.md, integration-plan.md, decisions.md, blockers.md, progress.md, schema-appendix.md written; ✅ Supabase branch active w/ prod data clone; ✅ git branch tracking origin; ✅ discovery commit landed.
