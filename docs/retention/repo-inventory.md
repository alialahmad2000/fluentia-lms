# Retention System — Repo Inventory

**Compiled:** 2026-05-24 during Block 0 Discovery (§2.1 of mega-prompt)
**Scope:** Catalog reusable assets for the 5-module retention layer. Not an exhaustive repo dump — focuses on what the build will read from, extend, or wrap. Schema appendix appended after live DB introspection on Supabase branch `retention-build`.

---

## 1. Top-level repo structure

```
fluentia-lms/
├─ src/
│  ├─ App.jsx              # Lazy routes + ThemeProvider + AuroraBackground root
│  ├─ main.jsx             # Boot + service worker + storage purge guards
│  ├─ components/          # Shared UI (66 dirs/files)
│  ├─ design-system/       # Aurora/Night/Minimal themes + GlassPanel/PremiumCard/...
│  ├─ features/chat/       # In-LMS chat (GOD COMM Phase 1)
│  ├─ hooks/               # 50+ custom hooks
│  ├─ layouts/             # LayoutShell, sidebar, header
│  ├─ lib/                 # Supabase client, invokeWithRetry, audioTelemetry, etc.
│  ├─ pages/               # student/ trainer/ admin/ public/
│  ├─ stores/              # Zustand: auth, theme, language, classMode
│  ├─ utils/               # xpManager, calculateUnitProgress, etc.
│  └─ styles/              # design-tokens.css, components.css, themes
├─ supabase/
│  ├─ functions/           # 95 Deno edge functions
│  └─ migrations/          # 210 timestamped SQL migrations
└─ docs/                   # Audits, dev notes, retention/ (this dir)
```

---

## 2. Canonical surfaces (read or extend — never duplicate)

Per §2.2 of the prompt, the retention layer MUST extend the following — never create parallel versions.

### 2.1 Identity & access
- `profiles` — user-facing identity (role, name_ar, email, theme prefs, `is_test_account`, `must_change_password`, `preferred_chunk_size`)
- `students` — student-specific (level, group, **`current_streak`**, **`last_active_at`**, `status`, `deleted_at`, `xp_total`, `academic_level`, `temp_password`)
- `groups` — group metadata (Max 7/group, min 3 to open)
- `useAuthStore` (`src/stores/authStore.js`) — typed selectors: `useAuthUserId`, `useAuthProfileId`, `useIsAuthenticated`, `useIsAdmin` (impersonation-aware), `useIsTrainer`, `useIsStudent`, `useAuthActions`. Singleton refresh promise via `src/lib/authRefresh.js`.

### 2.2 Curriculum (SACRED — read-only from retention)
- `curriculum_levels` — 6 levels, UUID PK + level_number int (Foundation→Proficiency)
- `curriculum_units` — 72 units (12 per level)
- `curriculum_readings`, `curriculum_listening`, `curriculum_vocabulary`, `curriculum_grammar`, `curriculum_writing`, `curriculum_speaking`, `curriculum_pronunciation`, `curriculum_irregular_verbs`, `curriculum_video_sections`, `curriculum_assessments`
- `curriculum_comprehension_questions`, `curriculum_vocabulary_exercises`, `curriculum_grammar_exercises`, `curriculum_irregular_verb_exercises`
- `curriculum_vocabulary_srs` — FSRS state per student/word
- `reading_passage_audio` — full + per-paragraph audio + `source_text_hash` (drift gate)
- **Rule:** retention writes go into `retention_*` tables. Any structural change to `curriculum_*` halts the build (write to `blockers.md`).

