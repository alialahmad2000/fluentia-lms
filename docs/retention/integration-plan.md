# Retention System — Integration Plan (per §2.1 step 3)

**Build order:** Block 0 (this doc) → Block 1 (shared) → Block 2 (Module 4 — smallest blast radius, unblocks Module 5 cron) → Block 3 (Module 2) → Block 4 (Module 5) → Block 5 (Module 1 — heaviest content) → Block 6 (Module 3) → Block 7 (final integration).

All modules ship behind `retention_modules.enabled` per-student gates, all defaulting to `false`. Ali enables them via runbook after review.

---

## Module 1 — Daily Practice Partner (`/student/retention/daily-partner`)

### Existing assets reused
- **`VoiceRecorder.jsx`** — full Safari/Chrome MediaRecorder, MIME detection, upload, max-duration. Wrap with a dialogue-turn submit handler.
- **`AudioPlayer.jsx`** — for AI persona turn playback
- **`whisper-transcribe` edge function** — for student voice → text
- **`invokeWithRetry`** — for the new `retention-dialogue-progress-eval` call
- **`xpManager.awardPracticeXP`** — XP after dialogue completion (writes to `xp_transactions`, triggers existing `students.xp_total` increment)
- **`safeCelebrate`** + `emitXP` — completion feedback
- **`GlassPanel`, `PremiumCard`, `StatOrb`, `CinematicTransition`, `StaggeredList`, `AuroraBackground`** — landing / play / result screens
- **`useAuthStore` typed selectors** — `useAuthProfileId` for student id, `useIsStudent` for guards
- **`students.academic_level`** + `curriculum_levels` join — for level-appropriate scenario selection

### Existing data read from
- `students` (level, last unit, group)
- `student_curriculum_progress` (recent units student has seen — to bias persona/scenario topic)
- `retention_dialogue_attempts` (last 7 scenarios — to dedupe)

### NEW tables (5)
- `retention_personas` (8 rows)
- `retention_scenarios` (200 rows)
- `retention_dialogue_turns` (~1,400 rows — 200 scenarios × 7 turns)
- `retention_feedback_templates` (~1,000 rows)
- `retention_dialogue_attempts` (student data — RLS: student own only)

### NEW edge function
- `retention-dialogue-progress-eval` — rule-based scoring; **NO Claude/OpenAI call.** Reuses `whisper-transcribe` server-side for transcription if frontend hasn't already done it. Awards XP via `xp_transactions` insert with `reason='challenge'`. Logs to `system_errors` on failure.

### NEW UI routes
- `/student/retention/daily-partner` — landing
- `/student/retention/daily-partner/play` — dialogue play
- `/student/retention/daily-partner/result/:attemptId` — feedback card
- `/admin/retention/dialogues` — scenario admin

### Dependency order within block
- Personas → Scenarios → Turns → Feedback templates → Audio gen (L1+L3 first per cap) → eval edge function → UI

### Content gen budget
- 200 scenarios × ~5–10 turns × ~150 chars per AI turn ≈ ~120K–250K chars of audio if everything was generated. **L1+L3 first**, hard-stop at 80% of ElevenLabs Creator monthly cap (~88K chars). Defer L0/L2/L4/L5 audio to next cycle. Text content for all 5 levels still generated in this build.

---

## Module 2 — Smart Homework (`/student/retention/homework`)

### Existing assets reused
- `writing_submissions`, `speaking_submissions`, `submissions`, `student_saved_words`, `assignment_submissions` — mistake source
- `students.academic_level` for level filter
- `vocabulary_word_mastery` for already-known-vocab exclusion
- `xpManager.awardPracticeXP` — completion XP
- `GlassPanel`, `PremiumCard`, `EmptyState`, `StaggeredList` — UI

### Existing data read from
- All submissions tables (read-only)
- `curriculum_units` for level → topic mapping

### NEW tables (4)
- `retention_exercises` (~3,500 rows)
- `retention_homework_sets` (per-student per-trigger)
- `retention_homework_attempts` (per-question per-set)
- `retention_student_mistake_tags` (denormalized mistake tags from submissions)

