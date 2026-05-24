# Retention System — Progress Log

Per-block notes. 3–5 sentences max each. Newest first.

---

## Block 6 — Module 3: Weekly Progress Reports (2026-05-24)

- Migration `20260524070000_retention_module_3_reports.sql`: retention_report_templates + retention_reports tables + retention_build_weekly_report(uuid, date) SECURITY DEFINER RPC + pg_cron `retention-weekly-reports` Sun 14:00 UTC, DISABLED.
- 7 templates seeded (covering xp_trend × streak_trend × attendance combinations). Most-specific match wins via `v_shape @> shape_key` JSONB containment + key-count tiebreak + priority. Caught + fixed a containment-direction bug during smoke (originally `shape_key @> v_shape` — wrong direction).
- Edge function `retention-weekly-report-generate`: service-role OR admin auth; defaults to all active students with `weekly_reports` flag; per-student loop calls the RPC; logs to system_errors.
- UI: `MyReports` (student list, only sent reports visible via RLS), `ReportDetail` (6-metric grid + slot-filled body), `RetentionReportsQueue` (admin/trainer review queue with inline edit + Send button that inserts notification). 3 routes in App.jsx.
- Live smoke: bulk-built 22 reports for all active students; shape distribution matched expected (11 down/broken, 10 flat/broken, 1 down/building); each report got the correct template (e.g., هوازن now correctly gets "لنرجع للإيقاع" not "أسبوع استثنائي").

## Block 5 — Module 1: Daily Practice Partner (2026-05-24)

- Migration `20260524060000_retention_module_1_dialogues.sql`: 4 new tables (retention_personas, retention_scenarios, retention_dialogue_turns, retention_feedback_templates) + expanded retention_dialogue_attempts (scenario_id, branch_path, vocab metrics, transcript jsonb).
- Content seed `scripts/retention/seed-dialogues.cjs`: 8 personas (Sarah/Khalid/Dr Lopez/Amira/Omar/Lina/Noor/Fahad), 12 scenarios (6 L1 + 6 L3 covering coffee orders, gym intro, restaurant, doctor, taxi, hotel check-in, university inquiry, return-item, etc.), 56 linear turns total, 5 global feedback templates. Target was 200 scenarios — deferred to follow-up content session (logged in blockers.md B2).
- Pure-JS scoring engine `src/lib/retention/dialogueEval.js` — exported `evaluateTurn`, `evaluateAttempt`, `pickFeedbackTemplate`, `fillTemplate`. Used both client-side (instant per-turn feedback) and mirrored in the edge fn (final scoring).
- Edge function `supabase/functions/retention-dialogue-progress-eval/index.ts` — auth-gated, NO Claude call, computes per-turn rule-based scores, picks feedback template by most-specific match, awards 3-25 XP based on completion + vocab coverage, calls `log_activity` to extend streak coverage (fails soft if signature differs), logs errors to `system_errors`.
- UI: `DailyPartnerLanding` (today's scenario + 5-item history), `DailyPartnerPlay` (turn-by-turn play loop with MediaRecorder → whisper-transcribe → eval; browser SpeechSynthesis fallback for AI audio since ElevenLabs is deferred), `DailyPartnerResult` (animated trophy + vocab% + XP + filled feedback template).
- 3 routes added in App.jsx, dashboard card mounted in RetentionDashboardSection gated on `daily_partner` flag.
- All audio gen deferred — players gracefully fall back to browser TTS. Functional end-to-end without spending a single ElevenLabs character.

## Block 4 — Module 5: Pre/Post-class Briefs (2026-05-24)

- Migration `20260524050000_retention_module_5_briefs.sql`: `retention_lesson_briefs` table + expanded `retention_lesson_brief_deliveries` (added brief_id/class_id/scheduled_for/delivered_at/self_check_*). `retention_deliver_briefs(text)` SECURITY DEFINER RPC — for `'pre'` finds classes 12-13h ahead, for `'post'` finds classes 1.5-2.5h past; per-student loop checks `retention_is_module_enabled(student_id, 'lesson_briefs')` before inserting delivery + notification. Two pg_cron jobs every 15min, both DISABLED.
- Brief generator `scripts/retention/seed-lesson-briefs.cjs` reads `curriculum_units` + `curriculum_vocabulary` (via reading_id join) + `curriculum_grammar` (correct column `topic_name_ar`, NOT `title_ar` as I first wrote). 48 briefs seeded (12 L1 units + 12 L3 units × 2 brief types = prep + review). Each prep has title + 3 vocab chips + grammar concept + warmup question; each review adds self-check MCQ + mini-task. Audio path deferred (text-only briefs render gracefully via RetentionAudioPlayer's null-src handling).
- UI: `BriefView` page (RTL, audio player when ready, vocab chips, self-check MCQ persists answer, mini-task card); `PendingBriefsCard` dashboard widget (renders newest unopened delivery, null when none). Route `/student/retention/brief/:deliveryId` added in App.jsx. Dashboard wired in RetentionDashboardSection gated on `lesson_briefs` module.
- Module-5 pre-launch checklist filled. Discovered + corrected during build: vocab table uses `reading_id` not `unit_id` (join needed); grammar uses `topic_name_ar` not `title_ar`.

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
