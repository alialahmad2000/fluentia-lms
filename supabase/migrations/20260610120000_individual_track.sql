-- INDIVIDUAL (1-on-1) COURSE STUDENTS + PROFESSION-TAILORED TRACKS — additive only
--
-- Why: group-class students get the standard platform. Individual-course students get a
-- profession-tailored experience (pilot: Marketing Manager) — a different home, a
-- specialization "track" of scenario-based modules (brief → vocab → phrases → AI voice
-- roleplay → writing), and no group-dependent surfaces. Nothing here touches group students:
-- study_mode defaults to 'group' and every existing query keeps working unchanged.
--
-- Tables: specializations (persona registry) → specialization_modules (content)
--         → specialization_module_progress (per-student state, soft-delete only).
-- Also: speaking_conversations gains module_id (nullable) and unit_id becomes nullable so
-- the existing AI-conversation engine can run a module roleplay (curriculum path untouched —
-- it always passes unit_id).

-- ── Persona registry ────────────────────────────────────────────────────────
create table if not exists public.specializations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,            -- e.g. 'marketing_manager'
  title_ar      text not null,                   -- e.g. 'إدارة التسويق'
  title_en      text not null,                   -- e.g. 'Marketing Manager'
  tagline_ar    text,                            -- short positioning line on the student home
  icon          text,                            -- lucide icon name for pickers
  accent_color  text,                            -- per-persona accent (hex) for the exec skin
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ── Modules (the track content) ─────────────────────────────────────────────
create table if not exists public.specialization_modules (
  id                 uuid primary key default gen_random_uuid(),
  specialization_id  uuid not null references public.specializations(id) on delete cascade,
  module_number      int  not null,
  title_ar           text not null,
  title_en           text not null,
  scenario_ar        text,                       -- the mission brief (Arabic)
  scenario_en        text,                       -- the mission brief (English)
  objectives         jsonb not null default '[]'::jsonb,  -- [{ar,en}]
  vocabulary         jsonb not null default '[]'::jsonb,  -- [{term,pos,ar,def_en,example,example_ar}]
  phrases            jsonb not null default '[]'::jsonb,  -- [{en,ar,context_ar}]
  roleplay           jsonb not null default '{}'::jsonb,  -- {title_en,ai_role,student_role,setting_ar,prompt_en,prompt_ar,useful_phrases[]}
  writing_task       jsonb not null default '{}'::jsonb,  -- {title_ar,prompt_en,prompt_ar,min_words,max_words,hints[]}
  estimated_minutes  int not null default 25,
  is_published       boolean not null default true,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (specialization_id, module_number)
);

create index if not exists idx_spec_modules_spec
  on public.specialization_modules (specialization_id, sort_order);

-- ── Per-student module progress (soft delete only) ──────────────────────────
create table if not exists public.specialization_module_progress (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null,                    -- = profiles.id = students.id (RLS auth.uid())
  module_id    uuid not null references public.specialization_modules(id) on delete cascade,
  status       text not null default 'in_progress'
                 check (status in ('in_progress','completed')),
  stage_state  jsonb not null default '{}'::jsonb,  -- {brief:{done},vocab:{done},phrases:{done},roleplay:{done,score},writing:{done,text}}
  score        numeric,                          -- roleplay overall (0-10), written by the grade edge fn
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (student_id, module_id)
);

create index if not exists idx_smp_student
  on public.specialization_module_progress (student_id);

-- ── Students: account type + specialization ─────────────────────────────────
alter table public.students
  add column if not exists study_mode text not null default 'group'
    check (study_mode in ('group','individual'));
alter table public.students
  add column if not exists specialization_id uuid references public.specializations(id);

-- ── Speaking conversations: allow module roleplays ──────────────────────────
-- Curriculum conversations always pass unit_id (unchanged). Module roleplays pass
-- module_id with unit_id NULL.
alter table public.speaking_conversations
  alter column unit_id drop not null;
alter table public.speaking_conversations
  add column if not exists module_id uuid references public.specialization_modules(id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.specializations              enable row level security;
alter table public.specialization_modules      enable row level security;
alter table public.specialization_module_progress enable row level security;

-- specializations: any signed-in user can read active personas; admin manages; service all
drop policy if exists spec_read       on public.specializations;
drop policy if exists spec_admin_all  on public.specializations;
drop policy if exists spec_service    on public.specializations;
create policy spec_read on public.specializations
  for select to authenticated using (is_active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy spec_admin_all on public.specializations
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy spec_service on public.specializations
  for all using (auth.role() = 'service_role');

-- modules: published readable by signed-in users; admin all; service all
drop policy if exists smod_read       on public.specialization_modules;
drop policy if exists smod_admin_all  on public.specialization_modules;
drop policy if exists smod_service    on public.specialization_modules;
create policy smod_read on public.specialization_modules
  for select to authenticated using (is_published = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy smod_admin_all on public.specialization_modules
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy smod_service on public.specialization_modules
  for all using (auth.role() = 'service_role');

-- progress: student owns rows (select/insert/update own — no delete, soft-delete via update);
-- admin all; service all. (Impersonation swaps the real session, so auth.uid() = the student.)
drop policy if exists smp_student_select on public.specialization_module_progress;
drop policy if exists smp_student_insert on public.specialization_module_progress;
drop policy if exists smp_student_update on public.specialization_module_progress;
drop policy if exists smp_admin_all      on public.specialization_module_progress;
drop policy if exists smp_service        on public.specialization_module_progress;
create policy smp_student_select on public.specialization_module_progress
  for select using (student_id = auth.uid());
create policy smp_student_insert on public.specialization_module_progress
  for insert with check (student_id = auth.uid());
create policy smp_student_update on public.specialization_module_progress
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy smp_admin_all on public.specialization_module_progress
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy smp_service on public.specialization_module_progress
  for all using (auth.role() = 'service_role');