### NEW edge functions
- **None.** Mistake tagging runs as a background SQL job (triggered or cron). Selection is client-side via `selectHomework.ts` (rule-based). Submission is client-side direct insert (RLS-protected).

### NEW UI routes
- `/student/retention/homework` — landing
- `/student/retention/homework/play/:setId` — exercise sequence
- Dashboard card: "تمارين اليوم"

### Mistake tagging strategy
- Pre-generated 3,500 exercises will only be useful if mistake tags get populated. Pipeline:
  - One-time backfill script: read past 30 days of `writing_submissions`/`speaking_submissions`/wrong `submissions` answers, apply rule-based regex tags (present-perfect confusion, missing article, irregular verb error, etc.), insert into `retention_student_mistake_tags`
  - Trigger on insert to `writing_submissions`/`speaking_submissions` to keep tags fresh (or simpler: include in `retention-daily-cron` as a tagging pass)

### Content gen budget
- All text. No audio. No Claude API. ~3,500 exercises × 6 types × 5 levels — generate in this session by me (the model) procedurally + with vetted templates. Checkpoint commit every 500 to bound risk.

---

## Module 3 — Weekly Progress Reports (`/student/retention/reports`)

### Existing assets reused
- `weekly-skill-snapshot` edge function — pattern for weekly cron + per-student loop
- `xp_transactions`, `activity_feed`, `student_curriculum_progress`, `submissions`, `student_saved_words`, `attendance` (verify table name in branch DB) — metrics source
- `send-email` + Resend integration — final delivery
- `notifications` — in-app delivery
- `mock_exam_launch_notification_log` — idempotency pattern (unique on `(student_id, channel, exam_code)`); we use `(student_id, week_start)` for retention reports
- `useAuthStore` typed selectors, design-system components

### Existing data read from
- `xp_transactions` (last 7 days for trend)
- `student_curriculum_progress` (completions)
- `students.current_streak`, `last_active_at`
- `attendance` / `class_schedule` (need branch DB to confirm exact tables)

### NEW tables (2)
- `retention_report_templates` (~80 narrative shapes)
- `retention_reports` (per-student per-week with `pending_trainer_review` → `approved` → `sent`)

### NEW edge function
- `retention-weekly-report-generate` — pg_cron Sundays 14:00 UTC, loops active students, picks shape, slot-fills, inserts to `retention_reports`. NO Claude call (templates are pre-written).

### NEW UI routes
- `/admin/retention/reports` — trainer queue with editor
- `/student/retention/reports` — student history
- `/student/retention/reports/:id` — single report view

### Content gen
- 80 Arabic narrative templates (د. علي voice, MSA + Saudi softness). Hand-authored by me in this build using the reference voice patterns observable in existing `quick_notes` (if present) and CLAUDE.md change-log style.

---

## Module 4 — Streak Activation (`/admin/retention/streaks` + dashboard widgets)

**Phase A diagnosis is mandatory before any code.** Hypothesis (to verify):
- `check_streaks` RPC exists (used by `cron-streak-check` edge fn)
- `cron-streak-check` edge fn exists and writes streak-warning notifications
- BUT no `pg_cron` schedule fires the edge fn → streaks frozen
- OR: schedule exists but `check_streaks` predicates filter all students out

### Existing assets reused
- **`cron-streak-check` edge function** — already exists, do NOT recreate. If the function's predicates are wrong (e.g. requires an activity type that's never emitted), fix root cause additively. If only the schedule is missing, add `pg_cron` schedule pointing at it.
- **`check_streaks` RPC** — extend if needed (additive only). If retention activities (dialogue, homework) must count as "activity", the activity-detection predicate needs to include those new tables. Document the change in `docs/retention/streak-diagnosis.md` before applying.
- `students.current_streak`, `students.last_active_at`, `students.xp_total` — existing surfaces
- `xp_transactions` — for the +50 XP weekly-challenge reward (reason `'challenge'`)
- `activity_feed` — post completed challenge to feed
- `send-push-notification` — for at-risk banner trigger
- `StreakFire`, `XPCounter` — existing display components
- `GamificationProvider` — Realtime subscription to `students` keeps UI fresh on XP/streak changes

