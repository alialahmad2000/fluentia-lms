-- Per-student gate for the personal Speaking Track hub («مسار التحدث»).
-- Off by default => nobody affected. Turn on for a student given a bespoke, data-driven
-- speaking program built from their own graded speaking_recordings.
alter table public.students
  add column if not exists uses_speaking_track boolean not null default false;

comment on column public.students.uses_speaking_track is
  'Per-student gate for the personal Speaking Track hub (مسار التحدث). Off by default; on for students given a bespoke speaking program built from their own recordings.';
