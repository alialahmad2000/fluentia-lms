# Module 5 — Pre-Launch Checklist

## Sacred constraints honored
- [x] `curriculum_units`/`curriculum_vocabulary`/`curriculum_grammar` — read-only.
- [x] `classes`/`attendance` — read-only (delivery RPC joins them to find upcoming/recent classes).
- [x] `notifications` schema unchanged (only inserts).

## RPC SECURITY DEFINER
- `retention_deliver_briefs(text)` — `prosecdef=true` ✓
- Reads `retention_is_module_enabled(student_id, 'lesson_briefs')` so disabled students don't get deliveries (defense in depth above the dashboard gate).

## Tables
- `retention_lesson_briefs` — 48 rows seeded (24 L1 + 24 L3 = 12 units/level × 2 brief types)
- `retention_lesson_brief_deliveries` — expanded from Block 2 stub with brief_id, class_id, scheduled_for, delivered_at, self_check_*

## Cron schedules
- `retention-deliver-pre-class` `*/15 * * * *` → `SELECT retention_deliver_briefs('pre')` — **DISABLED**
- `retention-deliver-post-class` `*/15 * * * *` → `SELECT retention_deliver_briefs('post')` — **DISABLED**

## Frontend
- Hooks: `usePendingBriefs`, `useBriefDelivery`, `useMarkBriefOpened`, `useSubmitBriefSelfCheck`
- Page: `BriefView.jsx` at `/student/retention/brief/:deliveryId` — text body + vocab chips + optional audio player + self-check question (review only) + mini-task
- Dashboard card: `PendingBriefsCard.jsx` — renders the latest unopened brief; null when none
- Route added in `App.jsx`

## Audio
- Deferred — no ElevenLabs generations in this build (per shared 80% cap with Module 1; Block 5 prioritises dialogue audio first). Briefs gracefully render text-only when `audio_path` is null. `RetentionAudioPlayer` is wired and ready; future audio gen just populates `audio_path`.

## Feature OFF by default
- Cron schedules DISABLED
- Per-student `retention_modules.lesson_briefs` default false
- Both layers: RPC checks the module flag per student before inserting a delivery; route also guards via `RetentionDisabledState`

## Deferred work (logged in blockers.md)
- L0/L2/L4/L5 briefs (other 48 units) — generator already supports them, just change the level filter in `seed-lesson-briefs.cjs`
- ElevenLabs audio generation for all 144 briefs (L1+L3 first per cap policy)
- Admin `/admin/retention/briefs` editor — deferred to Block 7 or future
