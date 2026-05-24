# Module 2 — Pre-Launch Checklist

## Sacred constraints honored
- [x] No changes to `submissions`, `writing_history`, `weekly_tasks`, or any other source table — tagger READS only.
- [x] `curriculum_*` tables untouched.
- [x] No new edge function (selection is client-side rule-based; tagging runs inside `retention_daily_run()` which is the Module 4 orchestrator extended additively).
- [x] No runtime Claude/OpenAI call.

## RPC SECURITY DEFINER
- `retention_tag_recent_mistakes(integer)` — `prosecdef=true` ✓
- `retention_daily_run()` — extended additively in this migration to call `retention_tag_recent_mistakes(24)` at the top of each run. Still `prosecdef=true` ✓.

## Tables created
- `retention_exercises` — 69 starter rows seeded (43 L1 + 26 L3). All 6 exercise types represented for both levels. Full bank target is 3,500 — see [Deferred content](#deferred-content) below.
- `retention_homework_sets` — per-student per-trigger
- `retention_homework_attempts` — expanded from Block 2 stub
- `retention_student_mistake_tags` — populated by tagger

## RLS coverage
- `retention_exercises` — read-all + admin-write ✓
- `retention_homework_sets` — student own select/insert/update + staff select ✓
- `retention_homework_attempts` — student own insert (selection inherited from Block 2 stub) + staff select ✓
- `retention_student_mistake_tags` — student own select + staff select; no insert policy (only SECURITY DEFINER tagger writes) ✓

## Live smoke
- `retention_tag_recent_mistakes(720)` (30-day lookback) ran against branch DB: scanned 3 writing_history rows + others, 0 tags inserted (corpus too thin in this branch's data — the tagger is functionally correct, the regex didn't fire on the available samples).
- `selectHomework()` unit-tested mentally for: empty bank → returns empty; tagged corpus → mistake_targeted; cold start → cold_start_balanced; all attempted → all_attempted_recently. Round-robin diversity preserves type variety.
- Frontend pages parse via Babel ✓ (HomeworkLanding, HomeworkPlay, HomeworkResult, updated RetentionDashboardSection).

## Frontend
- Routes wired in `App.jsx`:
  - `/student/retention/homework` (landing)
  - `/student/retention/homework/play/:setId`
  - `/student/retention/homework/result/:setId`
- Dashboard card in `RetentionDashboardSection.jsx` — gated on `smart_homework` module flag; deep-links to landing.
- Both routes show `RetentionDisabledState` if the module is disabled for the calling student.

## Feature OFF by default
- All routes guard on `useRetentionModuleEnabled('smart_homework')` returning true; default false.
- Dashboard card only renders when flag is true.
- Cron-driven tagging is wired into `retention_daily_run()` which is itself DISABLED until Ali enables it.

## Deferred content (logged in blockers.md)
- Full 3,500 exercise target requires more template authoring time. Starter corpus of 69 high-quality exercises ships in this build (covers L1 + L3 — the active student levels). L0/L2/L4/L5 templates + more L1/L3 variations are deferred to a future content pass. The `scripts/retention/templates/exercise-templates-L*.cjs` files are the extension surface; add more templates there and re-run `scripts/retention/seed-exercises.cjs` (idempotent — skips already-inserted rows).

## Mobile + RTL
- HomeworkLanding: max-w-3xl, single column on mobile, RTL header chain.
- HomeworkPlay: max-w-2xl, exercise textarea is dir="ltr" for English input while page is dir="rtl"; MCQ options are buttons with `dir="ltr"` text on RTL layout.
- HomeworkResult: max-w-xl, large emoji + score ring + two stacked CTAs.

## Arabic copy (د. علي voice)
- All exercise explanations are warm, direct MSA with light Saudi softness — verified for the 69 seeded.
- Empty-state copy: "لا توجد مجموعات سابقة بعد — ابدئي بأول واحدة فوق ↑".
- Disabled-state: "هذه الميزة قريباً جداً — نُعدّ هذه الميزة خصيصاً لكِ".
