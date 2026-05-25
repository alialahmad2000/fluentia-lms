# Dashboard 100× — Phase A

Date: 2026-05-25 · Branch: `dashboard-100x-variants` (off main, after auto-recovery merge)

## Current dashboard
- File: **`src/pages/student/StudentDashboard.jsx`** (229 lines), route **`/student`** (`App.jsx:33,663`).
- It's a **composition of ~20 self-fetching widget components** (HeroBlock, WeeklyTasksWidget, NextClassWidget, StreakWidget, TeamCard, DailyProgressWidget, WeeklyProgressWidget, LiveLevelActivityFeed, SrsReviewCard, RetentionDashboardSection, …) + a few inline queries (weekly_task_sets, weekly_tasks, assignments, payments). **Data is decentralized** — there was **no `useStudentDashboard` hook** (built in this pass).

## Data sources confirmed (for the unified hook)
- `students`: `xp_total, current_streak, longest_streak, streak_freeze_available, academic_level, group_id, team_id` → streak + total XP + level come straight from here (`student_streaks` table is empty).
- `xp_transactions`: `amount, created_at` → today/week sums + 7-day series.
- `activity_feed`: `type, title, event_text_ar, xp_amount, created_at` → peer activity.
- `curriculum_vocabulary_srs`: `due` → Anki-due count.
- `speaking_recordings`: `audio_url, audio_duration_seconds, trainer_feedback` → voice highlight.
- `student_achievements` ⋈ `achievements` (`name_ar, icon`) → recent achievement.
- `curriculum_levels` (`name_ar, cefr, color`) keyed on `level_number` → level label.
- `groups` (`google_meet_link, schedule, trainer_id`) → next-class meta.
- **`daily_challenges` is empty** → `daily_challenge: null` (variant empty states handle it).
- `teams` queried best-effort for team name/color.

## Routing approach
`StudentDashboard.jsx` → renamed to `StudentDashboardOriginal.jsx` (untouched), and a new thin `StudentDashboard.jsx` switch reads `useSearchParams().get('design')`:
- `v1` → Editorial · `v2` → Cinematic · `v3` → Atelier-Minimal · default/invalid → OriginalDashboard.
- Production students (no `?design`) see **zero change**.

## Build (Phase B)
- `src/hooks/useStudentDashboard.js` — one resilient hook (Promise.allSettled per domain; failures → safe defaults).
- `src/pages/student/dashboards/{Editorial,Cinematic,AtelierMinimal}Dashboard.jsx` — 3 pure view variants (built to the detailed specs; consume the hook's typed shape).
