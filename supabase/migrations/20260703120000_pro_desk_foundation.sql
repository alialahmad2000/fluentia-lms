-- Pro Desk — Stage 0 foundation (the reimagined professional-English surface for
-- individual/1-on-1 learners, e.g. Sara). Gate is a NEW, explicit per-student flag
-- that defaults FALSE, so shipping any Desk code affects ZERO existing students
-- (سلطان included). Orthogonal to students.uses_custom_curriculum and study_mode —
-- deliberately not reusing either, because the two real 1-on-1 students do not share
-- a single flag (Sara = uses_custom_curriculum; the individual demo = study_mode).
--
-- Applied to prod via the Management API on 2026-07-03.

alter table public.students
  add column if not exists uses_pro_desk boolean not null default false;

comment on column public.students.uses_pro_desk is
  'Pro Desk experience gate — the reimagined professional-English surface (/desk/*). '
  'Defaults false so nobody sees it until explicitly enabled. '
  'Orthogonal to uses_custom_curriculum and study_mode.';
