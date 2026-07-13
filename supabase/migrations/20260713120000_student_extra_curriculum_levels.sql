-- Per-student explicit allowlist of ADDITIONAL curriculum levels (by level_number)
-- a student may access ALONGSIDE their own academic_level — without changing their
-- level, hiding, or touching their progress. Empty by default => zero change for everyone.
--
-- Distinct from students.can_access_lower_levels (a staff-preview flag that opens ALL
-- lower levels): this is a PRECISE per-student set. Example: a B1 student
-- (academic_level = 3) granted revisit access to A2 => extra_curriculum_levels = '{2}'.
--
-- Level-access is enforced entirely in the frontend navigation guards
-- (_useCurriculumData.js + CurriculumBrowser.jsx). There is no RLS/level gate to change:
-- any authenticated student can already read any unit and write their own progress, so
-- this column only widens which levels the curriculum UI surfaces to the student.

alter table public.students
  add column if not exists extra_curriculum_levels integer[] not null default '{}'::integer[];

comment on column public.students.extra_curriculum_levels is
  'Extra curriculum level_numbers this student may access in addition to academic_level (revisit / strengthen). Empty = default. Never changes academic_level or progress. Surgical alternative to can_access_lower_levels.';