### 2.3 Engagement / gamification
- `xp_transactions` — append-only XP ledger. Trigger `on_xp_transaction_insert` auto-increments `students.xp_total`. Existing reasons include `'challenge'`, `'curriculum'`, `'mystery_box'` (incomplete enum, see below).
- `activity_feed` — public/group-visible student activity (219 rows at last audit). Module 4 weekly challenges and Module 1 dialogue completions should post here.
- `students.current_streak` + `students.last_active_at` — the existing streak surface. (Prompt §2.1 mentions `profiles.streak`/`streak_days` — that column does NOT exist; the actual surface is `students.*`. Recorded as decision #1.)
- `achievements` — earned badges
- `daily_challenges`, `student_daily_completions`, `student_streaks`, `student_error_bank` — scaffolded by migration 037 (gamification tables)
- `vocabulary_word_mastery` — per-word per-student mastery booleans (used by SRS + mastery threshold)
- `unit_progress` — derived per-unit progress, computed by `compute_unit_progress()` PL/pgSQL (excludes pronunciation as of 2026-05-19)

### 2.4 Submissions / signals (Module 2 mistake source)
- `writing_submissions` — with AI feedback JSON
- `speaking_submissions` — with AI feedback JSON
- `student_saved_words` — FSRS-shaped saved vocab
- `submissions` — generic assignments
- `assignments`, `weekly_tasks`, `weekly_task_sets` — weekly task system

### 2.5 Communications
- `notifications` — canonical in-app notification surface. Used by GOD COMM, mock exam launch, streak warnings. Module 3/4/5 will write here.
- `push_subscriptions` (268 rows) — Web Push endpoints
- `send-push-notification` edge function — typed payloads (type/priority/skip_in_app)
- `send-email` edge function — Resend integration (requires `RESEND_API_KEY`)
- `group_messages`, `group_channels`, `message_reactions`, `message_reads`, `channel_read_cursors` — GOD COMM chat surfaces
- `mock_exam_launch_notification_log[_archive]` — idempotency pattern for batch notifications

### 2.6 Existing cron / async patterns
- `pg_cron` is enabled. Existing jobs include `weekly-skill-snapshot` (Sun 00:00 UTC), `mock-exam-auto-submit-expired` (every 1 min), `mock-exam-grade-pending-writing` (every 2 min). Pattern: `cron.unschedule(<name>)` before re-schedule for idempotency.
- HTTP-trigger pattern uses `net.http_post()` with `current_setting('supabase.service_role_key', true)` (canonical, used by `weekly-skill-snapshot` + `detect-student-signals`).

### 2.7 System / observability
- `system_errors` — structured error logging (all retention edge functions write here on failure per §2.5)
- `audio_event_log` — audio telemetry (drift, decode failures)
- `audio_drift_check` — pre-deploy gate
- `analytics_events` — front-end event log
- `ai_usage` — Claude/OpenAI cost ledger. Columns: `type`, `student_id`, `estimated_cost_sar`, etc. (NOT `feature`/`user_id`/`cost_sar` — common mistake)

### 2.8 Feature flagging
- `app_config` table — global flags as JSONB. Already used: `personalization_enabled = false` (kill-switch).
- `src/lib/featureFlags.js` — 5-min cached `isPersonalizationEnabled()`. Pattern reusable for retention module gates if needed beyond per-student toggles.

---

## 3. Reusable hooks, libs, utilities

| Asset | Path | Use in retention |
|---|---|---|
| `invokeWithRetry` | `src/lib/invokeWithRetry.js` | All edge function calls (auto-injects auth, 30s timeout, 1× retry on 502/503/401-refresh) |
| `useAICall` | `src/hooks/useAICall.js` | Hook wrapper around invokeWithRetry with abort-on-unmount |
| `authRefresh` | `src/lib/authRefresh.js` | Singleton refresh promise — use `getToken()` / `refreshOnce()` not raw `getSession()` |
| `xpManager` | `src/utils/xpManager.js` | `awardPracticeXP(studentId, type, {score,total})` — Module 1 dialogue + Module 2 homework rewards |
| `VoiceRecorder` | `src/components/VoiceRecorder.jsx` | Module 1 dialogue voice capture — already handles Safari mp4 vs Chrome webm, max-duration, upload |
| `AudioPlayer` | `src/components/AudioPlayer.jsx` | Generic audio with iOS-Safari-safe reload pattern |
| `useUnitProgress` | `src/hooks/useUnitProgress.js` | Module 5 prep/review brief targeting current unit |
| `useUnitVocab`, `useUnitVocabStatus` | `src/hooks/` | Module 5 brief vocab preview |
| `usePageTracking` | `src/hooks/usePageTracking.js` | Analytics |
| `SubTabs` | `src/components/common/SubTabs.jsx` | Admin retention queue (multi-section pages) |
| `useActivityTracker`, `useResilientActivitySubmit` | `src/hooks/` | Resilient submit pattern for dialogue/homework attempts |

### Celebration / feedback UI
- `GamificationProvider` (`src/components/gamification/`) — root provider, listens for XP changes via Supabase Realtime on `students` table
- `safeCelebrate` (`src/lib/celebrations.js`) — confetti + sound trigger
- `emitXP` (`src/components/ui/XPFloater.jsx`) — XP floater toast
- `StreakFire` — streak flame component
- `XPCounter`, `LevelUpCelebration`, `AchievementUnlock` — already wired

---

## 4. Design system (use exclusively — no hardcoded hex)

**Path:** `src/design-system/`

| Component | Notes |
|---|---|
| `AuroraBackground` | Root of any full-page route; auto-degrades on `hardwareConcurrency <= 4` |
| `GlassPanel` | Base glass surface — extend for `RetentionCard` |
| `PremiumCard` | Featured card with gradient accent — Module 1 daily scenario hero |
| `SectionHeader` | Page section heading |
| `StatOrb` | Animated stat ring — Module 4 streak calendar / Module 3 report hero |
| `StaggeredList` | Framer Motion staggered entry |
| `CinematicTransition` | Page-level transitions |
| `Buttons` (Primary/Secondary/Danger) | Standard CTAs |
| `EmptyState` | Centered icon + Arabic + CTA |
| `DSLoadingSkeleton` | Skeleton shimmer (not spinners) |

CSS vars: `var(--ds-*)`. Themes: `aurora-cinematic` (default), `night`, `minimal`. Admin-only ThemeSwitcher.

---

## 5. Edge functions inventory (95 total — relevant subset for retention)

### Reusable as-is (no new copies)
- `whisper-transcribe` → Module 1 student voice → text
- `send-push-notification` → Module 3/4/5 in-app + push delivery
- `send-email` → Module 3 weekly report email
- `cron-streak-check` → **already exists**; Module 4 Phase A must diagnose what's broken vs what just needs activation (likely no pg_cron schedule firing)

### Existing patterns to mirror (don't copy code; learn the shape)
- `weekly-skill-snapshot` → weekly cron template for Module 3 report generation
- `weekly-tasks-reminder` → student-targeted batch reminder
- `generate-weekly-tasks` → adaptive per-student content generation pattern (we'll do similar but with pre-generated banks, not live Claude)
- `auto-nudge-scheduler` + `smart-nudges` → notification scheduling pattern
- `mock-exam-grade-writing` → 3-layer reliability (primary/retry/fallback) — useful pattern for Module 1 dialogue scoring
- `announcement-fanout` → DB-webhook-driven broadcast pattern
- `process-mentions` → cron-style queue processing

### NEW edge functions allowed (§2.5)
1. `retention-weekly-report-generate` (cron Sundays 14:00 UTC)
2. `retention-dialogue-progress-eval` (POST from dialogue completion)
3. `retention-daily-cron` (cron 23:00 UTC = 02:00 Riyadh)
4. `retention-pre-class-deliver` (cron every 15min)
5. `retention-post-class-deliver` (cron every 15min)

**All NEW edge functions must:**
- Use `--no-verify-jwt` deploy flag (gateway handed off; auth verified in code)
- Wrap body parsing in try/catch
- Include `Access-Control-Allow-Methods: 'POST, OPTIONS'` in CORS
- Log to `system_errors` on failure
- Make **zero** runtime calls to `api.anthropic.com` (§2.3)
- Use the same env-var fallback pattern: `ANTHROPIC_API_KEY ?? CLAUDE_API_KEY` for any Claude calls (only allowed for evaluation reuse, not generation)
- Use Claude model id `claude-sonnet-4-6` if Claude is invoked (NOT the retired `claude-sonnet-4-20250514`)

---

## 6. Dropped / deprecated features — do NOT reintroduce

Per §7 of the prompt + observed `.deprecated.jsx` / `.legacy.jsx` files:

- Standalone "المحادثة" (StudentConversation) → Module 1 must live at `/student/retention/daily-partner`, NOT `/student/conversation`
- Standalone "جدولي" — gone
- `StudentChallenges`, `TrainerChallenges`, `AdminCreatorChallenge`, `StudentCreatorChallenge` — deprecated
- `DailyChallenge.deprecated.jsx` — old daily-challenge UI (don't restore; build new under `retention/`)
- `SmartNudgesWidget`, `ExercisesCTA`, `StudentWowMoments` (this last one exists but stay clear of overlap), `PersonalDictionaryWidget` on dashboard, "Smart Stats Row", English motivational footer

### Active but currently disabled (do NOT re-enable as a side effect)
- **Personalization** — `app_config.personalization_enabled = false`. `personalized_readings` + `user_interests` tables exist with 1,152 variants but UI is hidden. Retention layer reads canonical curriculum only.
- **Pronunciation** — `curriculum_pronunciation` exists with rows, but UI is shelved (commit `b2488a6` + 2026-05-19 entry). Module 5 prep/review briefs CAN reference pronunciation alerts on vocabulary words (those are still active inside the vocabulary card), but must NOT surface the standalone pronunciation tab/activity.

---

## 7. Recent fragile areas — extra caution

From CLAUDE.md change log (last 30 days):
- **Mock exam system** (2026-05-22 → 2026-05-23) — 9 active RPCs, ongoing incident response. Retention build must not touch any `mock_exam_*` table or RPC.
- **Audio drift gate** (2026-05-19) — `npm run predeploy:audio-drift` is wired. Any new audio we generate (Module 1 dialogues, Module 5 briefs) should write its source-text hash for future drift detection.
- **Listening corruption audit (Phase 5.6)** — committed in this session as `31cf77f`. The audio-fix scripts are still mid-investigation; don't mix with retention work.
- **Auth refresh storm** — fixed via `authRefresh.js`. All new code must use `getToken()` / `refreshOnce()` rather than raw `supabase.auth.getSession()` / `refreshSession()`.

---

## 8. Naming conventions (from SKILL.md + CLAUDE.md, observed)

- Tables: `snake_case`, retention-namespaced as `retention_*`
- Components: `PascalCase`
- Hooks: `useFoo`
- Edge functions: `kebab-case` (`retention-daily-cron`)
- Routes: `/student/retention/*`, `/admin/retention/*`
- Edge function deploy: `supabase functions deploy <name> --no-verify-jwt --project-ref nmjexpuycmqcxuxljier`
- Migrations: `YYYYMMDDHHmmss_<description>.sql`, idempotent where possible (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION, `IF NOT EXISTS` on indexes)

---

## 9. Schema appendix

Live introspection complete. See [`schema-appendix.md`](./schema-appendix.md).

Highlights:
- 236 tables in `public` schema, 0 `retention_*` collisions
- 22 active students (CLAUDE.md said 14 — confirmed stale)
- `cron-streak-check` exists but has NO pg_cron schedule (Module 4 root cause confirmed)
- `classes` is the actual table (not `class_schedule` as prompt assumed) — Module 5 plan updated
- `xp_reason` is a strict enum; `'challenge'` + `'daily_challenge'` are the right values for retention XP
- All proposed `retention_*` table/function names are collision-free