### NEW tables (2)
- `retention_weekly_challenges` (~30 rows — challenge bank)
- `retention_weekly_challenge_assignments` (per-student per-week)

### NEW UI
- `RetentionStreakCalendar` widget (30-day heat-map) — mounted on existing `StudentDashboard.jsx`
- Weekly challenge card — mounted on dashboard
- "Streak at risk" banner — conditional render in `StudentDashboard.jsx` after 18:00 if no activity today
- `/admin/retention/streaks` — overview page

### NEW edge function
- `retention-daily-cron` — wraps & augments existing cron-streak-check responsibilities. Specifically: (a) assigns this-week's challenge to each active student each Sunday, (b) updates challenge progress for previous day, (c) awards XP if challenge completed. Streak maintenance stays in `cron-streak-check` (don't duplicate).

### Phase A deliverable
- `docs/retention/streak-diagnosis.md` — what exists, what's broken, what needs activation, what's truly missing. Commit BEFORE any fix.

---

## Module 5 — Pre/Post-Class Briefs (`/student/retention/brief/:deliveryId`)

### Existing assets reused
- `class_schedule` table (need to confirm exact column names in branch DB — `scheduled_at`, `unit_id`, `group_id`)
- `curriculum_units` — for unit metadata (theme_ar, level)
- `notifications` table + `send-push-notification` — for delivery
- `useUnitProgress`, `useUnitVocab` — for student-aware brief context
- `AudioPlayer` — for the ~30-45 sec ElevenLabs-generated brief audio
- Design-system components

### Existing data read from
- `class_schedule` (upcoming + recent classes for each student's group)
- `curriculum_units`, `curriculum_vocabulary` (for prep brief vocab preview)

### NEW tables (2)
- `retention_lesson_briefs` (72 units × 2 briefs = 144 rows)
- `retention_lesson_brief_deliveries` (per-student per-brief delivery log)

### NEW edge functions
- `retention-pre-class-deliver` (pg_cron every 15 min)
- `retention-post-class-deliver` (pg_cron every 15 min)

### NEW UI routes
- `/student/retention/brief/:deliveryId` — full brief view
- Dashboard card "تحضيرك للكلاس القادم" (conditional)
- `/admin/retention/briefs` — admin list/edit per unit

### Content gen budget
- 144 briefs × text-only generation (by me) ≈ small
- 144 audio briefs × ElevenLabs. **L1+L3 first** within the 80% cap shared with Module 1. Defer rest.

---

## Cross-cutting

### Per-student per-module gate
- `retention_modules` table: `(student_id, module_key, enabled boolean default false, enabled_at, enabled_by)`
- Module keys: `daily_partner`, `smart_homework`, `weekly_reports`, `streak_activation`, `lesson_briefs`
- Hook: `useRetentionModuleEnabled(moduleKey)` — TanStack Query, 60s stale
- All routes + dashboard cards gated on this hook returning `true`. If `false`, route shows a "قريباً" empty state.

### Admin master switch
- `/admin/retention` — table view of all active students × all 5 modules with toggle switches
- Bulk actions: enable a module for a whole group (المجموعة 4 / المجموعة 2 etc.)
- RPC `retention_set_module_enabled(p_student_ids uuid[], p_module_key text, p_enabled boolean)` SECURITY DEFINER admin-only

### Telemetry
- Every new edge function logs to `system_errors` on exception (try/catch + structured row)
- Every retention RPC that mutates user data is `SECURITY DEFINER`, verified by querying `pg_proc WHERE prosecdef = true` in the per-module checklist
- All new RLS policies tested from a non-admin perspective via a small Node script using a real student JWT against the branch DB
