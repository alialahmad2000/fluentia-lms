-- «ملخّص الحصص» — per-STUDENT recap of a live 1:1 class.
-- One row per class, split into sections; each section teaches one point and then
-- tests it. Applied to production 2026-07-28.
--
-- NOTE: deliberately NOT named class_summaries — that table already exists and is
-- the trainer's GROUP-level debrief (attendance, notes, AI summary), unrelated to
-- this student-facing surface.

alter table students add column if not exists uses_class_notes boolean not null default false;

create table if not exists class_recaps (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  class_no int not null,
  class_date date,
  title text not null,
  subtitle text,
  content jsonb not null default '{}'::jsonb,   -- { sections: [{ key, title_ar, learn, questions }] }
  created_at timestamptz not null default now(),
  unique (student_id, class_no)
);
create index if not exists class_recaps_student_idx on class_recaps(student_id, class_no);

create table if not exists class_recap_progress (
  student_id uuid not null references profiles(id) on delete cascade,
  recap_id uuid not null references class_recaps(id) on delete cascade,
  section_key text not null,
  score numeric,
  correct_count int,
  total_count int,
  answers jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, recap_id, section_key)
);

alter table class_recaps enable row level security;
alter table class_recap_progress enable row level security;

drop policy if exists cr_select_own on class_recaps;
create policy cr_select_own on class_recaps for select to authenticated
  using (student_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

drop policy if exists crp_select_own on class_recap_progress;
create policy crp_select_own on class_recap_progress for select to authenticated
  using (student_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

-- Practice score here is low-stakes self-study (unlike phrase-bank mastery), so the
-- student writes her own row directly; WITH CHECK pins it to her own id either way.
drop policy if exists crp_write_own on class_recap_progress;
create policy crp_write_own on class_recap_progress for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists crp_update_own on class_recap_progress;
create policy crp_update_own on class_recap_progress for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
