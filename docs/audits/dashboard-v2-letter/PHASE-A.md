# Dashboard V2 Trainer Letter — Phase A Discovery (2026-05-26)

## Premise correction
The prompt says it "SUPERSEDES 07-DASHBOARD-V2-TRAINER-LETTER.md" and "applies surgical changes."
**But 07 v1 was never built in this repo.** Confirmed absent:
- `supabase/functions/generate-daily-letters/` — does not exist
- `TrainerLetterDashboard` / `DailyLetter*` components — do not exist
- `daily_letters` / `daily_letters_runs` tables — not referenced anywhere
- no prior 07 prompt archived in `prompts/agents/`

So this is a **net-new build**, and the prompt's data-assembly layer (the `StudentDay`
interface population: streak, level, xp_today/week, next_class, daily_challenge, anki_due,
team rank/size, assignments, last_achievement, peer_activity) is specified only as
"rest same as original 07" — that base spec is NOT present in this document.

## A.1 — Gender field
NONE on students or profiles. Must add (`students.gender text CHECK male|female DEFAULT female`).

## A.2 — Trainer assignment
No `students.assigned_trainer_id` and no `student_trainer_assignments` linking table.
Trainers link only indirectly: `students.group_id → groups.trainer_id` (also classes/private_sessions).
Per prompt: add explicit nullable `students.assigned_trainer_id → profiles(id)`, leave NULL,
fall back to "د. محمد".

## A.3 — The 2 male students (FOUND)
- علي سعيد القحطاني — id `1148c3bd-efe2-425e-a420-3421e831e830` — L1 — gender currently absent → backfill 'male'
- عبدالرحمن الشمري — id `730b4e93-548d-4823-b693-b5387bbebcd1` — L1 — gender currently absent → backfill 'male'

## A.4 — Trainer roster
- د. محمد شربط — `e8e64b7c-66df-43a7-83f7-9b96b660dcdd` (trainer) ← the "د. محمد" fallback signature
- رشيد عثمان — `561d26e7-...` (trainer)
- مدرب تجريبي — `c21d8204-...` (trainer, test)
- د. علي الأحمد — `e5528ced-...` (admin/founder)

## A.5 — V2 dashboard surface
`?design=v2` exists: StudentDashboard.jsx is a thin switch — production (no ?design) sees the
original dashboard; `?design=v1|v2|v3` mounts premium variants for evaluation. The letter would
mount on the v2 variant. (The v2 variant component itself needs to be located/confirmed before wiring.)

## Schema migrations needed (Phase B.0 / B.1)
1. `students.gender` (idempotent ADD COLUMN, default female)
2. `students.assigned_trainer_id` (idempotent ADD COLUMN, nullable → profiles)
3. backfill the 2 male students to gender='male'
4. `daily_letters` + `daily_letters_runs` tables (net-new)

## Cost / prod-impact flags
- The edge function calls Claude Haiku per student; a daily pg_cron (02:00 UTC) makes it recurring spend.
- Letters display only on the non-default `?design=v2` route, so zero student-facing impact until Ali opts in.
- Recommend the cron ship DISABLED (Ali enables), matching the retention-cron pattern he's comfortable with.

## Open decision (blocks Phase B edge function)
The full per-student data assembly (`assembleStudentDay`) is the heart of the edge function and is
NOT specified in this prompt (deferred to the missing "original 07"). Two paths:
(a) reverse-engineer all ~12 data points from the live LMS schema (sizeable, each query must be correct
    or a student sees wrong facts in their letter), or
(b) build to the original-07 spec if Ali still has that prompt.
