# Retention Dashboard Mount — Diagnosis + Fix Report

**Date:** 2026-05-25
**Branch:** `retention-dashboard-mount` → merged to `main` (`90c4ee9`)

## What was broken
Retention was activated in prod earlier today (100 `retention_modules` rows enabled, all 4 crons on), but students impersonated from المجموعة 2 / المجموعة 4 saw the **pre-retention dashboard** — no streak calendar, no challenge card, no homework/brief cards. The data and gating were correct; the UI simply wasn't on screen.

## Root cause
**Confirmed the working hypothesis exactly.** The retention UI components all exist (`src/components/retention/RetentionDashboardSection.jsx` + its 4 sub-widgets), but `<RetentionDashboardSection />` was **never imported or rendered** in `src/pages/student/StudentDashboard.jsx`. In its place was a comment block (lines 37–40) explaining it had been intentionally left unmounted per Ali's 2026-05-24 revert (commit `ee2cc82` — "honor user's main-branch revert — no dashboard auto-mount"). That revert predates activation; once modules went live the mount needed to be restored. No other cause — the gating hook, module keys, and per-student flags are all correct.

Diagnostic evidence:
- `grep -i retention src/pages/student/StudentDashboard.jsx` → only the explanatory comment, zero imports/mounts.
- `git log` → commit `ee2cc82` is the deliberate un-mount.
- `RETENTION_MODULES` constants match the DB `module_key` values exactly (`streak_activation`, `smart_homework`, `lesson_briefs`, `daily_partner`, `weekly_reports`).
- `useRetentionModuleEnabled` is impersonation-aware — it reads `useAuthUserId()` (the impersonated student's id during impersonation) and queries `retention_modules` by that id; non-students get `enabled:true` for preview. So once mounted, an impersonated student in these groups (all flags `true`) sees the widgets.

## What I changed
- **Files modified:** `src/pages/student/StudentDashboard.jsx` (+1 import, +1 JSX mount, comment updated), `public/version.json` (PWA version bump to force clients to refresh and pick up the new dashboard).
- **Component mounted:** `<RetentionDashboardSection />` — placed at position 1.5, directly below the Hero block. It internally renders, with per-module self-gating: `StreakAtRiskBanner`, `RetentionStreakCalendar`, `WeeklyChallengeCard`, `PendingBriefsCard`, plus Smart-Homework and Daily-Partner CTA cards.
- **Lines added:** ~7 net.
- **Verification:** `vite build` exit 0 (18.6s, no errors); prod site returns HTTP 200.

The wrapper already handles empty states and gating, so no widget-level changes were needed — each card respects `useRetentionModuleEnabled()` and the section returns `null` when all modules are off (safe for the other ~5 students not in these groups).

## What Ali should see now
After Vercel finishes deploying `90c4ee9` (~2–3 min from push; auto-deploys from `main`), impersonate any student in المجموعة 2 or المجموعة 4 and, on the dashboard directly below the hero:
1. **Streak calendar** (30-day grid — mostly empty initially since streaks are at 0)
2. **Weekly challenge card** (shows the "coming Sunday" state — today is Monday, challenges assign on the Sunday cron)
3. **Daily Partner CTA** → `/student/retention/daily-partner`
4. **Smart Homework CTA** → `/student/retention/homework`
5. **Streak-at-risk banner** appears only after ~6 PM with no activity that day.

As students build activity (streaks > 0, completed dialogues/homework), the widgets populate with real data.

## What Ali should NOT see
- Admin impersonating a non-student account → no retention UI (hook returns preview-true only for the impersonation path; for true non-students it's a non-issue).
- Students NOT in المجموعة 2 / المجموعة 4 → section renders `null` (their modules are off). ✓
- Any errors / broken layout — build is clean, section is additive only.

## Verification steps Ali can do (optional)
1. Hard-refresh the LMS (the version bump should auto-prompt a PWA update).
2. Impersonate a student in المجموعة 2 or المجموعة 4.
3. Dashboard → retention widgets appear below the hero.
4. `/student/retention/daily-partner` → today's dialogue scenario.
5. `/student/retention/homework` → homework set (may be empty until the mistake-tagger runs for that student after their next class).

## Notes
- Activation safety monitor from the prior step is still running clean (cycles 1–3, zero errors / cron failures).
- Kill switch unchanged and available: `docs/retention/CONTROL-PANEL.md`.
- If the Vercel build had failed I'd have written `DEPLOY-FAILED.md` instead — it didn't; local build (same `vite build` Vercel runs) passed and the site is 200.
