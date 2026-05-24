# Retention System — Progress Log

Per-block notes. 3–5 sentences max each. Newest first.

---

## Block 3 — Module 2: Smart Homework (2026-05-24)

- Migration `20260524040000_retention_module_2_homework.sql` shipped: full schemas for `retention_exercises`, `retention_homework_sets`, `retention_student_mistake_tags`; expanded `retention_homework_attempts` from Block 2 stub with `exercise_id`/`student_answer`/`is_correct`/`time_seconds` columns + FK. Tagger RPC `retention_tag_recent_mistakes(integer)` runs over `submissions` / `writing_history` / `weekly_tasks` (the actual canonical text sources — NOT `writing_submissions` which doesn't exist) with rule-based regex for 7 mistake patterns. Orchestrator `retention_daily_run()` updated to call the tagger as step 0.
- 69 starter exercises seeded (43 L1 + 26 L3) covering all 6 exercise types × 4 skills via `scripts/retention/seed-exercises.cjs` (idempotent against `(level, skill, type, prompt_en)`). Full 3,500-target deferred to a future content pass — logged in `blockers.md` B1 with two concrete options.
- Selection algorithm `selectHomework.js` — rule-based, pure function: mistake-tag matching → difficulty band → round-robin type diversity → 5 exercises per set ordered easiest-first.
- Hooks: `useExerciseBank`, `useRecentlyAttempted`, `useActiveHomeworkSet`, `useHomeworkHistory`, `useCreateHomeworkSet` (mutation that runs selection + inserts a set).
- UI: `HomeworkLanding` (active set or "create new" CTA + history list), `HomeworkPlay` (one exercise at a time, MCQ as buttons or fill-blank textarea, instant feedback with Arabic explanation, auto-resume on reload), `HomeworkResult` (score ring + XP awarded + CTAs). All gated via `RetentionDisabledState` when module is off.
- Routes wired in `App.jsx` (3 routes), dashboard card mounted in `RetentionDashboardSection.jsx` gated on `smart_homework` flag.
- Module-2 pre-launch checklist filled. Discovered + corrected during build: tagger initially targeted `writing_submissions` / `speaking_submissions` (mega-prompt's assumption) — actual tables are `submissions.content_text` / `submissions.content_voice_transcript` / `writing_history.original_text` / `weekly_tasks.response_text` (decision recorded in checklist).

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
