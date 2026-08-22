-- ═══════════════════════════════════════════════════════════════════════════
-- Reading «session» experience — OPT-IN, per reading, fully reversible.
--
-- The owner wants to judge the rebuilt reading flow inside a real student
-- account (ملاك, unit 1) rather than in a prototype file — but explicitly asked
-- that the old state stay in the database so it can be restored if the old
-- one turns out to be better.
--
-- So this migration does TWO things and destroys nothing:
--
--   1. reading_experience_backup — a jsonb snapshot of the reading row, its
--      comprehension questions, and every student progress row attached to it,
--      taken BEFORE anything is switched. Restoring is a single UPDATE.
--
--   2. curriculum_readings.experience_version — 'classic' (today's flow) for
--      every one of the 260 readings, flipped to 'session' for exactly ONE.
--      The frontend renders the new flow only for 'session', so every other
--      reading and every other student is byte-identical to today.
--
-- REVERT (instant, no deploy):
--   update curriculum_readings set experience_version = 'classic'
--   where id = 'f634ec95-45d1-44ed-b5df-74eabc721e54';
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.reading_experience_backup (
  id            uuid primary key default gen_random_uuid(),
  reading_id    uuid not null,
  reason        text not null,
  reading_row   jsonb not null,
  questions     jsonb not null,
  progress_rows jsonb not null,
  taken_at      timestamptz not null default now()
);

alter table public.reading_experience_backup enable row level security;

drop policy if exists reb_staff_read on public.reading_experience_backup;
create policy reb_staff_read on public.reading_experience_backup
  for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role in ('admin','trainer')));

drop policy if exists reb_service_all on public.reading_experience_backup;
create policy reb_service_all on public.reading_experience_backup
  for all to service_role using (true) with check (true);

-- The snapshot. Idempotent on (reading_id, reason) so re-running cannot
-- overwrite a good backup with a post-change one.
insert into public.reading_experience_backup (reading_id, reason, reading_row, questions, progress_rows)
select r.id,
       'before_session_experience_2026-08-22',
       to_jsonb(r),
       coalesce((select jsonb_agg(to_jsonb(q)) from public.curriculum_comprehension_questions q
                 where q.reading_id = r.id), '[]'::jsonb),
       coalesce((select jsonb_agg(to_jsonb(sp)) from public.student_curriculum_progress sp
                 where sp.reading_id = r.id), '[]'::jsonb)
from public.curriculum_readings r
where r.id = 'f634ec95-45d1-44ed-b5df-74eabc721e54'
  and not exists (select 1 from public.reading_experience_backup b
                  where b.reading_id = r.id
                    and b.reason = 'before_session_experience_2026-08-22');

alter table public.curriculum_readings
  add column if not exists experience_version text not null default 'classic';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'curriculum_readings_experience_version_chk') then
    alter table public.curriculum_readings
      add constraint curriculum_readings_experience_version_chk
      check (experience_version in ('classic','session'));
  end if;
end $$;

update public.curriculum_readings
   set experience_version = 'session'
 where id = 'f634ec95-45d1-44ed-b5df-74eabc721e54';
